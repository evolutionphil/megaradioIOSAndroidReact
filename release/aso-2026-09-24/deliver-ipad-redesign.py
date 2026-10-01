#!/usr/bin/env python3
"""Deliver the validated iPad refresh to the rejected iOS version only.

Default is read-only. Existing assets remain until every replacement in a set
has passed Apple's processing/checksum checks. No binary or declarations change.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('delivery', ROOT / 'asc-release.py')
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
CANONICAL = d.ASSETS
d.ASSETS = Path('/Users/mumiix/Downloads/MegaRadio-iPad-Redesign-2026-09-24')
VERSION = 'a7ee381b-c6c2-4919-9df7-310d906d1565'
REPORT = ROOT / 'validation/ipad-redesign-delivery.json'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--refresh-stalled', action='store_true',
                        help='Recreate only unfinished upload reservations; processed originals are preserved')
    args = parser.parse_args()
    assert not args.refresh_stalled or args.apply, '--refresh-stalled requires --apply'
    validation = json.loads((ROOT / 'validation/ipad-redesign-validation.json').read_text())
    assert not validation['errors'] and validation['images'] == 200
    for item in validation['files']:
        path = d.ASSETS / item['locale'] / 'ipad13' / item['file']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], str(path)
    api = d.client.ASC()
    version = api.request('GET', f'/v1/appStoreVersions/{VERSION}')['data']
    assert version['attributes']['platform'] == 'IOS'
    assert version['attributes']['versionString'] == '1.0.70'
    if args.apply:
        assert version['attributes']['appStoreState'] in ('REJECTED', 'METADATA_REJECTED', 'PREPARE_FOR_SUBMISSION')
    localizations = api.all(f'/v1/appStoreVersions/{VERSION}/appStoreVersionLocalizations', params={'limit': 200})
    by_locale = {x['attributes']['locale']: x for x in localizations}
    results = []

    def deliver(locale):
        loc = by_locale[d.LOCALES.get(locale, locale)]
        sets = d.screenshot_sets(d.client.ASC(), loc['id'])
        return d.deliver_set(('IOS', locale, loc['id'], 'ipad13', 'APP_IPAD_PRO_3GEN_129', sets),
                             args.apply, args.refresh_stalled)

    with ThreadPoolExecutor(max_workers=3) as pool:
        jobs = {pool.submit(deliver, locale): locale for locale in d.COPY}
        for future in as_completed(jobs):
            locale = jobs[future]
            try:
                row = future.result()
            except Exception as error:
                row = {'platform': 'IOS', 'locale': locale, 'device': 'ipad13', 'error': str(error)}
            results.append(row)
            REPORT.write_text(json.dumps(sorted(results, key=lambda x: x['locale']), ensure_ascii=False, indent=2) + '\n')
            print(json.dumps(row), flush=True)
    assert len(results) == 50 and all(x.get('verified') and x.get('count') == 4 for x in results), 'Incomplete delivery; rerun to resume'
    if args.apply:
        # Retain prior local images as well as the remote manifest for recovery.
        archive = CANONICAL / 'previous-ipad-before-redesign'
        for locale in d.COPY:
            old = CANONICAL / locale / 'ipad13'
            saved = archive / locale / 'ipad13'
            if not saved.exists():
                saved.parent.mkdir(parents=True, exist_ok=True)
                shutil.copytree(old, saved)
            for path in old.glob('*.png'):
                path.unlink()
            for path in (d.ASSETS / locale / 'ipad13').glob('*.png'):
                shutil.copy2(path, old / path.name)
        report = ROOT / 'validation/aso-api-screenshots.json'
        rows = json.loads(report.read_text())
        rows = [x for x in rows if not (x['platform'] == 'IOS' and x['device'] == 'ipad13')]
        report.write_text(json.dumps(rows + results, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'verifiedSets': len(results), 'images': 200, 'applied': args.apply}), flush=True)


if __name__ == '__main__':
    main()
