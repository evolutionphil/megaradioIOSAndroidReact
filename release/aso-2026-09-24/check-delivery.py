#!/usr/bin/env python3
"""Check delivery evidence against the exact current files before review.

Does not contact Apple or submit a version. Run read-only remote metadata
verification first; screenshot evidence comes from processed asset readbacks.
"""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
ASSETS = Path('/Users/mumiix/Downloads/MegaRadio-ASO-2026-09-24')
copy = json.loads((ROOT / 'copy.json').read_text())
text = json.loads((ROOT / 'validation/aso-api-text-verification.json').read_text())
shots = json.loads((ROOT / 'validation/aso-api-screenshots.json').read_text())
build = json.loads((ROOT / 'validation/ios-selected-build.json').read_text())
expected_devices = {'IOS': {'iphone6.5': 7, 'iphone6.9': 7, 'iphone5.5': 7, 'ipad13': 4, 'watch': 6},
                    'MAC_OS': {'mac': 4}, 'TV_OS': {'appletv': 4}}
errors = []
fingerprint = hashlib.sha256(json.dumps(copy, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
if text.get('copyFingerprint') != fingerprint:
    errors.append('Metadata readback does not identify the current copy revision')
if len(text.get('records', [])) != 250 or text.get('mismatches'):
    errors.append('Metadata must have 250 successful comparisons')
for platform in expected_devices:
    locales = {x['locale'] for x in text.get('records', []) if x.get('platform') == platform}
    if locales != set(copy):
        errors.append('Incomplete metadata locale coverage: ' + platform)
by_job = {(x['platform'], x['locale'], x['device']): x for x in shots}
verified = 0
for platform, devices in expected_devices.items():
    for locale in copy:
        for device, count in devices.items():
            key = (platform, locale, device)
            files = sorted((ASSETS / locale / device).glob('*.png'))
            h = hashlib.sha256()
            for file in files:
                h.update(file.name.encode())
                h.update(hashlib.md5(file.read_bytes()).digest())
            row = by_job.get(key, {})
            if (len(files) != count or row.get('count') != count or not row.get('verified')
                    or row.get('localFingerprint') != h.hexdigest()):
                errors.append('Screenshot delivery incomplete or stale: ' + '/'.join(key))
            else:
                verified += 1
if not (build.get('version') == '1.0.70' and build.get('build') == '6' and build.get('verified')):
    errors.append('iOS 1.0.70 build 6 association is not verified')
result = {'readyForFinalUIReview': not errors, 'metadataRecords': len(text.get('records', [])),
          'currentScreenshotSets': verified, 'expectedScreenshotSets': 350,
          'expectedImages': 1950, 'iosBuild': build.get('build'), 'errors': errors}
(ROOT / 'validation/delivery-preflight.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({**result, 'errors': errors[:5], 'errorCount': len(errors)}, indent=2))
sys.exit(bool(errors))
