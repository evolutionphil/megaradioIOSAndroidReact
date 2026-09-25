"""Build captions for eight genuine shared TV/desktop feature captures."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
base = json.loads((HERE / 'phone-screenshot-captions.json').read_text())
apple = json.loads((HERE.parent / 'aso-2026-09-24/screenshots/captions.json').read_text())
locale_map = dict(zip(
    'tr-TR it-IT ru-RU ja-JP zh-TW ar es-419 sv-SE no-NO da-DK fi-FI pl-PL cs-CZ sk-SK hu-HU ro-RO hr-HR el-GR zh-CN ko-KR hi-IN bn-BD kn-IN ml-IN mr-IN ta-IN te-IN sl-SI iw-IL ms-MY'.split(),
    'tr it ru ja zh-Hant ar-SA es-MX sv no da fi pl cs sk hu ro hr el zh-Hans ko hi bn kn ml mr ta te sl he ms'.split()))
# Separate feature captions, written in each listing's language.
rows = '''
en-US|Rock radio, your way|Explore stations by music genre|Drift off to the radio|Choose when playback stops
en-GB|Find your rock station|Browse stations by music genre|Radio for winding down|Set a timer to stop playback
en-AU|Rock stations to discover|Find a station for your music taste|Unwind with the radio|Choose when your listening ends
en-CA|Discover more rock radio|Browse stations by music genre|Settle in with a sleep timer|Choose when playback stops
tr-TR|Rock radyolarını keşfet|Müzik zevkine göre istasyonları gez|Radyo eşliğinde uykuya dal|Yayının ne zaman duracağını seç
de-DE|Rockradio für deinen Geschmack|Sender nach Musikrichtung entdecken|Mit Radio einschlafen|Wiedergabe zeitgesteuert beenden
fr-FR|Le rock à la radio|Explorez les stations par genre musical|Endormez-vous en musique|Choisissez quand arrêter la lecture
fr-CA|Découvrez des radios rock|Parcourez les stations par style musical|La radio pour vous détendre|Réglez l’arrêt automatique de la lecture
es-ES|Descubre emisoras de rock|Explora la radio por género musical|Duérmete con la radio|Elige cuándo detener la reproducción
es-419|Encuentra tu estación de rock|Explora radios por género musical|Descansa escuchando radio|Programa cuándo se detiene el audio
it-IT|Scopri le radio rock|Esplora le stazioni per genere musicale|Addormentati con la radio|Scegli quando interrompere l’ascolto
pt-PT|Descobre rádios de rock|Explora estações por género musical|Adormece a ouvir rádio|Escolhe quando parar a reprodução
pt-BR|Encontre sua rádio de rock|Explore estações por estilo musical|Relaxe ouvindo rádio|Programe quando o áudio deve parar
ru-RU|Откройте рок-радиостанции|Ищите станции по музыкальным жанрам|Засыпайте под радио|Выберите время остановки воспроизведения
ja-JP|ロックのラジオ局を発見|音楽ジャンルから放送局を探す|ラジオと一緒におやすみ|再生を止める時間を設定
zh-TW|探索搖滾電台|依音樂類型尋找喜愛的電台|伴著廣播入睡|設定自動停止播放的時間
zh-HK|發掘搖滾電台|按音樂類型尋找心愛電台|聽着廣播放鬆入睡|設定自動停止播放時間
zh-CN|发现摇滚电台|按音乐类型寻找喜欢的电台|伴着广播入睡|设置自动停止播放的时间
ar|اكتشف إذاعات الروك|تصفّح المحطات حسب النوع الموسيقي|استرخِ مع مؤقّت النوم|اختر وقت إيقاف التشغيل
nl-NL|Ontdek rockzenders|Blader door zenders per muziekgenre|Val in slaap met de radio|Kies wanneer het afspelen stopt
sv-SE|Upptäck rockstationer|Bläddra bland stationer efter musikstil|Somna till radion|Välj när uppspelningen ska sluta
no-NO|Oppdag rockestasjoner|Bla gjennom stasjoner etter musikksjanger|Sov til lyden av radio|Velg når avspillingen skal stoppe
da-DK|Find din rockstation|Udforsk stationer efter musikgenre|Fald i søvn til radioen|Vælg hvornår afspilningen stopper
fi-FI|Löydä rockradiokanavia|Selaa kanavia musiikkilajin mukaan|Nukahda radion ääreen|Valitse toiston lopetusaika
pl-PL|Odkryj stacje rockowe|Przeglądaj radio według gatunku muzyki|Zasypiaj przy radiu|Ustaw czas zakończenia odtwarzania
cs-CZ|Objevte rocková rádia|Procházejte stanice podle hudebního žánru|Usínejte s rádiem|Vyberte čas zastavení přehrávání
sk-SK|Objavte rockové rádiá|Prehliadajte stanice podľa hudobného žánru|Zaspávajte pri rádiu|Nastavte čas zastavenia prehrávania
hu-HU|Fedezz fel rockrádiókat|Böngéssz zenei műfajok szerint|Aludj el rádió mellett|Állítsd be a lejátszás leállítását
ro-RO|Descoperă posturi rock|Explorează radiouri după genul muzical|Adormi ascultând radio|Alege când se oprește redarea
hr-HR|Otkrij rock postaje|Pregledaj postaje prema glazbenom žanru|Zaspi uz radio|Odaberi kada reprodukcija prestaje
el-GR|Ανακάλυψε ροκ σταθμούς|Βρες ραδιόφωνα ανά είδος μουσικής|Αποκοιμήσου με ραδιόφωνο|Επίλεξε πότε θα σταματήσει η αναπαραγωγή
uk|Відкривайте рок-радіостанції|Шукайте станції за музичним жанром|Засинайте під радіо|Виберіть час зупинки відтворення
ca|Descobreix emissores de rock|Explora la ràdio per gènere musical|Adorm-te amb la ràdio|Tria quan s’atura la reproducció
ko-KR|록 라디오를 찾아보세요|음악 장르별로 방송국 탐색|라디오와 함께 편안한 잠|재생을 멈출 시간을 설정하세요
id|Temukan radio rock|Jelajahi stasiun menurut genre musik|Tidur ditemani radio|Atur kapan pemutaran berhenti
th|ค้นพบสถานีเพลงร็อก|เลือกฟังสถานีตามแนวเพลง|หลับสบายไปกับวิทยุ|ตั้งเวลาให้หยุดเล่นโดยอัตโนมัติ
vi|Khám phá đài nhạc rock|Tìm đài theo thể loại âm nhạc|Thư giãn cùng hẹn giờ ngủ|Chọn thời điểm dừng phát
hi-IN|रॉक रेडियो खोजें|संगीत की शैली के अनुसार स्टेशन देखें|रेडियो सुनते हुए सोएँ|प्लेबैक बंद होने का समय चुनें
bn-BD|রক রেডিও খুঁজে নিন|গানের ধরন অনুযায়ী স্টেশন দেখুন|রেডিও শুনতে শুনতে ঘুমিয়ে পড়ুন|কখন বাজানো বন্ধ হবে বেছে নিন
gu|રૉક રેડિયો શોધો|સંગીતના પ્રકાર પ્રમાણે સ્ટેશનો જુઓ|રેડિયો સાંભળતાં આરામ કરો|પ્લેબેક બંધ થવાનો સમય પસંદ કરો
kn-IN|ರಾಕ್ ರೇಡಿಯೊಗಳನ್ನು ಅನ್ವೇಷಿಸಿ|ಸಂಗೀತದ ಪ್ರಕಾರಕ್ಕೆ ತಕ್ಕಂತೆ ಕೇಂದ್ರಗಳನ್ನು ಹುಡುಕಿ|ರೇಡಿಯೊ ಕೇಳುತ್ತಾ ನಿದ್ರಿಸಿ|ಪ್ಲೇಬ್ಯಾಕ್ ನಿಲ್ಲುವ ಸಮಯ ಆಯ್ಕೆಮಾಡಿ
ml-IN|റോക്ക് റേഡിയോ കണ്ടെത്തൂ|സംഗീത വിഭാഗമനുസരിച്ച് നിലയങ്ങൾ തിരയൂ|റേഡിയോ കേട്ടുറങ്ങൂ|പ്ലേബാക്ക് നിർത്തേണ്ട സമയം തിരഞ്ഞെടുക്കൂ
mr-IN|रॉक रेडिओ शोधा|संगीत प्रकारानुसार स्टेशन्स पाहा|रेडिओ ऐकत झोपी जा|प्लेबॅक थांबण्याची वेळ निवडा
pa|ਰੌਕ ਰੇਡੀਓ ਲੱਭੋ|ਸੰਗੀਤ ਦੀ ਕਿਸਮ ਮੁਤਾਬਕ ਸਟੇਸ਼ਨ ਵੇਖੋ|ਰੇਡੀਓ ਸੁਣਦਿਆਂ ਸੌਂ ਜਾਓ|ਪਲੇਬੈਕ ਰੁਕਣ ਦਾ ਸਮਾਂ ਚੁਣੋ
ta-IN|ராக் வானொலிகளைக் கண்டறியுங்கள்|இசை வகைக்கேற்ப நிலையங்களைத் தேடுங்கள்|வானொலி கேட்டபடி உறங்குங்கள்|ஒலிபரப்பு நிற்கும் நேரத்தைத் தேர்ந்தெடுங்கள்
te-IN|రాక్ రేడియోలను కనుగొనండి|సంగీత రకాన్ని బట్టి స్టేషన్లను చూడండి|రేడియో వింటూ నిద్రపోండి|ప్లేబ్యాక్ ఆగే సమయాన్ని ఎంచుకోండి
ur|راک ریڈیو تلاش کریں|موسیقی کی صنف کے مطابق اسٹیشن دیکھیں|ریڈیو سنتے ہوئے سو جائیں|پلے بیک بند ہونے کا وقت چنیں
sl-SI|Odkrij rock postaje|Brskaj po postajah glede na glasbeno zvrst|Zaspi ob radiu|Izberi čas zaustavitve predvajanja
bg|Открийте рок радиостанции|Разглеждайте станции по музикален жанр|Заспивайте с радио|Изберете кога да спре възпроизвеждането
iw-IL|גלו תחנות רוק|חפשו תחנות לפי סגנון מוזיקלי|הירדמו לצלילי הרדיו|בחרו מתי ההשמעה תיפסק
ms-MY|Terokai radio rock|Cari stesen mengikut genre muzik|Rehat sambil mendengar radio|Tetapkan masa main balik berhenti
'''
extras = {a: (b, c, d, e) for a, b, c, d, e in (r.split('|') for r in rows.strip().splitlines())}
assert extras.keys() == base.keys()
for locale, captions in base.items():
    rock_title, rock_body, sleep_title, sleep_body = extras[locale]
    captions['rock-stations'] = [rock_title, rock_body]
    captions['sleep-timer'] = [sleep_title, sleep_body]
    key = locale_map.get(locale, locale)
    if locale == 'zh-HK':
        captions['favorites'] = ['珍藏喜愛的電台', '隨時輕鬆重聽心愛頻道']
    elif locale == 'bg':
        captions['favorites'] = ['Любимите ви радиостанции', 'Лесен достъп до любимите станции']
    else:
        captions['favorites'] = apple[key]['favorites']
(HERE / 'large-screen-captions.json').write_text(json.dumps(base, ensure_ascii=False, indent=2) + '\n')
print(f'Prepared eight-feature captions for {len(base)} locales')
