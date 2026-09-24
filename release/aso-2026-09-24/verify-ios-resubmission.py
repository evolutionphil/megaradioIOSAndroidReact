#!/usr/bin/env python3
"""Read-only checks for the exact rejected iOS release; never submits it."""
import importlib.util
import json
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('delivery', ROOT / 'asc-release.py')
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
api = d.client.ASC()
VERSION = 'a7ee381b-c6c2-4919-9df7-310d906d1565'
BUILD = '8f8b9512-fd29-4fd7-9c6f-37b35231d8a9'
INFOS = ['1c1ca9df-fd5f-4caf-84eb-41eac95c1809', '76c28973-6ad6-4710-8a56-de3af87822a6']
errors = []
records = []
app = api.request('GET', '/v1/apps/' + d.client.APP)['data']
assert app['attributes']['bundleId'] == 'com.visiongo.megaradio'
version = api.request('GET', '/v1/appStoreVersions/' + VERSION)['data']
build = api.request('GET', f'/v1/appStoreVersions/{VERSION}/build')['data']
if version['attributes']['versionString'] != '1.0.70' or version['attributes']['platform'] != 'IOS':
    errors.append('Unexpected version')
if build['id'] != BUILD or build['attributes']['version'] != '6' or build['attributes']['processingState'] != 'VALID':
    errors.append('Expected validated build 6')
if version['attributes']['releaseType'] != 'AFTER_APPROVAL':
    errors.append('Automatic release after approval is not configured')

def compare(localizations, expected, kind):
    by_locale = {x['attributes']['locale']: x for x in localizations}
    for locale in d.COPY:
        actual = by_locale.get(d.LOCALES.get(locale, locale), {}).get('attributes', {})
        mismatch = [key for key, value in expected(locale).items() if actual.get(key) != value]
        records.append({'kind': kind, 'locale': locale, 'mismatches': mismatch})
        if mismatch:
            errors.append(kind + '/' + locale + ': ' + ', '.join(mismatch))

compare(api.all(f'/v1/appStoreVersions/{VERSION}/appStoreVersionLocalizations', params={'limit': 200}),
        lambda locale: d.expected(locale, 'IOS'), 'iOS')
ages = []
for info in INFOS:
    compare(api.all(f'/v1/appInfos/{info}/appInfoLocalizations', params={'limit': 200}),
            lambda locale: dict(name=d.COPY[locale]['name'], subtitle=d.COPY[locale]['subtitle'],
                                privacyPolicyUrl=d.PRIVACY, privacyPolicyText=d.PRIVACY_TEXT), 'appInfo/' + info)
    age = api.request('GET', f'/v1/appInfos/{info}/ageRatingDeclaration')['data']
    ages.append({'appInfoId': info, 'advertising': age['attributes']['advertising']})
    if age['attributes']['advertising'] is not True:
        errors.append('Advertising not declared: ' + info)

report = {'observedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
          'versionId': VERSION, 'version': '1.0.70', 'build': '6',
          'state': version['attributes']['appStoreState'], 'buildProcessingState': build['attributes']['processingState'],
          'automaticReleaseAfterApproval': version['attributes']['releaseType'] == 'AFTER_APPROVAL',
          'records': records, 'ageRatings': ages, 'errors': errors, 'verified': not errors}
(ROOT / 'validation/ios-resubmission-preflight.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k != 'records'}, indent=2))
raise SystemExit(bool(errors))
