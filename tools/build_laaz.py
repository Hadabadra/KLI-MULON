"""בונה את data/laaz.js מ"אוצר לעזי רש"י" (ד"ר משה קטן, CC-BY-SA) — דרך ה-API של ספריא.
הרצה: python3 tools/build_laaz.py  (גם עינים למקרא משתמש בפלט — ר' שם _עבודה/scripts)."""
import json, re, time, urllib.request, urllib.parse
idx = json.load(urllib.request.urlopen("https://www.sefaria.org/api/v2/raw/index/Otzar_La'azei_Rashi", timeout=60))
rows = []
for sec in idx['schema']['nodes']:
    S = sec['titles'][0]['text']
    for n in sec['nodes']:
        en = [x['text'] for x in n['titles'] if x.get('primary') and x['lang'] == 'en'][0]
        ref = f"Otzar La'azei Rashi, {S}, {en}"
        for _ in range(4):
            try:
                j = json.load(urllib.request.urlopen('https://www.sefaria.org/api/v3/texts/' + urllib.parse.quote(ref) + '?version=hebrew', timeout=90)); break
            except Exception:
                time.sleep(5)
        for t in j['versions'][0]['text']:
            m = re.match(r'\s*(\d+)\s*/\s*\(([^)]*)\)\s*/\s*<b>(.*?)</b>\s*<br>\s*(.*?)<br>', t + '<br>', re.S)
            if not m: continue
            num, r, lemma, rest = m.groups()
            p = [x.strip() for x in re.split(r'\s*/\s*', rest, maxsplit=2)]
            note = re.search(r'<small>(.*?)</small>', t, re.S)
            rows.append([num, r, re.sub(r'<[^>]+>', '', lemma).strip(), p[0], p[1] if len(p) > 1 else '',
                         re.sub(r'<[^>]+>', '', p[2]).strip() if len(p) > 2 else '', re.sub(r'<[^>]+>', '', note.group(1)).strip() if note else ''])
out = []
for num, ref, lemma, heb, lat, mean, note in rows:
    if not lemma: continue
    d = 'בלע"ז ' + heb + (' (' + lat + ')' if lat else '') + (' — ' + mean if mean else '')
    if note and len(note) <= 160: d += '. ' + note
    out.append([lemma, d, 'אוצר לעזי רש"י (ד"ר משה קטן) — רש"י ' + ref + ", מס' " + num])
open('data/laaz.js', 'w').write('/* אוצר לעזי רש"י, ד"ר משה קטן (CC-BY-SA) — דרך ספריא. נוצר ע"י tools/build_laaz.py */\nwindow.KK_LAAZ=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(out))
