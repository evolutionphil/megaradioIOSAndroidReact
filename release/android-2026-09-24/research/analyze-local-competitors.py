#!/usr/bin/env python3
"""Public localized listing evidence; not an ASO volume/rank service.

Descriptions are read for phrase counts, never retained or copied. Installation
counts refer to the app globally, not installs attributable to a keyword/country.
"""
import concurrent.futures
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from google_play_scraper import app

ROOT = Path(__file__).resolve().parent
markets = json.loads((ROOT / 'play-market-research.json').read_text())['markets']
markets += json.loads((ROOT / 'play-existing-extra-markets.json').read_text())

def analyze(market):
    packages = [r['appId'] for r in market.get('results', []) if r.get('appId')][:3]
    if market['locale'] == 'tr-TR':
        packages.insert(0, 'com.safakge.radyokulesi')
    if market['locale'].startswith('de-'):
        packages.insert(0, 'de.radio.android')
    rows = []
    terms = [market['query'], *market['editorialIntentPhrases']]
    for package in dict.fromkeys(packages):
        try:
            data = app(package, lang=market['language'], country=market['country'])
            description = data.get('description', '')
            summary = data.get('summary', '')
            title = data.get('title', '')
            rows.append({
                'appId': package, 'title': title,
                'source': 'https://play.google.com/store/apps/details?' + urlencode({
                    'id': package, 'hl': market['language'], 'gl': market['country']}),
                'installsGlobal': data.get('installs'), 'rating': data.get('score'),
                'ratingsCount': data.get('ratings'), 'lastUpdated': data.get('updated'),
                'titleLength': len(title), 'shortDescriptionLength': len(summary),
                'descriptionLength': len(description),
                'screenshotsCount': len(data.get('screenshots', [])),
                'hasVideo': bool(data.get('video')), 'offersIAP': data.get('offersIAP'),
                'containsAds': data.get('containsAds'),
                'localPhraseEvidence': {term: {
                    'title': term.casefold() in title.casefold(),
                    'shortDescription': term.casefold() in summary.casefold(),
                    'descriptionOccurrences': description.casefold().count(term.casefold())
                } for term in terms},
                'descriptionStructure': {
                    'paragraphs': len([p for p in re.split(r'\n\s*\n', description) if p.strip()]),
                    'bulletLines': sum(bool(re.match(r'\s*[-•✓✔]', l)) for l in description.splitlines()),
                },
            })
        except Exception as error:
            rows.append({'appId': package, 'error': str(error)})
    return {**{k:market[k] for k in ('locale', 'country', 'language', 'query', 'queryUrl')},
            'intentPhrases': terms, 'competitors': rows,
            'rankingInterpretation': 'Search position is a dated query-context snapshot, not keyword volume or stable rank; no causal conversion data is public.'}

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    results = list(executor.map(analyze, markets))
report = {'observedAt': datetime.now(timezone.utc).isoformat(), 'markets': results,
          'limitation': 'No competitor conversion, A/B uplift, paid keyword volume or historical ranking data is available. Do not attribute download success to copy.'}
(ROOT / 'local-competitor-analysis.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'markets':len(results), 'listings':sum(len(r['competitors']) for r in results),
                  'errors':sum('error' in c for r in results for c in r['competitors'])}))
