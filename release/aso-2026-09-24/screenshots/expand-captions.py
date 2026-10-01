from pathlib import Path
import json
R=Path(__file__).resolve().parent
c=json.loads((R/'captions.json').read_text())
# Individually written feature captions. Native interface strings remain actual app UI.
rows='''tr|Canlı yayına kulak ver|Tarzına göre keşfet|Araç modu|Birlikte yeni radyolar keşfet|Dünyadan sesler
de-DE|Dein Radio. Jetzt live.|Musik für deinen Geschmack|Radio im Auto|Gemeinsam Neues entdecken|Sender aus aller Welt
en-US|Your station, live|Find your kind of music|Radio in car mode|Discover through people|Explore radio worldwide
en-GB|Tune in to your day|A genre for every mood|Radio in car mode|Discover more together|Radio beyond borders
en-AU|Your radio, wherever you are|Find your next sound|Radio in car mode|Share the discovery|From Australia to the world
en-CA|Tune in, coast to coast|Find a sound you love|Radio in car mode|Discover with others|Local voices. World radio.
fr-FR|Votre radio, en direct|À chaque envie, sa musique|Le mode voiture|Partagez vos découvertes|Les radios du monde
fr-CA|Vos radios, en direct|De la musique à votre goût|Le mode voiture|Des découvertes à partager|Du Québec au monde entier
es-ES|Tu radio, en directo|Encuentra tu estilo|Modo coche|Descubre con otras personas|Emisoras sin fronteras
es-MX|Tu estación, en vivo|El ritmo que va contigo|Modo auto|Descubre con más personas|De México al mundo
pt-PT|A tua rádio, em direto|Encontra o teu estilo|Modo de condução|Partilha descobertas|Rádios de todo o mundo
pt-BR|Sua rádio, ao vivo|Encontre seu ritmo|Modo carro|Descubra com outras pessoas|Do Brasil para o mundo
it|La tua radio, in diretta|La musica che ti somiglia|Modalità auto|Scoperte da condividere|Radio da tutto il mondo
nl-NL|Jouw radio, nu live|Muziek die bij je past|Radio in automodus|Samen meer ontdekken|Zenders over de grens
sv|Din radio, direkt|Hitta din musikstil|Radio i billäge|Upptäck tillsammans|Kanaler från hela världen
no|Din radio, direkte|Finn musikken du liker|Radio i bilmodus|Oppdag mer sammen|Kanaler fra hele verden
da|Din radio, direkte|Find din musikstil|Radio i biltilstand|Gå på opdagelse sammen|Kanaler fra hele verden
fi|Oma radiosi suorana|Löydä oma musiikkisi|Radion autotila|Löydä uutta yhdessä|Kanavia ympäri maailman
pl|Twoje radio na żywo|Muzyka w Twoim stylu|Tryb samochodowy|Odkrywajcie razem|Stacje z całego świata
cs|Vaše rádio živě|Hudba podle vašeho vkusu|Režim do auta|Objevujte společně|Stanice z celého světa
sk|Vaše rádio naživo|Hudba podľa vášho vkusu|Režim do auta|Objavujte spoločne|Stanice z celého sveta
hu|A rádiód, élőben|Zene a te ízlésed szerint|Autós mód|Fedezzétek fel együtt|Adók a világ minden tájáról
ro|Radioul tău, în direct|Muzică pe gustul tău|Modul auto|Descoperiți împreună|Posturi din întreaga lume
hr|Vaš radio uživo|Glazba po vašem ukusu|Način za automobil|Otkrivajte zajedno|Postaje iz cijelog svijeta
el|Το ραδιόφωνό σου, ζωντανά|Μουσική για κάθε διάθεση|Λειτουργία αυτοκινήτου|Ανακαλύψτε μαζί|Σταθμοί από όλο τον κόσμο
ru|Ваше радио в прямом эфире|Музыка на ваш вкус|Режим в автомобиле|Открывайте новое вместе|Радиостанции со всего мира
uk|Ваше радіо наживо|Музика на ваш смак|Режим для автомобіля|Відкривайте нове разом|Радіостанції з усього світу
ca|La teva ràdio, en directe|La música que va amb tu|Mode cotxe|Descobriu plegats|Emissores d’arreu del món
ar-SA|راديوك على الهواء مباشرة|موسيقى تناسب ذوقك|وضع السيارة|اكتشفوا محطات جديدة معًا|محطات من حول العالم
he|הרדיו שלך בשידור חי|מוזיקה שמתאימה לך|מצב רכב|מגלים תחנות ביחד|תחנות מכל העולם
ja|好きなラジオをライブで|気分に合うジャンルを発見|車内向けの再生画面|みんなのラジオを発見|世界の放送局へ
zh-Hans|喜欢的电台，实时收听|发现合你口味的音乐|车载播放模式|一起发现好电台|聆听世界各地的声音
zh-Hant|喜歡的電台，即時收聽|找到合你口味的音樂|車用播放模式|一起發現好電台|聽見世界各地的聲音
ko|좋아하는 방송을 실시간으로|내 취향에 맞는 음악|차량용 재생 화면|함께 찾는 새로운 방송|세계의 라디오를 만나세요
id|Radio pilihanmu, langsung|Musik sesuai seleramu|Mode mobil|Temukan bersama teman|Jelajahi radio dunia
ms|Radio pilihan anda, langsung|Muzik mengikut cita rasa|Mod kereta|Temui bersama rakan|Terokai radio seluruh dunia
th|สถานีที่ชอบ ฟังสดได้เลย|ค้นหาเพลงในแนวที่ใช่|โหมดในรถ|ค้นพบสถานีไปด้วยกัน|เปิดโลกสถานีวิทยุ
vi|Đài yêu thích, phát trực tiếp|Âm nhạc đúng gu của bạn|Chế độ ô tô|Cùng khám phá đài mới|Nghe radio khắp thế giới
hi|आपका रेडियो, सीधे प्रसारण में|अपनी पसंद का संगीत खोजें|कार मोड|साथ मिलकर नए स्टेशन खोजें|दुनिया भर की आवाज़ें
bn|আপনার রেডিও, সরাসরি|নিজের পছন্দের সুর খুঁজুন|গাড়ি মোড|একসঙ্গে নতুন স্টেশন খুঁজুন|বিশ্বজুড়ে রেডিও শুনুন
gu|તમારો રેડિયો, લાઇવ|તમારી પસંદનું સંગીત શોધો|કાર મોડ|સાથે નવા સ્ટેશન શોધો|વિશ્વભરના અવાજો
kn|ನಿಮ್ಮ ರೇಡಿಯೋ, ನೇರ ಪ್ರಸಾರ|ನಿಮ್ಮ ಅಭಿರುಚಿಯ ಸಂಗೀತ|ಕಾರ್ ಮೋಡ್|ಒಟ್ಟಿಗೆ ಹೊಸ ನಿಲ್ದಾಣಗಳನ್ನು ಹುಡುಕಿ|ಜಗತ್ತಿನ ಧ್ವನಿಗಳನ್ನು ಕೇಳಿ
ml|നിങ്ങളുടെ റേഡിയോ തത്സമയം|ഇഷ്ടമുള്ള സംഗീതം കണ്ടെത്തൂ|കാർ മോഡ്|ഒരുമിച്ച് പുതിയ നിലയങ്ങൾ കണ്ടെത്തൂ|ലോകത്തിന്റെ ശബ്ദങ്ങൾ കേൾക്കൂ
mr|तुमचा रेडिओ, थेट प्रसारण|आवडीचे संगीत शोधा|कार मोड|मिळून नवी केंद्रे शोधा|जगभरातील आवाज ऐका
or|ଆପଣଙ୍କ ରେଡିଓ, ସିଧା ପ୍ରସାରଣ|ପସନ୍ଦର ସଙ୍ଗୀତ ଖୋଜନ୍ତୁ|କାର୍ ମୋଡ୍|ମିଶି ନୂଆ ଷ୍ଟେସନ୍ ଖୋଜନ୍ତୁ|ସାରା ବିଶ୍ୱର ସ୍ୱର ଶୁଣନ୍ତୁ
pa|ਤੁਹਾਡਾ ਰੇਡੀਓ, ਸਿੱਧਾ ਪ੍ਰਸਾਰਣ|ਆਪਣੀ ਪਸੰਦ ਦਾ ਸੰਗੀਤ ਲੱਭੋ|ਕਾਰ ਮੋਡ|ਮਿਲ ਕੇ ਨਵੇਂ ਸਟੇਸ਼ਨ ਲੱਭੋ|ਦੁਨੀਆ ਭਰ ਦੀਆਂ ਆਵਾਜ਼ਾਂ ਸੁਣੋ
ta|உங்கள் வானொலி நேரலையில்|உங்கள் விருப்ப இசையைத் தேடுங்கள்|கார் பயன்முறை|சேர்ந்து புதிய நிலையங்களைக் கண்டறியுங்கள்|உலகின் குரல்களைக் கேளுங்கள்
te|మీ రేడియో ప్రత్యక్ష ప్రసారంలో|మీకు నచ్చిన సంగీతం కనుగొనండి|కార్ మోడ్|కలిసి కొత్త స్టేషన్లను కనుగొనండి|ప్రపంచ స్వరాలను వినండి
ur|آپ کا ریڈیو، براہ راست|اپنی پسند کی موسیقی تلاش کریں|کار موڈ|مل کر نئے اسٹیشن دریافت کریں|دنیا بھر کی آوازیں سنیں
sl|Vaš radio v živo|Glasba po vašem okusu|Način za avto|Odkrivajte skupaj|Postaje z vsega sveta'''
for row in rows.splitlines():
 loc,player,genres,car,social,country=row.split('|')
 sub=c[loc]['discover'][1]
 c[loc].update(player=[player,sub],genres=[genres,sub],car=[car,c[loc]['favorites'][1]],social=[social,c[loc]['favorites'][1]],country=[country,sub])
assert all(len(x)==7 for x in c.values())
(R/'captions.json').write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n')
print(len(c),'locales; 7 themes')
