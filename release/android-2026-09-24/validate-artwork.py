#!/usr/bin/env python3
"""Validate locally rendered Play artwork; no upload or console changes."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
ART = Path(sys.argv[1])
records = json.loads((ART / "feature-render-audit.json").read_text())
errors, audit = [], []
expected = set(json.loads((ROOT / "play-copy-draft.json").read_text())["locales"])
for row in records:
    file = Path(row["file"])
    with Image.open(file) as source:
        source.convert("RGB").save(file, compress_level=6)
    with Image.open(file) as image:
        if image.size != (1024, 500) or image.mode != "RGB":
            errors.append(f"Invalid feature graphic: {row['locale']}")
    if len(row["altText"]) > 140:
        errors.append(f"Alt text exceeds 140 characters: {row['locale']}")
    audit.append(dict(locale=row["locale"], file=str(file), altText=row["altText"],
                      sha256=hashlib.sha256(file.read_bytes()).hexdigest(), dimensions=[1024,500], mode="RGB"))
if {r["locale"] for r in records} != expected:
    errors.append("Artwork locale set differs from copy locale set")

# Preserve the original Android icon without adding a device frame or badges.
icon_source = ROOT.parent.parent / "frontend/assets/images/icon.png"
icon = Image.open(icon_source).convert("RGBA").resize((512,512), Image.Resampling.LANCZOS)
icon.save(ART / "icon-512.png", optimize=True)
if (ART / "icon-512.png").stat().st_size > 1024 * 1024:
    errors.append("Play icon exceeds 1 MiB")

for page, offset in enumerate(range(0,len(audit),20)):
    sheet = Image.new("RGB",(1600,1150),"#F1EDF5")
    draw = ImageDraw.Draw(sheet)
    for index,row in enumerate(audit[offset:offset+20]):
        x,y=(index%4)*400,(index//4)*230
        draw.text((x+12,y+9),row["locale"],fill="#281333")
        with Image.open(row["file"]) as image:
            image.thumbnail((400,195))
            sheet.paste(image,(x,y+28))
    sheet.save(ART / f"feature-contact-sheet-{page+1}.jpg",quality=92)

report = dict(locales=len(expected), graphics=audit, errors=errors,
              screenshots="Not yet captured; Android SDK/device validation pending",
              storeDelivery="Not uploaded")
(ROOT / "validation/artwork-validation.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
print(json.dumps(dict(locales=len(expected),graphics=len(audit),errors=errors)))
raise SystemExit(bool(errors))
