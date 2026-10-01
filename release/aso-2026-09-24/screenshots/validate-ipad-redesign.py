"""Finalize opaque App Store PNGs, inspect all 50 sets and create review sheets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
import hashlib,json,time
R=Path(__file__).resolve().parent
O=Path('/Users/mumiix/Downloads/MegaRadio-iPad-Redesign-2026-09-24')
copy=json.loads((R/'ipad-redesign-captions.json').read_text())
audit=json.loads((O/'render-audit.json').read_text())
assert len(audit)==200
expected=['01_discover.png','02_player.png','03_genres.png','04_country.png']
rows=[]
for locale in copy:
    files=sorted((O/locale/'ipad13').glob('*.png'))
    assert [p.name for p in files]==expected,(locale,'incomplete set')
    for p in files:
        with Image.open(p) as source:
            source.load();assert source.size==(2064,2752)
            if 'A' in source.getbands():
                assert source.getchannel('A').getextrema()==(255,255),(p,'transparent pixels')
            im=source.convert('RGB')
            if source.mode!='RGB':im.save(p,compress_level=6)
        with Image.open(p) as verify:
            assert verify.mode=='RGB' and verify.format=='PNG'
        rows.append({'locale':locale,'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
preview=O/'previews';preview.mkdir(exist_ok=True)
for locale in ['tr','de-DE','en-US','ar-SA','ja','ml']:
    sheet=Image.new('RGB',(1600,550),'#f4f2f7')
    for n,name in enumerate(expected):
        tile=ImageOps.contain(Image.open(O/locale/'ipad13'/name),(390,520),Image.Resampling.LANCZOS)
        sheet.paste(tile,(5+n*400,15))
    sheet.save(preview/(locale+'-overview.jpg'),quality=93)
locales=sorted(copy)
for page in range(5):
    sheet=Image.new('RGB',(1800,1730),'#f4f2f7');d=ImageDraw.Draw(sheet)
    for row,locale in enumerate(locales[page*10:(page+1)*10]):
        for col,name in enumerate(expected):
            thumb=Image.open(O/locale/'ipad13'/name).crop((0,0,2064,640)).resize((438,136),Image.Resampling.LANCZOS)
            sheet.paste(thumb,(col*450+6,row*173+25));d.text((col*450+10,row*173+6),locale+' / '+name,fill='black')
    sheet.save(preview/f'caption-review-{page+1}.jpg',quality=95)
result={'observedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'locales':len(copy),'images':len(rows),'dimensions':[2064,2752],'mode':'RGB','errors':[],
        'minimumHeadingFont':min(x['headingFont'] for x in audit),'minimumSubtitleFont':min(x['subtitleFont'] for x in audit),
        'nativeInterfaceLanguage':'English, preserved from genuine iPad captures','uploadStatus':'Prepared separately; current App Review submission not modified','files':rows}
(O/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='files'},indent=2))
