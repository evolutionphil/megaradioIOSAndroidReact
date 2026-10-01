from PIL import Image, ImageDraw, ImageChops
from pathlib import Path
import json
R=Path(__file__).resolve().parent;out=Path('/Users/mumiix/Downloads/MegaRadio-ASO-2026-09-24');source=Path('/Users/mumiix/Downloads/Mega Radio Store')
audit=[]
for locale in json.loads((R/'captions.json').read_text()):
 for n,kind,filename in [(1,'discover','2.png'),(2,'favorites','6.png')]:
  original=Image.open(source/filename).convert('RGB');img=original.copy();bg=img.getpixel((20,20));ImageDraw.Draw(img).rectangle((0,0,1283,539),fill=bg)
  overlay=Image.open(out/'caption-layers'/locale/(kind+'.png')).convert('RGBA');img.paste(overlay,(0,0),overlay)
  assert ImageChops.difference(original.crop((0,540,1284,2778)),img.crop((0,540,1284,2778))).getbbox() is None
  for device,w,h in [('iphone6.5',1284,2778),('iphone6.9',1320,2868),('iphone5.5',1242,2208)]:
   scaled=img.copy();scaled.thumbnail((w,h),Image.Resampling.LANCZOS) if w<1284 else None
   if w>=1284:
    factor=min(w/1284,h/2778);scaled=img.resize((round(1284*factor),round(2778*factor)),Image.Resampling.LANCZOS)
   canvas=Image.new('RGB',(w,h),bg);canvas.paste(scaled,((w-scaled.width)//2,(h-scaled.height)//2));folder=out/locale/device;folder.mkdir(parents=True,exist_ok=True);file=folder/f'{n:02}_{kind}.png';canvas.save(file)
   audit.append({'locale':locale,'device':device,'path':str(file),'size':[w,h],'mode':'RGB','sourceUnchangedBelowY':540})
(R/'render-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
print(len(audit),'screenshots composed; original art below captions is pixel-identical at native size')
