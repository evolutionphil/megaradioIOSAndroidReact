#!/usr/bin/env python3
"""Read public Google Play listings; never accesses the authenticated console.

Search snapshots are research evidence, not search-volume or ranking estimates.
Only short title/summary excerpts and public metrics are retained for competitors.
"""
import concurrent.futures
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse

import requests
from bs4 import BeautifulSoup
from google_play_scraper import app, search

ROOT = Path(__file__).resolve().parent
COMPETITORS = [
    "com.streema.simpleradio", "de.radio.android", "tunein.player",
    "com.appgeneration.itunerfree", "com.hv.replaio", "com.ilv.vradio",
    "com.radio.fmradio", "com.audials", "com.jonathanpuckey.radiogarden",
    "com.finallevel.radiobox",
]
# Independently selected local intent phrases; final scope follows Play Console.
MARKETS = [
    ("tr-TR", "tr", "tr", "canlı radyo dinle", ["Türkçe radyo", "türkü", "arabesk", "haber"]),
    ("de-DE", "de", "de", "Radio hören Webradio", ["Internetradio", "Radiosender", "Schlager", "Nachrichten"]),
    ("de-AT", "de", "at", "Radio Österreich live", ["österreichische Radiosender", "Webradio", "Austropop"]),
    ("de-CH", "de", "ch", "Schweizer Radio hören", ["Schweizer Radiosender", "Internetradio", "Nachrichten"]),
    ("en-US", "en", "us", "live radio stations", ["local radio", "talk radio", "country music", "FM radio"]),
    ("en-GB", "en", "gb", "UK radio live", ["British radio", "live stations", "news radio", "internet radio"]),
    ("en-AU", "en", "au", "Australian radio stations", ["local radio", "talkback", "live radio", "online radio"]),
    ("en-CA", "en", "ca", "Canada radio live", ["Canadian radio", "local stations", "country radio", "news"]),
    ("fr-FR", "fr", "fr", "radio en direct", ["écouter la radio", "radios françaises", "webradio", "actualités"]),
    ("fr-CA", "fr", "ca", "radio Québec en direct", ["radios québécoises", "radio francophone", "chansons", "nouvelles"]),
    ("es-ES", "es", "es", "radio España en directo", ["emisoras", "escuchar radio", "noticias", "radio online"]),
    ("es-419", "es", "mx", "radio México en vivo", ["emisoras mexicanas", "radio en línea", "regional mexicano", "noticias"]),
    ("it-IT", "it", "it", "radio italiane in diretta", ["ascolta radio", "radio online", "musica italiana", "notizie"]),
    ("pt-PT", "pt", "pt", "rádio Portugal em direto", ["rádios portuguesas", "ouvir rádio", "fado", "notícias"]),
    ("pt-BR", "pt", "br", "rádio ao vivo", ["rádios brasileiras", "rádio online", "sertanejo", "MPB"]),
    ("ru-RU", "ru", "ru", "слушать радио онлайн", ["радиостанции", "прямой эфир", "музыка", "новости"]),
    ("ja-JP", "ja", "jp", "ラジオ インターネット", ["ネットラジオ", "ラジオ局", "音楽", "ニュース"]),
    ("zh-TW", "zh-TW", "tw", "線上廣播電台", ["聽廣播", "台灣電台", "音樂", "新聞"]),
    ("zh-CN", "zh-CN", "sg", "在线收音机", ["网络电台", "广播直播", "音乐", "新闻"]),
    ("ko-KR", "ko", "kr", "인터넷 라디오", ["실시간 라디오", "라디오 방송", "음악", "뉴스"]),
    ("he-IL", "iw", "il", "רדיו ישראל בשידור חי", ["תחנות רדיו", "רדיו באינטרנט", "מוזיקה", "חדשות"]),
    ("ar", "ar", "sa", "راديو بث مباشر", ["إذاعات عربية", "راديو أون لاين", "أخبار", "موسيقى"]),
    ("nl-NL", "nl", "nl", "radio luisteren", ["Nederlandse radio", "online radio", "radiozenders", "nieuws"]),
    ("sv-SE", "sv", "se", "lyssna på radio", ["svensk radio", "webbradio", "radiokanaler", "nyheter"]),
    ("no-NO", "no", "no", "norsk radio direkte", ["nettradio", "radiokanaler", "lytt til radio", "nyheter"]),
    ("da-DK", "da", "dk", "dansk radio live", ["netradio", "lyt til radio", "radiokanaler", "nyheder"]),
    ("fi-FI", "fi", "fi", "nettiradio Suomi", ["kuuntele radiota", "radiokanavat", "suomalainen radio", "uutiset"]),
    ("pl-PL", "pl", "pl", "radio internetowe", ["polskie radio", "radio online", "słuchaj radia", "wiadomości"]),
    ("cs-CZ", "cs", "cz", "česká rádia online", ["internetové rádio", "poslech rádia", "rádiové stanice", "zprávy"]),
    ("sk-SK", "sk", "sk", "slovenské rádiá online", ["internetové rádio", "počúvať rádio", "rádiové stanice", "správy"]),
    ("hu-HU", "hu", "hu", "magyar rádió online", ["rádióhallgatás", "internetes rádió", "rádióállomások", "hírek"]),
    ("ro-RO", "ro", "ro", "radio România online", ["radio live", "posturi radio", "ascultă radio", "știri"]),
    ("hr-HR", "hr", "hr", "hrvatski radio uživo", ["radio postaje", "slušaj radio", "online radio", "vijesti"]),
    ("el-GR", "el", "gr", "ελληνικό ραδιόφωνο live", ["ραδιοφωνικοί σταθμοί", "ραδιόφωνο online", "μουσική", "ειδήσεις"]),
    ("uk", "uk", "ua", "українське радіо онлайн", ["слухати радіо", "радіостанції", "прямий ефір", "новини"]),
    ("ca", "ca", "es", "ràdio en català", ["escoltar ràdio", "emissores", "ràdio en directe", "notícies"]),
    ("id", "id", "id", "radio Indonesia online", ["dengarkan radio", "radio streaming", "radio lokal", "dangdut"]),
    ("ms", "ms", "my", "radio Malaysia online", ["dengar radio", "siaran langsung", "stesen radio", "berita"]),
    ("th", "th", "th", "ฟังวิทยุออนไลน์", ["วิทยุไทย", "สถานีวิทยุ", "เพลงลูกทุ่ง", "ข่าว"]),
    ("vi", "vi", "vn", "nghe radio trực tuyến", ["đài phát thanh", "radio Việt Nam", "âm nhạc", "tin tức"]),
    ("hi-IN", "hi", "in", "हिंदी रेडियो लाइव", ["ऑनलाइन रेडियो", "रेडियो सुनें", "बॉलीवुड", "समाचार"]),
    ("bn-BD", "bn", "bd", "বাংলা রেডিও লাইভ", ["অনলাইন রেডিও", "রেডিও শুনুন", "বাংলা গান", "খবর"]),
    ("gu", "gu", "in", "ગુજરાતી રેડિયો", ["રેડિયો સાંભળો", "ઓનલાઇન રેડિયો", "ગુજરાતી ગીતો", "સમાચાર"]),
    ("kn-IN", "kn", "in", "ಕನ್ನಡ ರೇಡಿಯೋ", ["ಆನ್‌ಲೈನ್ ರೇಡಿಯೋ", "ರೇಡಿಯೋ ಕೇಳಿ", "ಕನ್ನಡ ಹಾಡುಗಳು", "ಸುದ್ದಿ"]),
    ("ml-IN", "ml", "in", "മലയാളം റേഡിയോ", ["ഓൺലൈൻ റേഡിയോ", "റേഡിയോ കേൾക്കാം", "മലയാള ഗാനങ്ങൾ", "വാർത്തകൾ"]),
    ("mr-IN", "mr", "in", "मराठी रेडिओ", ["ऑनलाइन रेडिओ", "रेडिओ ऐका", "मराठी गाणी", "बातम्या"]),
    ("or", "or", "in", "ଓଡ଼ିଆ ରେଡିଓ", ["ଅନଲାଇନ୍ ରେଡିଓ", "ରେଡିଓ ଶୁଣନ୍ତୁ", "ଓଡ଼ିଆ ଗୀତ", "ଖବର"]),
    ("pa", "pa", "in", "ਪੰਜਾਬੀ ਰੇਡੀਓ", ["ਆਨਲਾਈਨ ਰੇਡੀਓ", "ਰੇਡੀਓ ਸੁਣੋ", "ਪੰਜਾਬੀ ਗੀਤ", "ਖ਼ਬਰਾਂ"]),
    ("ta-IN", "ta", "in", "தமிழ் வானொலி", ["இணைய வானொலி", "தமிழ் ரேடியோ", "தமிழ் பாடல்கள்", "செய்திகள்"]),
    ("te-IN", "te", "in", "తెలుగు రేడియో", ["ఆన్‌లైన్ రేడియో", "రేడియో వినండి", "తెలుగు పాటలు", "వార్తలు"]),
    ("ur", "ur", "pk", "اردو ریڈیو لائیو", ["آن لائن ریڈیو", "پاکستانی ریڈیو", "موسیقی", "خبریں"]),
    ("sl-SI", "sl", "si", "slovenski radio v živo", ["spletni radio", "radijske postaje", "poslušaj radio", "novice"]),
]


def excerpt(data):
    title = data.get("title", "")
    remaining = max(0, 25 - len(title.split()))
    return {"appId": data.get("appId"), "title": title,
            "summaryExcerpt": " ".join(data.get("summary", "").split()[:remaining]),
            "installs": data.get("installs"), "score": data.get("score"),
            "ratings": data.get("ratings"), "url": data.get("url")}


def fetch_competitor(package):
    try:
        data = app(package, lang="en", country="us")
        return excerpt(data)
    except Exception as exc:
        return {"appId": package, "error": str(exc)}


def fetch_market(market):
    locale, lang, country, query, intents = market
    record = dict(locale=locale, language=lang, country=country, query=query,
                  editorialIntentPhrases=intents,
                  queryUrl=f"https://play.google.com/store/search?q={quote(query)}&c=apps&hl={lang}&gl={country}")
    try:
        rows = search(query, n_hits=6, lang=lang, country=country)
        record["results"] = [dict(appId=r.get("appId"), title=r.get("title"),
                                  url=r.get("url"), score=r.get("score")) for r in rows]
    except Exception:
        # EEA search pages currently use a different embedded-data schema.
        # Their public HTML still exposes the same app cards.
        try:
            response = requests.get(record["queryUrl"], timeout=30)
            response.raise_for_status()
            page = BeautifulSoup(response.text, "html.parser")
            results, seen = [], set()
            for link in page.select('a[href*="/store/apps/details?id="]'):
                package = parse_qs(urlparse(link["href"]).query).get("id", [None])[0]
                title = link.select_one(".DdYX5")
                if package in seen or not package or not title:
                    continue
                seen.add(package)
                results.append(dict(appId=package, title=title.get_text(strip=True),
                                    url=f"https://play.google.com/store/apps/details?id={package}&hl={lang}&gl={country}"))
                if len(results) == 6:
                    break
            if not results:
                raise ValueError("No public app cards found")
            record["results"] = results
        except Exception as exc:
            record["error"] = str(exc)
    return record


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        competitors = list(pool.map(fetch_competitor, COMPETITORS))
        markets = list(pool.map(fetch_market, MARKETS))
    payload = dict(collectedAt=datetime.now(timezone.utc).isoformat(),
                   scope="Research candidates; reconcile with existing Play Console locales before delivery.",
                   limitation="Public results do not provide keyword search volume. Order is contextual and is not a rank promise.",
                   competitors=competitors, markets=markets)
    (ROOT / "play-market-research.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(dict(competitors=len(competitors), markets=len(markets),
                         errors=[r for r in competitors + markets if "error" in r]), ensure_ascii=False))
