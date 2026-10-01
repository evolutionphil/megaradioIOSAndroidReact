from pathlib import Path
import json,re,unicodedata
ROOT=Path(__file__).resolve().parent
copy=json.loads((ROOT/'copy.json').read_text())
PLATFORMS={'IOS':'1.0.70','MACOS':'1.0.3','TVOS':'1.0.0'}
privacy='https://themegaradio.com/en/pages/privacy-policy'
support='https://themegaradio.com/en/contact'
terms='https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
def strings(values):
    return ''.join('"'+k+'" = "'+v.replace('\\','\\\\').replace('"','\\"')+'";\n' for k,v in values.items())
checks=[]
for platform,version in PLATFORMS.items():
    package=ROOT/'metadata'/platform/'up-6759302561'
    for locale,a in copy.items():
        for field,limit in [('name',30),('subtitle',30),('keywords',100),('promotionalText',170)]:
            assert len(a[field])<=limit,(locale,field,len(a[field]))
        assert a['name'].startswith('MegaRadio:'),locale
        assert len(a['keywords'].split(','))==len(set(a['keywords'].lower().split(','))),locale
        blocked=['tunein','mytuner','radiko','radio.net','kulesi','offline','best app']
        assert not any(x in a['keywords'].lower() for x in blocked),locale
        desc=a['description']+'\n\n'+a['platform'][platform]+'\n\n'+terms+'\n'+privacy
        assert len(desc)<=4000,locale
        values={'promotionalText':a['promotionalText'],'description':desc,'keywords':a['keywords'],'supportUrl':support,'marketingUrl':'https://themegaradio.com'}
        if platform=='IOS':values['whatsNew']=a['whatsNew']
        target=package/platform/(locale+'.txt');target.parent.mkdir(parents=True,exist_ok=True);target.write_text(strings(values))
        if platform=='IOS':
            target=package/'appInfo'/(locale+'.txt');target.parent.mkdir(parents=True,exist_ok=True)
            target.write_text(strings({'name':a['name'],'subtitle':a['subtitle'],'privacyPolicyUrl':privacy}))
        checks.append({'platform':platform,'locale':locale,'name':len(a['name']),'subtitle':len(a['subtitle']),'keywords':len(a['keywords']),'keywords_utf8_bytes':len(a['keywords'].encode()),'promotion':len(a['promotionalText']),'description':len(desc)})
(ROOT/'validation.json').write_text(json.dumps({'checks':checks,'validatedLocales':len(copy),'platforms':PLATFORMS,'status':'Local field validation passed. Upload and remote verification pending.'},ensure_ascii=False,indent=2)+'\n')
print(len(checks),'platform/localization records validated and generated')
