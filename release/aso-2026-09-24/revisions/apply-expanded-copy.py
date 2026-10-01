from pathlib import Path
import json
R=Path(__file__).resolve().parent;P=R.parent
base=json.loads((R/'copy-before-expanded-review.json').read_text());edits={}
for file in sorted(R.glob('expanded-*.json')):
 data=json.loads(file.read_text());assert not (set(edits)&set(data));edits.update(data)
mobile=json.loads((R/'mobile-features.json').read_text())
assert set(base)==set(edits)
report=[]
for locale,item in base.items():
 change=edits[locale]
 disclaimer=item['description'].split('\n\n')[-1]
 item['description']='\n\n'.join([change['intro'],change['extra'],change['terms'],disclaimer])
 item['promotionalText']=change['promotion']
 item['platform']['IOS']=change.get('ios',mobile.get(locale))
 assert item['platform']['IOS']
 assert len(item['promotionalText'])<=170,(locale,'promotion')
 for platform,part in item['platform'].items():
  total=item['description']+'\n\n'+part+'\n\n'+'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'+'\n'+'https://themegaradio.com/en/pages/privacy-policy'
  assert len(total)<=4000,(locale,platform,len(total))
  report.append({'locale':locale,'platform':platform,'characters':len(total),'promotionCharacters':len(item['promotionalText']),'brandUnchanged':True,'review':'localized opening and market context; relevant features; no volume or rank claim'})
(P/'copy.json').write_text(json.dumps(base,ensure_ascii=False,indent=2)+'\n')
(P/'validation'/'expanded-copy-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('50 locale descriptions and promotional texts expanded; 150 platform variants validated')
print('description character range',min(x['characters'] for x in report),max(x['characters'] for x in report))
