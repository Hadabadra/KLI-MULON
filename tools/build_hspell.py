"""2.1.0: כל הצורות העבריות בכל הנטיות, מתוך המילון המורפולוגי Hspell (נדב הראל ודן קנייגסברג, רישיון AGPL-3.0).
לכל צורה: ערך הבסיס (הלמה) ופירוק — חלק דיבר, מין, מספר, גוף, זמן, כינוי. הצורות נוצרו לפי כללי הדקדוק.

שלבים (Linux):
  apt-get install hspell
  python tools/build_hspell.py dump      # מפענח את hebrew.wgz לרשימת מילים, ומריץ את tools/hspell_dump.c (linginfo)
  python tools/build_hspell.py build     # → data/hspell.js
פורמט: window.KK_HS = {d:[תיאורים], w:"צורה\tבסיס:מספר-תיאור,...|..."}; "=" במקום בסיס זהה לצורה.
"""
import gzip, re, sys, os, subprocess, json
TMP = os.environ.get("TMPDIR", "/tmp")
WL, INFO = os.path.join(TMP, "hs8.txt"), os.path.join(TMP, "hsinfo.txt")

def dump():
    raw = gzip.open("/usr/share/hspell/hebrew.wgz").read().decode("iso-8859-8")
    words, cur = [], ""
    for m in re.finditer(r"(\d+)|(\D+)", raw):
        if m.group(1): words.append(cur); n = int(m.group(1)); cur = cur[:len(cur) - n] if n else cur
        else: cur += m.group(2)
    words.append(cur)
    open(WL, "w", encoding="iso-8859-8").write("\n".join(w for w in words if w) + "\n")
    exe = os.path.join(TMP, "hspell_dump")
    subprocess.run(["gcc", "tools/hspell_dump.c", "-o", exe, "-lhspell", "-lz"], check=True)
    with open(WL, "rb") as i, open(INFO, "wb") as o: o.write(subprocess.run([exe], stdin=i, capture_output=True, check=True).stdout)

def build():
    descs, idx, out = [], {}, []
    for line in open(INFO, encoding="iso-8859-8"):
        f = line.rstrip("\n").split("\t"); w = f[0]
        if not re.fullmatch(r'[א-ת"\']+', w): continue
        an = []
        for a in f[1:]:
            st, _, d = a.partition("=")
            if d not in idx: idx[d] = len(descs); descs.append(d)
            s = f"{'=' if st == w else st}:{idx[d]}"
            if s not in an: an.append(s)
        out.append(w + "\t" + ",".join(an))
    open("data/hspell.js", "w", encoding="utf-8").write(
        "/* Hspell (AGPL-3.0, hspell.ivrix.org.il) — כל הצורות העבריות, בסיס ופירוק. tools/build_hspell.py */\nwindow.KK_HS=" +
        json.dumps({"d": descs, "w": "|".join(out)}, ensure_ascii=False) + ";\n")
    print(len(out), "צורות,", len(descs), "תיאורים")

{"dump": dump, "build": build}[sys.argv[1]]()
