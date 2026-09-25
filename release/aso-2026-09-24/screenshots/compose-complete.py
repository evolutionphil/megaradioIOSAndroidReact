"""Complete sets: seven phone slides, four iPad, six Watch, four Mac and TV.

Preserve source photography and frames; correct unsupported marketing/record UI.
Watch captures retain their real native interface. No invented screens or ratings.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json,sys,shutil,argparse
R=Path(__file__).resolve().parent;SRC=R/'source';O=Path('/Users/mumiix/Downloads/MegaRadio-ASO-2026-09-24')
ORIG=Path('/Users/mumiix/Downloads/Mega Radio Store');LOCALES=json.loads((R/'captions.json').read_text())
AUDIT=[]
parser=argparse.ArgumentParser()
parser.add_argument('locale',nargs='?')
parser.add_argument('--device',choices=['iphone6.5','iphone6.9','iphone5.5','ipad13','mac','appletv','watch'])
args=parser.parse_args()
def caption(img,loc,kind,box,part=None,color=None):
 layer=Image.open(O/'caption-layers'/loc/(kind+'.png')).convert('RGBA')
 if part=='heading':layer=layer.crop((0,0,1284,320))
 elif part=='sub':layer=layer.crop((0,320,1284,540))
 bounds=layer.getchannel('A').getbbox();layer=layer.crop(bounds)
 if color:recolor=Image.new('RGBA',layer.size,color);recolor.putalpha(layer.getchannel('A'));layer=recolor
 layer.thumbnail((box[2],box[3]),Image.Resampling.LANCZOS)
 img.paste(layer,(box[0]+(box[2]-layer.width)//2,box[1]+(box[3]-layer.height)//2),layer)
def flat(img,box,color=None):ImageDraw.Draw(img).rectangle(box,fill=color or img.getpixel((box[0],box[1])))
def gradient(w,h):
 im=Image.new('RGB',(w,h));d=ImageDraw.Draw(im)
 for y in range(h):d.line((0,y,w,y),fill=tuple(round(a+(b-a)*y/(h-1)) for a,b in zip((97,22,120),(20,9,34))))
 return im
def save(img,loc,device,name,source):
 if args.device and device!=args.device:return
 d=O/loc/device;d.mkdir(parents=True,exist_ok=True);p=d/name;img.convert('RGB').save(p,compress_level=4)
 AUDIT.append(dict(locale=loc,device=device,file=name,dimensions=list(img.size),source=source,mode='RGB'))
def fit(img,size,bg):
 out=Image.new('RGB',size,bg);copy=ImageOps.contain(img,size,Image.Resampling.LANCZOS);out.paste(copy,((size[0]-copy.width)//2,(size[1]-copy.height)//2));return out
for loc in ([args.locale] if args.locale else LOCALES):
 # Remove only prior generated files from the local output, never original assets.
 for device in ['iphone6.5','iphone6.9','iphone5.5','ipad13','mac','appletv','watch']:
  if args.device and device!=args.device:continue
  folder=O/loc/device
  if folder.exists():
   for p in folder.glob('*.png'):p.unlink()
 for n,kind in [(1,'country'),(2,'discover'),(3,'player'),(4,'car'),(5,'genres'),(6,'favorites'),(7,'social')]:
  im=Image.open(ORIG/f'{n}.png').convert('RGB');bg=im.getpixel((20,20));d=ImageDraw.Draw(im)
  if n==1:
   # Only replace the old text band. Photography below it is untouched.
   for y in range(400):
    left=im.getpixel((0,y));right=im.getpixel((1283,y))
    for x in range(1284):im.putpixel((x,y),tuple(round(a+(b-a)*x/1283) for a,b in zip(left,right)))
   caption(im,loc,'country',(130,45,1024,325),'heading')
   d.rounded_rectangle((175,2200,1080,2640),radius=52,fill='#151323')
   font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',105)
   d.text((640,2310),'MegaRadio',font=font,anchor='mm',fill='white')
   caption(im,loc,'discover',(225,2410,800,155),'sub')
  else:
   # Original English subtitle reaches y=600; clear the full band above frame.
   flat(im,(0,0,1283,539 if n==2 else 649),bg);caption(im,loc,kind,(0,12,1284,510 if n==2 else 580))
   if n==3:
    flat(im,(892,2380,1060,2495),(17,17,17)) # unsupported REC control
    flat(im,(300,837,367,892),im.getpixel((299,856))) # unverified HD badge
   elif n==4:flat(im,(560,2360,736,2475),(17,17,17))
   elif n==5:
    # Recording is not implemented. Retain the orange design and device frame,
    # replacing its obsolete recording screen with a genuine Genres capture.
    screen=Image.open(SRC/'iphone-genres.png').convert('RGB')
    rect=(196,708,898,1910);screen=ImageOps.contain(screen,rect[2:],Image.Resampling.LANCZOS)
    d.rounded_rectangle((194,705,1096,2620),radius=95,fill='#1B1C1E')
    im.paste(screen,(rect[0]+(rect[2]-screen.width)//2,rect[1]+(rect[3]-screen.height)//2))
  for device,size in [('iphone6.5',(1284,2778)),('iphone6.9',(1320,2868)),('iphone5.5',(1242,2208))]:
   save(fit(im,size,bg),loc,device,f'{n:02}_{kind}.png',f'original-phone-{n}')
 # Three existing iPad photographs; localized wording occupies their old text panels.
 for n,kind in [(1,'discover'),(2,'player'),(3,'country')]:
  im=Image.open(SRC/'ios-1.0.3'/'APP_IPAD_PRO_3GEN_129'/f'{n:02}.png').convert('RGB');d=ImageDraw.Draw(im)
  if n==1:
   d.rounded_rectangle((1030,668,1865,2050),radius=64,fill='#252132')
   caption(im,loc,kind,(1090,790,715,710));d.rounded_rectangle((1170,1670,1730,1930),radius=95,fill='#ff329a')
   d.line((1370,1800,1530,1800),fill='white',width=16);d.line((1470,1740,1530,1800,1470,1860),fill='white',width=16)
  elif n==2:
   d.rounded_rectangle((200,620,1160,1190),radius=45,fill='#f0b890');caption(im,loc,kind,(235,650,880,490),color='#41203c')
   d.rounded_rectangle((246,1928,850,2215),radius=98,fill='#ff329a');d.line((480,2070,630,2070),fill='white',width=16);d.line((570,2010,630,2070,570,2130),fill='white',width=16)
  else:
   d.rounded_rectangle((1175,910,1940,1660),radius=48,fill='#25232b');caption(im,loc,kind,(1210,960,690,610))
  # Skip is part of the original native interface and remains unchanged.
  save(im,loc,'ipad13',f'{n:02}_{kind}.png',f'ios-1.0.3-ipad-{n}')
 im=gradient(2064,2752);caption(im,loc,'genres',(180,75,1704,390));app=Image.open(SRC/'ipad-genres.png').convert('RGB');app.thumbnail((1800,2140),Image.Resampling.LANCZOS);im.paste(app,((2064-app.width)//2,535));save(im,loc,'ipad13','04_genres.png','native-ipad-genres')
 for device,prefix,size in [('mac','mac',(2880,1800)),('appletv','tvos',(1920,1080))]:
  for n,kind in enumerate(['discover','player','genres','country'],1):
   source=SRC/(('mac-playing-cropped' if prefix=='mac' and kind=='player' else prefix+'-'+kind)+'.png')
   app=Image.open(source).convert('RGB');w,h=size;im=gradient(w,h);top=round(h*.22)
   caption(im,loc,kind,(round(w*.10),25,round(w*.8),top-50),'heading')
   box=(round(w*.04),top,round(w*.92),h-top-round(h*.035));app=ImageOps.contain(app,box[2:],Image.Resampling.LANCZOS)
   im.paste(app,(box[0]+(box[2]-app.width)//2,box[1]+(box[3]-app.height)//2));save(im,loc,device,f'{n:02}_{kind}.png',source.name)
 for p in sorted((SRC/'ios-1.0.3'/'APP_WATCH_ULTRA').glob('*.png')):
  save(Image.open(p),loc,'watch',p.name,'ios-1.0.3-native-watch-'+p.stem)
 print(loc,len([x for x in AUDIT if x['locale']==loc]),'images',flush=True)
(R/('complete-render-audit'+('-'+args.locale if args.locale else '')+('-'+args.device if args.device else '')+'.json')).write_text(json.dumps(AUDIT,ensure_ascii=False,indent=2)+'\n')
