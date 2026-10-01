from pathlib import Path
import json,re
R=Path(__file__).resolve().parent.parent;p=R/'copy.json';c=json.loads(p.read_text())
extra={
 'tr':'slow,nostalji,müzik', 'de-DE':'schlager,rock,musik','en-US':'music,oldies,listen',
 'en-GB':'music,oldies,dance','en-AU':'music,oldies,dance','en-CA':'music,canada,indie,oldies',
 'fr-FR':'chanson,musique','fr-CA':'musique,pop,rock','es-ES':'música,voz','es-MX':'ranchera,cumbia','pt-PT':'fado,música','pt-BR':'mpb,música,pop',
 'it':'musica,voci','nl-NL':'muziek,pop','sv':'dansband,retro,kanaler','no':'retro,country,lytt','da':'rock,musik,retro','fi':'iskelmä,musiikki',
 'pl':'muzyka,retro','cs':'hudba,retro,folk','sk':'hudba,folk','hu':'zene,retro','ro':'muzică,pop,clasică','hr':'glazba,pjesme','sl':'glasba,rock',
 'el':'έντεχνα,μουσική,ποπ','ru':'музыка,ретро,каналы','uk':'музика,народна,пісні','ca':'música',
 'ja':'音楽,洋楽,邦楽,トーク,選局,生放送,海外,番組,インディー,電子音楽',
 'zh-Hant':'華語,粵語,歌曲,談話,節目,演唱者,電子,放鬆,懷舊,本地,搖滾樂,音訊,選台,直播收音機',
 'zh-Hans':'歌曲,音乐,谈话,节目,歌手,电子,怀旧,本地,国际广播,选台,音频,华语,外语,直播收音机',
 'ko':'음악,노래,채널,청취,토크,아티스트,선곡,생방송,현지,국제,록음악,전자음악',
 'ar-SA':'موسيقى,أغاني,طرب,برامج,محلي',
 'he':'מוזיקה,שירים,תוכניות,ערוצים',
 'id':'musik,lagu,klasik','ms':'muzik,lagu,popular','th':'เพลง,ลูกกรุง,หมอลำ,ดนตรี,ช่อง',
 'vi':'âm nhạc,ca khúc,kênh','hi':'संगीत,शास्त्रीय,लोकगीत,प्रसारण',
 'bn':'লোকগান,শাস্ত্রীয়,সম্প্রচার,শিল্পী','gu':'સંગીત,લોકગીત,શાસ્ત્રીય,પ્રસારણ','kn':'ಸಂಗೀತ,ಜನಪದ,ಶಾಸ್ತ್ರೀಯ,ಪ್ರಸಾರ',
 'ml':'സംഗീതം,നാടൻപാട്ട്,പ്രക്ഷേപണം','mr':'संगीत,लोकगीत,शास्त्रीय,प्रसारण','or':'ସଙ୍ଗୀତ,ଲୋକଗୀତ,ଶାସ୍ତ୍ରୀୟ,ପ୍ରସାରଣ',
 'pa':'ਸੰਗੀਤ,ਲੋਕਗੀਤ,ਪ੍ਰਸਾਰਣ,ਕਲਾਕਾਰ','ta':'இசை,தமிழகம்,நாட்டுப்புறம்,கலைஞர்','te':'జానపదం,కళాకారుడు,ప్రసారం,శాస్త్రీయ','ur':'موسیقی,غزل,لوک,فنکار,پروگرام'
}
assert set(extra)==set(c)
log=[]
for loc,a in c.items():
 before=a['keywords'];known=set(re.findall(r'\w+',a['name'].casefold()+' '+a['subtitle'].casefold()))
 # Remove exact indexed words only; retain meaningful compounds and regional variants.
 tokens=[x for x in before.split(',') if x.casefold() not in known]
 for x in extra[loc].split(','):
  if x.casefold() in known or x.casefold() in [t.casefold() for t in tokens]:continue
  candidate=','.join(tokens+[x])
  if len(candidate)<=100:tokens.append(x)
 a['keywords']=','.join(tokens)
 assert len(a['keywords'])<=100
 log.append({'locale':loc,'before':before,'after':a['keywords'],'characters':len(a['keywords'])})
p.write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n')
(R/'validation'/'keyword-refinement.json').write_text(json.dumps(log,ensure_ascii=False,indent=2)+'\n')
print('50 keyword fields checked; exact indexed-word duplicates removed; relevant local genre vocabulary added')
