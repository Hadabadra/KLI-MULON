"""2.1.0: כל צורות המילים שבתנ"ך — כל מילה כפי שהיא מופיעה בפסוק (בכל נטייה, בניין וגזרה) נעשית ערך קיים.

מקור: ספריית אוצריא (github.com/Otzaria/otzaria-library), extraBooks/SefariaToOtzria/sefaria_export/ספרים/אוצריא/תנך
(תורה, נביאים, כתובים — 39 ספרים, בלי "הערות על").
תוצר: data/forms.js
  window.KK_FORMS = "צורה~מנוקדת~מספר~מקום|..."   — צורה ללא ניקוד, צורה מנוקדת (הראשונה שנמצאה, בלי טעמים),
                                                   מספר מופעים, מקום ראשון ("בראשית 23 19").
מילה הכתובה עם מקף נחלקת למילים; כל צורה נשמרת כמו שהיא (עם אותיות השימוש) — "קברתי", "וגפנו", "האביונה".

שימוש: python tools/build_forms.py <נתיב לתיקיית תנך בספריית אוצריא>
"""
import os, re, sys, json, collections

ORDER = ["תורה/בראשית", "תורה/שמות", "תורה/ויקרא", "תורה/במדבר", "תורה/דברים",
         "נביאים/יהושע", "נביאים/שופטים", "נביאים/שמואל א", "נביאים/שמואל ב", "נביאים/מלכים א", "נביאים/מלכים ב",
         "נביאים/ישעיהו", "נביאים/ירמיהו", "נביאים/יחזקאל", "נביאים/הושע", "נביאים/יואל", "נביאים/עמוס", "נביאים/עובדיה",
         "נביאים/יונה", "נביאים/מיכה", "נביאים/נחום", "נביאים/חבקוק", "נביאים/צפניה", "נביאים/חגי", "נביאים/זכריה", "נביאים/מלאכי",
         "כתובים/תהילים", "כתובים/משלי", "כתובים/איוב", "כתובים/שיר השירים", "כתובים/רות", "כתובים/איכה", "כתובים/קהלת",
         "כתובים/אסתר", "כתובים/דניאל", "כתובים/עזרא", "כתובים/נחמיה", "כתובים/דברי הימים א", "כתובים/דברי הימים ב"]
TAAM = re.compile(r"[֑-ֽ֯׀׃׆͏]")
NIK = re.compile(r"[֑-ׇ͏]")
HEB = re.compile(r"[^א-תְ-ׇּׁׂ]")


def heb(n):
    out = ""
    for v, l in ((100, "ק"), (90, "צ"), (80, "פ"), (70, "ע"), (60, "ס"), (50, "נ"), (40, "מ"), (30, "ל"), (20, "כ"), (10, "י")):
        while n >= v: out += l; n -= v
    out += " אבגדהוזחט"[n].strip()
    return out.replace("יה", "טו").replace("יו", "טז")


def main(root):
    cnt, voc, first = collections.Counter(), {}, {}
    for b in ORDER:
        p = os.path.join(root, b + ".txt")
        name = b.split("/")[1]
        chap = 0
        for line in open(p, encoding="utf-8"):
            m = re.match(r"<h2>פרק (\S+)", line)
            if m: chap += 1; continue
            m = re.match(r"\((\S+?)\)\s*(.*)", line)
            if not m: continue
            verse, txt = m.group(1), re.sub(r"<[^>]+>|&\w+;|\[[^\]]*\]|\{[^}]*\}", " ", m.group(2))
            for tok in re.split(r"[\s־׀|]+", txt):
                v = HEB.sub("", TAAM.sub("", tok))
                n = NIK.sub("", v)
                if len(n) < 1: continue
                cnt[n] += 1
                if n not in voc: voc[n] = v; first[n] = f"{name} {heb(chap)} {verse}"
    out = "|".join(f"{n}~{voc[n]}~{cnt[n]}~{first[n]}" for n in sorted(cnt))
    open("data/forms.js", "w", encoding="utf-8").write(
        "/* כל צורות המילים בתנ\"ך (מספריית אוצריא) — tools/build_forms.py */\nwindow.KK_FORMS=" + json.dumps(out, ensure_ascii=False) + ";\n")
    print(len(cnt), "צורות,", sum(cnt.values()), "מילים")


if __name__ == "__main__":
    main(sys.argv[1])
