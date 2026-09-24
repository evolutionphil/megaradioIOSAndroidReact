#!/usr/bin/env python3
"""Resume-safe, app-scoped ASO delivery. Never prints authentication/upload URLs."""
import argparse, hashlib, importlib.util, json, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse
import requests

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('asc_client', ROOT / 'asc-client.py')
client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client)
COPY = json.loads((ROOT / 'copy.json').read_text())
LOCALES = {'bn':'bn-BD','gu':'gu-IN','kn':'kn-IN','ml':'ml-IN','mr':'mr-IN','or':'or-IN',
           'pa':'pa-IN','sl':'sl-SI','ta':'ta-IN','te':'te-IN','ur':'ur-PK'}
VERSIONS = {'IOS':'1.0.70','MAC_OS':'1.0.3','TV_OS':'1.0.0'}
PLATFORMS = {'IOS':'IOS','MAC_OS':'MACOS','TV_OS':'TVOS'}
SIZES = {'IOS':{'iphone6.5':'APP_IPHONE_65','iphone6.9':'APP_IPHONE_67',
                'iphone5.5':'APP_IPHONE_55','ipad13':'APP_IPAD_PRO_3GEN_129','watch':'APP_WATCH_ULTRA'},
         'MAC_OS':{'mac':'APP_DESKTOP'},'TV_OS':{'appletv':'APP_APPLE_TV'}}
ASSETS = Path('/Users/mumiix/Downloads/MegaRadio-ASO-2026-09-24')
PRIVACY = 'https://themegaradio.com/en/pages/privacy-policy'
PRIVACY_TEXT = (ROOT/'published-privacy-policy.txt').read_text()
TERMS = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
BACKUPS = ROOT / 'remote-backups'
BACKUPS.mkdir(exist_ok=True)

def record(name, data):
    (ROOT/'validation'/name).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')

def backup(name, data):
    p = BACKUPS/name
    if not p.exists(): p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')

def screenshot_sets(api, loc_id):
    # Apple's documented include avoids one separate read for every display set.
    path=f'/v1/appStoreVersionLocalizations/{loc_id}/appScreenshotSets'
    params={'limit':200,'include':'appScreenshots','limit[appScreenshots]':50}
    sets=[]
    while path:
        response=api.request('GET',path,params=params)
        included={x['id']:x for x in response.get('included',[]) if x['type']=='appScreenshots'}
        for item in response['data']:
            relation=item.get('relationships',{}).get('appScreenshots',{})
            links=relation.get('data')
            if links is not None and not relation.get('links',{}).get('next') and all(x['id'] in included for x in links):
                item['_existingScreenshots']=[included[x['id']] for x in links]
            sets.append(item)
        path=response.get('links',{}).get('next');params={}
    return sets

def targets(api):
    app = api.request('GET',f'/v1/apps/{client.APP}')['data']
    assert app['attributes']['bundleId']=='com.visiongo.megaradio'
    versions = api.all(f'/v1/apps/{client.APP}/appStoreVersions',params={'limit':200})
    out = [v for v in versions if VERSIONS.get(v['attributes']['platform'])==v['attributes']['versionString']
           and v['attributes']['appStoreState']=='PREPARE_FOR_SUBMISSION']
    assert len(out)==3, 'Expected exactly the three editable release versions'
    return out

def create(api, kind, attrs, relation, parent_type, parent_id):
    return api.request('POST',f'/v1/{kind}',json={'data':{'type':kind,'attributes':attrs,
        'relationships':{relation:{'data':{'type':parent_type,'id':parent_id}}}}})['data']

def expected(locale, platform):
    c=COPY[locale]
    attrs={'description':c['description']+'\n\n'+c['platform'][PLATFORMS[platform]]+'\n\n'+TERMS+'\n'+PRIVACY,
           'keywords':c['keywords'],'promotionalText':c['promotionalText'],
           'supportUrl':'https://themegaradio.com/en/contact','marketingUrl':'https://themegaradio.com'}
    if platform=='IOS': attrs['whatsNew']=c['whatsNew']
    return attrs

def metadata(api, mutate):
    versions=targets(api); results=[]
    infos=api.all(f'/v1/apps/{client.APP}/appInfos',params={'limit':200})
    for info in infos:
        if info['attributes']['appStoreState']!='PREPARE_FOR_SUBMISSION': continue
        locs=api.all(f'/v1/appInfos/{info["id"]}/appInfoLocalizations',params={'limit':200})
        backup('info-'+info['id']+'.json',locs)
        by_locale={x['attributes']['locale']:x for x in locs}
        for locale,c in COPY.items():
            remote_locale=LOCALES.get(locale,locale)
            attrs={k:c[k] for k in ['name','subtitle']}
            attrs['privacyPolicyUrl']=PRIVACY
            attrs['privacyPolicyText']=PRIVACY_TEXT
            loc=by_locale.get(remote_locale)
            changed=not loc or any(loc['attributes'].get(k)!=v for k,v in attrs.items())
            if mutate and changed:
                if loc: api.patch('appInfoLocalizations',loc['id'],attrs)
                else: loc=create(api,'appInfoLocalizations',dict(locale=remote_locale,**attrs),'appInfo','appInfos',info['id'])
            if loc:
                actual=api.request('GET',f'/v1/appInfoLocalizations/{loc["id"]}')['data']['attributes'] if mutate and changed else loc['attributes']
                mismatches=[k for k,v in attrs.items() if actual.get(k)!=v]
            else: mismatches=['missing']
            results.append({'kind':'appInfo','id':info['id'],'locale':locale,'mismatches':mismatches})
        print(json.dumps({'appInfo':info['id'],'checked':50}),flush=True)
    for version in versions:
        platform=version['attributes']['platform']
        locs=api.all(f'/v1/appStoreVersions/{version["id"]}/appStoreVersionLocalizations',params={'limit':200})
        backup('version-'+version['id']+'.json',locs)
        by_locale={x['attributes']['locale']:x for x in locs}
        for locale in COPY:
            attrs=expected(locale,platform); loc=by_locale.get(LOCALES.get(locale,locale))
            changed=not loc or any(loc['attributes'].get(k)!=v for k,v in attrs.items())
            if mutate and changed:
                if loc: api.patch('appStoreVersionLocalizations',loc['id'],attrs)
                else: loc=create(api,'appStoreVersionLocalizations',dict(locale=LOCALES.get(locale,locale),**attrs),
                                 'appStoreVersion','appStoreVersions',version['id'])
            if loc:
                actual=api.request('GET',f'/v1/appStoreVersionLocalizations/{loc["id"]}')['data']['attributes'] if mutate and changed else loc['attributes']
                mismatches=[k for k,v in attrs.items() if actual.get(k)!=v]
            else: mismatches=['missing']
            results.append({'kind':'version','platform':platform,'locale':locale,'mismatches':mismatches})
        print(json.dumps({'platform':platform,'checked':50}),flush=True)
    report={'observedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
            'copyFingerprint':hashlib.sha256(json.dumps(COPY,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),'records':results,
            'privacyPolicyFingerprint':hashlib.sha256(PRIVACY_TEXT.encode()).hexdigest(),
            'mismatches':[x for x in results if x['mismatches']]}
    record('aso-api-text-verification.json',report)
    print(json.dumps({'records':len(results),'mismatches':report['mismatches']}),flush=True)

def deliver_set(job, mutate, refresh_stalled=False):
    platform,locale,loc_id,device,display,sets=job
    api=client.ASC()
    matched=[s for s in sets if s['attributes']['screenshotDisplayType']==display]
    assert len(matched)<=1
    if not matched:
        if not mutate:return {'platform':platform,'locale':locale,'device':device,'error':'missing set'}
        shot_set=create(api,'appScreenshotSets',{'screenshotDisplayType':display},'appStoreVersionLocalization','appStoreVersionLocalizations',loc_id)
    else: shot_set=matched[0]
    set_id=shot_set['id']
    existing=shot_set.get('_existingScreenshots')
    if existing is None:existing=api.all(f'/v1/appScreenshotSets/{set_id}/appScreenshots',params={'limit':200})
    # Store originals before replacement. Local original images are also retained.
    backup('screens-'+set_id+'.json',existing)
    wanted=[]; expected_checksums={}
    for file in sorted((ASSETS/locale/device).glob('*.png')):
        data=file.read_bytes();checksum=hashlib.md5(data).hexdigest()
        filename=f'MegaRadio-{locale}-{device}-{checksum[:10]}-{file.name}'
        matching=[s for s in existing if s['attributes'].get('sourceFileChecksum')==checksum]
        shot=next((s for s in matching if s['attributes'].get('assetDeliveryState',{}).get('state')=='COMPLETE'),None)
        if not shot and mutate:
            # Resume an already uploaded reservation with the same filename.
            shot=next((s for s in existing if s['attributes'].get('fileName')==filename
                       and s['attributes'].get('assetDeliveryState',{}).get('state') not in ('FAILED','COMPLETE')),None)
            if shot and refresh_stalled and shot['attributes'].get('assetDeliveryState',{}).get('state') in ('AWAITING_UPLOAD','UPLOAD_COMPLETE'):
                # Explicit recovery of a previously timed-out reservation. Keep
                # processed originals; only this unprocessed upload is replaced.
                api.request('DELETE',f'/v1/appScreenshots/{shot["id"]}')
                existing=[x for x in existing if x['id']!=shot['id']]
                shot=None
            if not shot: shot=create(api,'appScreenshots',{'fileName':filename,'fileSize':len(data)},'appScreenshotSet','appScreenshotSets',set_id)
            state=shot['attributes'].get('assetDeliveryState',{}).get('state')
            if state=='AWAITING_UPLOAD':
                for op in shot['attributes']['uploadOperations']:
                    url=op['url'];parsed=urlparse(url)
                    assert parsed.scheme=='https' and parsed.hostname.endswith('.apple.com')
                    headers={h['name']:h['value'] for h in op.get('requestHeaders',[])}
                    assert not any(k.lower()=='authorization' for k in headers)
                    chunk=data[op['offset']:op['offset']+op['length']]
                    # A fresh request without the ASC Bearer token, as Apple requires.
                    for attempt in range(3):
                        try:
                            response=requests.request(op['method'],url,headers=headers,data=chunk,timeout=60,allow_redirects=False)
                            if response.ok:break
                        except requests.RequestException:
                            if attempt==2:raise RuntimeError('Asset transfer connection failed') from None
                    else:raise RuntimeError('Asset transfer failed with HTTP '+str(response.status_code))
            # A stopped run may finish the byte transfer before committing its
            # checksum. UPLOAD_COMPLETE still needs Apple's finalization PATCH.
            if state in ('AWAITING_UPLOAD','UPLOAD_COMPLETE'):
                api.patch('appScreenshots',shot['id'],{'uploaded':True,'sourceFileChecksum':checksum})
        if not shot:
            return {'platform':platform,'locale':locale,'device':device,'error':'missing image','file':file.name}
        wanted.append(shot['id']);expected_checksums[shot['id']]=checksum
    assert wanted,'No local screenshot files'
    # Reserve/upload the entire set before polling: one set read checks all images
    # and avoids consuming the API quota with one polling loop per screenshot.
    for attempt in range(20 if mutate else 1):
        current=api.all(f'/v1/appScreenshotSets/{set_id}/appScreenshots',params={'limit':200})
        current_by_id={x['id']:x['attributes'] for x in current}
        failed=[sid for sid in wanted if current_by_id.get(sid,{}).get('assetDeliveryState',{}).get('state')=='FAILED']
        if failed:raise RuntimeError('Apple asset processing failed for '+str(len(failed))+' image(s)')
        ready=all(current_by_id.get(sid,{}).get('assetDeliveryState',{}).get('state')=='COMPLETE'
                  and current_by_id[sid].get('sourceFileChecksum')==checksum
                  for sid,checksum in expected_checksums.items())
        if ready:break
        if mutate:time.sleep(10)
    if not ready:return {'platform':platform,'locale':locale,'device':device,'error':'processing or checksum verification incomplete','setId':set_id}
    # Replace only after every new image is processed and checksum-verified.
    removed=False;reordered=False
    if mutate:
        for old in existing:
            if old['id'] not in wanted:
                api.request('DELETE',f'/v1/appScreenshots/{old["id"]}');removed=True
        if [x['id'] for x in current if x['id'] in wanted]!=wanted:
            api.request('PATCH',f'/v1/appScreenshotSets/{set_id}/relationships/appScreenshots',
                    json={'data':[{'type':'appScreenshots','id':s} for s in wanted]})
            reordered=True
    final=api.all(f'/v1/appScreenshotSets/{set_id}/appScreenshots',params={'limit':200}) if removed or reordered else current
    ok=[x['id'] for x in final]==wanted and all(x['attributes'].get('assetDeliveryState',{}).get('state')=='COMPLETE' for x in final)
    return {'platform':platform,'locale':locale,'device':device,'count':len(wanted),'verified':ok,'setId':set_id,
            'observedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'localFingerprint':set_fingerprint(locale,device)}

def set_fingerprint(locale,device):
    h=hashlib.sha256()
    for p in sorted((ASSETS/locale/device).glob('*.png')):
        h.update(p.name.encode());h.update(hashlib.md5(p.read_bytes()).digest())
    return h.hexdigest()

def screenshots(api, mutate, locale_filter, workers, retry_failed, refresh_stalled=False):
    report_name='aso-api-screenshots'+('-'+locale_filter if locale_filter else '')+'.json'
    previous=json.loads((ROOT/'validation'/report_name).read_text()) if retry_failed else []
    by_job={(x['platform'],x['locale'],x['device']):x for x in previous}
    jobs=[]
    for v in targets(api):
        p=v['attributes']['platform']
        locs={x['attributes']['locale']:x['id'] for x in api.all(f'/v1/appStoreVersions/{v["id"]}/appStoreVersionLocalizations',params={'limit':200})}
        for locale in COPY:
            if locale_filter and locale!=locale_filter:continue
            assert LOCALES.get(locale,locale) in locs,(p,locale,'metadata missing')
            locale_jobs=[]
            for device,display in SIZES[p].items():
                prior=by_job.get((p,locale,device),{})
                if retry_failed and prior.get('verified') and prior.get('localFingerprint')==set_fingerprint(locale,device):continue
                locale_jobs.append((p,locale,locs[LOCALES.get(locale,locale)],device,display))
            if locale_jobs:
                loc_id=locale_jobs[0][2]
                sets=screenshot_sets(api,loc_id)
                jobs.extend((*job,sets) for job in locale_jobs)
    results=previous
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures={pool.submit(deliver_set,job,mutate,refresh_stalled):job for job in jobs}
        for future in as_completed(futures):
            job=futures[future]
            try:result=future.result()
            except Exception as e:result={'platform':job[0],'locale':job[1],'device':job[3],'error':type(e).__name__+': '+str(e)}
            by_job[(result['platform'],result['locale'],result['device'])]=result
            results=list(by_job.values());print(json.dumps(result,ensure_ascii=False),flush=True)
            record(report_name,results)
    print(json.dumps({'sets':len(results),'verified':sum(bool(x.get('verified')) for x in results),
                      'images':sum(x.get('count',0) for x in results),'errors':sum(bool(x.get('error')) for x in results)}),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['text','screenshots']);p.add_argument('--apply',action='store_true');p.add_argument('--locale');p.add_argument('--workers',type=int,default=6);p.add_argument('--retry-failed',action='store_true');p.add_argument('--refresh-stalled',action='store_true')
    args=p.parse_args();api=client.ASC()
    if args.mode=='text':metadata(api,args.apply)
    else:screenshots(api,args.apply,args.locale,args.workers,args.retry_failed,args.refresh_stalled)
