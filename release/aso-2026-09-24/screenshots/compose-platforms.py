"""Compose localized captions around unaltered native iPad, TV and Mac captures.

Only the surrounding caption/layout is synthesized. App screenshots keep their
aspect ratio, text and contents. Large artifacts stay outside Git.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
OUTPUT = Path('/Users/mumiix/Downloads/MegaRadio-ASO-2026-09-24')
LOCALES = json.loads((ROOT / 'captions.json').read_text())
SPECS = [
    ('ipad13', 'ipad-discover.png', 2064, 2752, (150, 500, 1764, 2152)),
    ('appletv', 'tvos-genres.png', 1920, 1080, (220, 220, 1480, 832)),
    ('mac', 'mac-playing-cropped.png', 2880, 1800, (140, 350, 2600, 1390)),
]


def background(width, height):
    image = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(image)
    for y in range(height):
        t = y / max(1, height - 1)
        draw.line((0, y, width, y), fill=tuple(round(a + (b-a)*t) for a,b in zip((105, 21, 124), (24, 9, 42))))
    return image


def fit_caption(canvas, layer, rect):
    bounds = layer.getchannel('A').getbbox()
    if not bounds:
        raise ValueError('Caption has no visible text')
    layer = layer.crop(bounds)
    x, y, width, height = rect
    layer.thumbnail((width, height), Image.Resampling.LANCZOS)
    canvas.paste(layer, (x + (width-layer.width)//2, y + (height-layer.height)//2), layer)


audit = []
for device, source, width, height, box in SPECS:
    file = ROOT / 'source' / source
    if not file.exists():
        print('Capture pending:', device, source)
        continue
    original = Image.open(file).convert('RGB')
    app = original.copy()
    app.thumbnail((box[2], box[3]), Image.Resampling.LANCZOS)
    x = box[0] + (box[2]-app.width)//2
    y = box[1] + (box[3]-app.height)//2
    for locale in LOCALES:
        canvas = background(width, height)
        layer = Image.open(OUTPUT/'caption-layers'/locale/'discover.png').convert('RGBA')
        header_bottom = box[1] - 28
        fit_caption(canvas, layer.crop((0, 0, 1284, 320)), (width//12, 28, width*5//6, round(header_bottom*.58)))
        fit_caption(canvas, layer.crop((0, 320, 1284, 540)), (width//12, round(header_bottom*.65), width*5//6, round(header_bottom*.27)))
        shadow = Image.new('RGBA', (width, height))
        ImageDraw.Draw(shadow).rounded_rectangle((x-5,y-5,x+app.width+5,y+app.height+5), radius=24, fill=(0,0,0,145))
        shadow = shadow.filter(ImageFilter.GaussianBlur(18))
        canvas.paste(shadow, (0,0), shadow)
        canvas.paste(app, (x,y))
        target = OUTPUT/locale/device/'01_discover.png'
        target.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(target)
        audit.append({'locale':locale,'device':device,'source':source,'path':str(target),'size':[width,height],'appBounds':[x,y,app.width,app.height],'aspectPreserved':True})
(ROOT/'platform-render-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
print('Native platform screenshots composed:', len(audit))
