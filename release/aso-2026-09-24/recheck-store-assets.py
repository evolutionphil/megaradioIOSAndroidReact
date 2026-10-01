#!/usr/bin/env python3
"""Read-only comparison of the exact release drafts, including rejected versions."""
import importlib.util
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('delivery', ROOT / 'asc-release.py')
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
api = d.client.ASC()
VERSIONS = {'IOS': 'a7ee381b-c6c2-4919-9df7-310d906d1565',
            'MAC_OS': '1a49d2fc-d7fd-434d-ba5a-50aa4fb217b3',
            'TV_OS': '49d680f3-5b7c-44a5-8b2a-4c761c5a1733'}
errors, text, images, jobs = [], [], [], []
assert api.request('GET', '/v1/apps/' + d.client.APP)['data']['attributes']['bundleId'] == 'com.visiongo.megaradio'

def compare(locs, expected, kind):
    by_locale = {row['attributes']['locale']: row for row in locs}
    for locale in d.COPY:
        row = by_locale.get(d.LOCALES.get(locale, locale), {}).get('attributes', {})
        mismatch = [key for key, value in expected(locale).items() if row.get(key) != value]
        text.append({'kind': kind, 'locale': locale, 'mismatches': mismatch})
        if mismatch: errors.append(f'{kind}/{locale}: {mismatch}')

for platform, version_id in VERSIONS.items():
    version = api.request('GET', '/v1/appStoreVersions/' + version_id)['data']
    assert version['attributes']['platform'] == platform
    assert version['attributes']['versionString'] == d.VERSIONS[platform]
    locs = api.all(f'/v1/appStoreVersions/{version_id}/appStoreVersionLocalizations', params={'limit': 200})
    compare(locs, lambda locale: d.expected(locale, platform), platform)
    by_locale = {row['attributes']['locale']: row['id'] for row in locs}
    for locale in d.COPY:
        jobs.append((platform, locale, by_locale[d.LOCALES.get(locale, locale)]))

for info_id in ['1c1ca9df-fd5f-4caf-84eb-41eac95c1809', '76c28973-6ad6-4710-8a56-de3af87822a6']:
    locs = api.all(f'/v1/appInfos/{info_id}/appInfoLocalizations', params={'limit': 200})
    compare(locs, lambda locale: dict(name=d.COPY[locale]['name'], subtitle=d.COPY[locale]['subtitle'],
                                    privacyPolicyUrl=d.PRIVACY, privacyPolicyText=d.PRIVACY_TEXT), info_id)

def check_locale(job):
    platform, locale, loc_id = job
    sets = d.screenshot_sets(d.client.ASC(), loc_id)
    return [d.deliver_set((platform, locale, loc_id, device, display, sets), False)
            for device, display in d.SIZES[platform].items()]

with ThreadPoolExecutor(max_workers=4) as pool:
    futures = {pool.submit(check_locale, job): job for job in jobs}
    for future in as_completed(futures):
        job = futures[future]
        try:
            rows = future.result()
            images.extend(rows)
            errors.extend(f'{row["platform"]}/{row["locale"]}/{row["device"]}' for row in rows if not row.get('verified'))
        except Exception as error:
            errors.append(f'{job}: {type(error).__name__}: {error}')
        report = {'observedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                  'text': text, 'screenshots': images, 'errors': errors,
                  'complete': len(images) == 350 and len(text) == 250 and not errors}
        (ROOT / 'validation/store-assets-recheck-2026-09-25.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps({'sets': len(images), 'textRecords': len(text), 'errors': len(errors)}), flush=True)
raise SystemExit(not report['complete'])
