#!/usr/bin/env python3
"""Prepare locally researched Google Play drafts; does not publish metadata.

The existing native-language editorial copy is a reusable product source, not
an English translation template. Each locale is paired with its own public Play
research and a newly written 80-character short description. Device-specific
claims remain subject to Android release validation before upload.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / "aso-2026-09-24/copy.json"
LOCALES = {
    "tr": "tr-TR", "it": "it-IT", "ru": "ru-RU", "ja": "ja-JP",
    "zh-Hant": "zh-TW", "zh-Hans": "zh-CN", "he": "he-IL", "ar-SA": "ar",
    "es-MX": "es-419", "sv": "sv-SE", "no": "no-NO", "da": "da-DK", "fi": "fi-FI",
    "pl": "pl-PL", "cs": "cs-CZ", "sk": "sk-SK", "hu": "hu-HU", "ro": "ro-RO",
    "hr": "hr-HR", "el": "el-GR", "ko": "ko-KR", "hi": "hi-IN", "bn": "bn-BD",
    "kn": "kn-IN", "ml": "ml-IN", "mr": "mr-IN", "ta": "ta-IN", "te": "te-IN", "sl": "sl-SI",
}
NAMES = {
    "ja": "MegaRadio: ネットラジオ", "bn": "MegaRadio: বাংলা রেডিও",
    "gu": "MegaRadio: ગુજરાતી રેડિયો", "ml": "MegaRadio: മലയാളം റേഡിയോ",
    "mr": "MegaRadio: मराठी रेडिओ", "or": "MegaRadio: ଓଡ଼ିଆ ରେଡିଓ",
    "pa": "MegaRadio: ਪੰਜਾਬੀ ਰੇਡੀਓ", "te": "MegaRadio: తెలుగు రేడియో",
    "ur": "MegaRadio: اردو ریڈیو",
}
PLAY_CONSOLE_ALIASES = {"sk-SK": "sk", "ro-RO": "ro", "hr-HR": "hr", "sl-SI": "sl"}
# Verified against the Console's complete 87-language selector on 2026-09-24.
# Preserve the editorial source for future use, but never send it as a supported
# Google Play localization or silently substitute another language.
UNSUPPORTED_PLAY_LOCALES = {"or"}


def count(text):
    # Conservative: UTF-16 code units as well as Unicode character count.
    return max(len(text), len(text.encode("utf-16-le")) // 2)


def prepare():
    editorial = json.loads(SOURCE.read_text())
    overrides = json.loads((ROOT / "play-copy-overrides.json").read_text())
    research = json.loads((ROOT / "research/play-market-research.json").read_text())
    markets = {m["locale"]: m for m in research["markets"]}
    records, errors = {}, []
    for locale, old in editorial.items():
        short, management = overrides[locale]
        play_locale = LOCALES.get(locale, locale)
        paragraphs = old["description"].split("\n\n")
        purchase_index = next(i for i, p in enumerate(paragraphs) if "Apple" in p)
        purchase = paragraphs[purchase_index]
        # Drop Apple-specific sentences, retaining localized offer transparency.
        purchase = " ".join(s for s in re.split(r"(?<=[.!?。।])\s*", purchase) if "Apple" not in s).strip()
        if locale == "th":
            purchase = "การซื้อภายในแอปเป็นทางเลือก\nแอปมีตัวเลือกการซื้อ โดยแสดงคุณสมบัติ ระยะเวลา และราคาก่อนซื้อ แผนที่นำโฆษณาของแอปออกไม่สามารถนำโฆษณาในรายการของสถานีออกได้"
        paragraphs[purchase_index] = purchase + " " + management
        mobile = old["platform"]["IOS"].split("\n", 1)[1]
        mobile = mobile.replace("Bu mobil özellikler iPhone ve iPad deneyimine aittir. ", "")
        paragraphs.insert(purchase_index, "ANDROID\n" + mobile)
        full = "\n\n".join(paragraphs)
        title = NAMES.get(locale, old["name"])
        record = dict(title=title, shortDescription=short, fullDescription=full,
                      editorialSourceLocale=locale,
                      intentPhrases=[markets[play_locale]["query"], *markets[play_locale]["editorialIntentPhrases"]],
                      researchSource=markets[play_locale]["queryUrl"])
        for field, limit in [("title", 30), ("shortDescription", 80), ("fullDescription", 4000)]:
            if not record[field] or count(record[field]) > limit:
                errors.append(f"{play_locale}/{field}: {count(record[field])}, maximum {limit}")
        if not title.startswith("MegaRadio"):
            errors.append(f"{play_locale}: brand changed")
        if re.search(r"Apple|iPhone|iPad|App Store|TestFlight", full, re.I):
            errors.append(f"{play_locale}: Apple-only text remains")
        if "error" in markets[play_locale] or not markets[play_locale].get("results"):
            errors.append(f"{play_locale}: research unavailable")
        records[play_locale] = record
    extra_research = json.loads((ROOT / "research/play-existing-extra-markets.json").read_text())
    for locale, record in json.loads((ROOT / "play-existing-extra-copy.json").read_text()).items():
        market = next(m for m in extra_research if m["locale"] == locale)
        record["intentPhrases"] = [market["query"], *market["editorialIntentPhrases"]]
        record["researchSource"] = market["queryUrl"]
        records[locale] = record
    # Play Console uses these legacy locale identifiers in the existing listing.
    for old, new in {"he-IL": "iw-IL", "ms": "ms-MY"}.items():
        records[new] = records.pop(old)
    expansions = json.loads((ROOT / "description-expansions.json").read_text())
    for locale, expansion in expansions.items():
        marker = "\n\nANDROID\n"
        full = records[locale]["fullDescription"]
        if marker in full:
            full = full.replace(marker, "\n\n" + expansion + marker, 1)
        else:
            full += "\n\n" + expansion
        records[locale]["fullDescription"] = full
    titles = {
        "tr-TR": "MegaRadio: Canlı Radyo Dinle",
        "en-US": "MegaRadio: Live FM & AM Radio",
        "en-GB": "MegaRadio: UK & World Radio",
        "en-AU": "MegaRadio: Australian Radio",
        "fr-CA": "MegaRadio: Radio du Québec",
    }
    for locale, title in titles.items():
        records[locale]["title"] = title
    for locale, record in records.items():
        for field, limit in [("title", 30), ("shortDescription", 80), ("fullDescription", 4000)]:
            if count(record[field]) > limit:
                errors.append(f"{locale}/{field}: {count(record[field])}, maximum {limit}")
    payload = dict(status="DRAFT — 51 supported Play locales; Android device validation pending",
                   limitation="Intent evidence is based on localized public listings, not measured search volume. Google Play has no separate keywords field.",
                   consoleLocaleAliases=PLAY_CONSOLE_ALIASES,
                   unsupportedPreparedLocales=sorted(UNSUPPORTED_PLAY_LOCALES),
                   locales=records)
    (ROOT / "play-copy-draft.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    existing = json.loads((ROOT / "validation/play-console-baseline.json").read_text())["existingLocales"]
    upload = [{"language": locale, **{field: records[locale][field] for field in
               ("title", "shortDescription", "fullDescription")}} for locale in existing]
    (ROOT / "play-existing-listings-import.json").write_text(json.dumps(upload, ensure_ascii=False, indent=2) + "\n")
    expanded = [{"language": PLAY_CONSOLE_ALIASES.get(locale, locale), **{field: record[field] for field in
                ("title", "shortDescription", "fullDescription")}} for locale, record in records.items()
                if locale not in UNSUPPORTED_PLAY_LOCALES]
    (ROOT / "play-all-listings-import.json").write_text(json.dumps(expanded, ensure_ascii=False, indent=2) + "\n")
    validation = dict(locales=len(records), supportedPlayLocales=len(expanded),
                      unsupportedPreparedLocales=sorted(UNSUPPORTED_PLAY_LOCALES), errors=errors,
                      lengths={k: {f:count(v[f]) for f in ("title", "shortDescription", "fullDescription")} for k,v in records.items()})
    (ROOT / "validation/copy-draft-validation.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(dict(locales=len(records), errors=errors), ensure_ascii=False))
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(prepare())
