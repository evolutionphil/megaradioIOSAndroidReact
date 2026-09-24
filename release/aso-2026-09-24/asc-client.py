#!/usr/bin/env python3
"""App-scoped App Store metadata client. Credentials stay outside the repository.

Default mode is read-only. Does not change content-rights declarations, pricing,
agreements, users, or API permissions. Screenshot uploads never receive the JWT.
"""
from pathlib import Path
import os,time,json,argparse
from urllib.parse import urlparse
import jwt,requests

APP='6759302561'
ROOT=Path(__file__).resolve().parent
class AppleError(RuntimeError):
 def __init__(self,status,errors):self.status=status;self.errors=errors;super().__init__(f'Apple HTTP {status}: {errors}')
class ASC:
 def __init__(self):
  self.key=Path(os.environ['ASC_KEY_PATH']).read_text()
  self.key_id=os.environ['ASC_KEY_ID'];self.issuer=os.environ['ASC_ISSUER_ID'];self.session=requests.Session();self.exp=0;self.token=''
 def request(self,method,path,**kw):
  url=path if path.startswith('https://') else 'https://api.appstoreconnect.apple.com'+path
  assert urlparse(url).hostname=='api.appstoreconnect.apple.com'
  if self.exp-time.time()<90:
   now=int(time.time());self.exp=now+900
   self.token=jwt.encode({'iss':self.issuer,'iat':now,'exp':self.exp,'aud':'appstoreconnect-v1'},self.key,algorithm='ES256',headers={'kid':self.key_id,'typ':'JWT'})
  for attempt in range(61):
   if self.exp-time.time()<90:
    now=int(time.time());self.exp=now+900
    self.token=jwt.encode({'iss':self.issuer,'iat':now,'exp':self.exp,'aud':'appstoreconnect-v1'},self.key,algorithm='ES256',headers={'kid':self.key_id,'typ':'JWT'})
   r=self.session.request(method,url,headers={'Authorization':'Bearer '+self.token,'Content-Type':'application/json'},timeout=60,**kw)
   if r.status_code==429 and attempt<60:
    # Respect Apple's quota; no credential or signed URL appears in output.
    retry_at=time.time()+max(1,int(r.headers.get('Retry-After','60')))
    while time.time()<retry_at:time.sleep(min(60,retry_at-time.time()))
    continue
   if r.status_code>=500 and method in ('GET','PATCH','DELETE') and attempt<3:
    time.sleep(2**attempt);continue
   break
  if not r.ok:
   try:errors=r.json().get('errors',[])
   except ValueError:errors=[{'detail':'Non-JSON response'}]
   # Do not include request headers, private key, JWT or signed upload URLs in errors.
   raise AppleError(r.status_code,[{k:e.get(k) for k in ['code','title','detail','source']} for e in errors])
  return r.json() if r.content else None
 def all(self,path,**kw):
  out=[]
  while path:
   d=self.request('GET',path,**kw);out.extend(d['data']);path=d.get('links',{}).get('next');kw={}
  return out
 def patch(self,kind,ident,attrs):
  return self.request('PATCH',f'/v1/{kind}/{ident}',json={'data':{'type':kind,'id':ident,'attributes':attrs}})

def inspect(api):
 app=api.request('GET',f'/v1/apps/{APP}',params={'fields[apps]':'name,bundleId,primaryLocale'})['data']
 assert app['attributes']['bundleId']=='com.visiongo.megaradio'
 infos=api.all(f'/v1/apps/{APP}/appInfos',params={'limit':200})
 versions=api.all(f'/v1/apps/{APP}/appStoreVersions',params={'limit':200,'fields[appStoreVersions]':'platform,versionString,appStoreState'})
 snapshot={'app':app,'appInfos':infos,'versions':versions,'observedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
 for info in infos:
  info['localizations']=api.all(f'/v1/appInfos/{info["id"]}/appInfoLocalizations',params={'limit':200})
 for v in versions:
  if v['attributes']['appStoreState'] in ['PREPARE_FOR_SUBMISSION','DEVELOPER_REJECTED','METADATA_REJECTED','REJECTED']:
   v['localizations']=api.all(f'/v1/appStoreVersions/{v["id"]}/appStoreVersionLocalizations',params={'limit':200})
 target=ROOT/'remote-api-snapshot.json';target.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'app':app['attributes'],'appInfos':[{'id':x['id'],'attributes':x['attributes'],'locales':len(x['localizations'])} for x in infos],'versions':[dict(v['attributes'],id=v['id'],locales=len(v.get('localizations',[]))) for v in versions]},ensure_ascii=False,indent=2))

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['inspect'],default='inspect',nargs='?');args=parser.parse_args()
 inspect(ASC())
