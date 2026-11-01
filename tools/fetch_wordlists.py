"""אוסף רשימות שמות ערכים (רק שמות המילים — לא ההגדרות ולא תוכן הערכים) ממילונים חיצוניים,
כדי שהקישור החיצוני בתוסף יפתח את הערך עצמו רק כשהמילה קיימת שם, ואחרת יפנה לחיפוש.

מקורות ותוצרים:
  wikt     ויקימילון — dumps.wikimedia.org/hewiktionary/latest/hewiktionary-latest-all-titles-in-ns0.gz
           (קובץ כותרות רשמי של ויקימדיה, CC BY-SA). רק כותרות עבריות: אותיות א–ת, רווח, גרש/גרשיים.
           → data/wikt.js   window.KK_WIKT="מילה|מילה|..."
           קישור: https://he.wiktionary.org/wiki/<כותרת>
  academy  האקדמיה ללשון — מאגר המונחים terms.hebrew-academy.org.il. השמות והמזהים נלקחים ממפת האתר
           הרשמית (sitemap.xml → sitemaps/sitemap_NNNN.xml), שכל שורה בה היא
           https://terms.hebrew-academy.org.il/munnah/<מזהה>_1/<המונח המנוקד>. לא נשאב אף דף מונח.
           הכתובת נקבעת לפי המזהה בלבד (המילה שבסוף היא תיאורית); כשלמילה כמה מזהים (משמעויות/
           מילונים שונים) נשמר הקטן ביותר. ברירת המחדל: רק מונחים שהם מילה עברית אחת (ההיקף כולל
           מאות אלפי כתובות); --multiword מוסיף גם צירופים.
           → data/academy.js  window.KK_ACADEMY={"מילה":מזהה,...}   (המפתח ללא ניקוד)
           קישור: https://terms.hebrew-academy.org.il/munnah/<מזהה>_1/<מילה>
           חיפוש (גיבוי): https://terms.hebrew-academy.org.il/?Filter.SearchString=<מילה>
  milog    מילוג — מפת האתר הרשמית (sitemap_index.xml → sitemap_N.txt.gz), שורות מהצורה
           https://milog.co.il/<מילה>  ו-https://milog.co.il/<מילה>/e_<מזהה>. נאספות רק מילים שיש
           להן ערך (e_). הדף https://milog.co.il/<מילה> מציג את כל הערכים של המילה (גם הומוגרפים),
           ולכן די ברשימת מילים. צירופים נכתבים שם עם _ במקום רווח. ברירת מחדל: מילה אחת בלבד.
           → data/milog.js   window.KK_MILOG="מילה|מילה|..."
           קישור: https://milog.co.il/<מילה, רווח→_>
  even     אבן שושן — ניסיון בלבד (האתר לא היה נגיש מסביבת הפיתוח, והמילון מסחרי במנוי). הכלי מחפש
           מפת אתר (robots.txt → Sitemap:, sitemap.xml, sitemap_index.xml); אם נמצאה, נשמרות כל
           הכתובות לקובץ גולמי לבדיקה ידנית (--raw), ונבנה data/even.js
           window.KK_EVEN={"מילה":"נתיב",...} רק מכתובות שהקטע האחרון בהן הוא מילה עברית.
           אין שאיבת דפי ערכים. אם אין מפת אתר — לא נכתב קובץ, והתוסף ממשיך להעתיק את המילה ולפתוח
           את דף הבית (כמו היום).

נימוס: כל הבקשות עוברות דרך מגביל קצב אחד (ברירת מחדל 5 בקשות לשנייה, --rate), עם User-Agent מזהה,
ניסיון חוזר עם המתנה הולכת וגדלה, ובלי בקשות מקבילות. robots.txt של שלושת האתרים (נבדק 28.10.2026)
אינו חוסם את מפות האתר.

שימוש (מתיקיית השורש של הריפו):
  python tools/fetch_wordlists.py                  # כל המקורות
  python tools/fetch_wordlists.py wikt milog       # רק חלק
  python tools/fetch_wordlists.py academy --multiword --rate 3
  python tools/fetch_wordlists.py even --raw even-urls.txt
דורש Python 3.8+ בלבד (ספרייה סטנדרטית). מכבד HTTPS_PROXY מהסביבה.
"""
import urllib.parse
import argparse, gzip, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "kli-mulon-wordlist/2.0 (Otzaria plugin; titles only; +https://github.com/)"
HEB = "א-ת"
NIQQUD = re.compile("[֑-ׇ]")  # טעמים, ניקוד, מקף עליון, נקודות — לא אותיות
ONE_WORD = re.compile(f"[{HEB}]+")
WORDS = re.compile(f"[{HEB}]+(?: [{HEB}]+)*")
WIKT_OK = re.compile(f"[{HEB}\"'׳״ ]+")  # כמו ב-1.10.0: אותיות, רווח, גרש וגרשיים

class Fetcher:
    def __init__(self, rate):
        self.gap = 1.0 / rate if rate > 0 else 0
        self.last = 0.0
        self.count = 0

    def get(self, url, tries=4):
        for i in range(tries):
            wait = self.last + self.gap - time.monotonic()
            if wait > 0:
                time.sleep(wait)
            self.last = time.monotonic()
            self.count += 1
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Encoding": "identity"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    return r.read()
            except urllib.error.HTTPError as e:
                if e.code in (403, 404, 410) or i == tries - 1:
                    raise
            except (urllib.error.URLError, TimeoutError, ConnectionError):
                if i == tries - 1:
                    raise
            time.sleep(2 ** i)

def strip(w):
    return NIQQUD.sub("", w)

def sitemap_locs(f, url):
    """מחזיר את כל ה-<loc> במפת אתר (XML / XML.gz / טקסט, כולל sitemapindex מקונן)."""
    data = f.get(url)
    if url.endswith(".gz") or data[:2] == b"\x1f\x8b":
        data = gzip.decompress(data)
    text = data.decode("utf-8", "replace").lstrip("﻿")
    if not text.lstrip().startswith("<"):
        return [l.strip() for l in text.splitlines() if l.strip().startswith("http")]
    root = ET.fromstring(text.encode("utf-8"))
    locs = [e.text.strip() for e in root.iter() if e.tag.endswith("loc") and e.text]
    if root.tag.endswith("sitemapindex"):
        out = []
        for i, sub in enumerate(locs, 1):
            print(f"  sitemap {i}/{len(locs)}", end="\r", file=sys.stderr)
            try:
                out += sitemap_locs(f, sub)
            except Exception as e:  # מפה פגומה אחת לא מפילה את הכול
                print(f"\n  ! {sub}: {e}", file=sys.stderr)
        print(file=sys.stderr)
        return out
    return locs

def write_js(name, var, value, note):
    path = os.path.join(ROOT, "data", name)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(f"/* {note} */\nwindow.{var}={json.dumps(value, ensure_ascii=False, separators=(',', ':'))};\n")
    print(f"  → data/{name}: {os.path.getsize(path):,} bytes", file=sys.stderr)

def do_wikt(f, a):
    url = "https://dumps.wikimedia.org/hewiktionary/latest/hewiktionary-latest-all-titles-in-ns0.gz"
    lines = gzip.decompress(f.get(url)).decode("utf-8").splitlines()
    titles = set()
    for t in lines[1:] if lines and lines[0] == "page_title" else lines:
        t = t.replace("_", " ").strip()
        if WIKT_OK.fullmatch(t) and re.search(f"[{HEB}]", t):
            titles.add(t)
    print(f"  wikt: {len(lines):,} כותרות, {len(titles):,} עבריות", file=sys.stderr)
    write_js("wikt.js", "KK_WIKT", "|".join(sorted(titles)),
             f"כותרות ערכי ויקימילון העברי (CC BY-SA) מ-dumps.wikimedia.org — לקישור ישיר לערך. {time.strftime('%Y-%m-%d')}, tools/fetch_wordlists.py")

def do_academy(f, a):
    locs = sitemap_locs(f, "https://terms.hebrew-academy.org.il/sitemap.xml")
    best, total = {}, 0
    for u in locs:
        m = re.match(r"https?://terms\.hebrew-academy\.org\.il/munnah/(\d+)_\d+/(.+)$", u)
        if not m:
            continue
        total += 1
        w = strip(urllib.parse.unquote(m.group(2))).replace("-", " ").replace("־", " ").strip()
        w = re.sub(r"\s+", " ", w)
        if not (WORDS if a.multiword else ONE_WORD).fullmatch(w):
            continue
        i = int(m.group(1))
        if w not in best or i < best[w]:
            best[w] = i
    print(f"  academy: {len(locs):,} כתובות, {total:,} מונחים, {len(best):,} מילים ייחודיות", file=sys.stderr)
    write_js("academy.js", "KK_ACADEMY", dict(sorted(best.items())),
             f"שמות מונחי האקדמיה ללשון העברית ומזהיהם (ממפת האתר בלבד, ללא הגדרות) — לקישור terms.hebrew-academy.org.il/munnah/<מזהה>_1. {time.strftime('%Y-%m-%d')}, tools/fetch_wordlists.py")

def do_milog(f, a):
    locs = sitemap_locs(f, "https://milog.co.il/sitemap_index.xml")
    words = set()
    for u in locs:
        p = urllib.parse.unquote(u).split("/")
        if len(p) >= 5 and p[2].endswith("milog.co.il") and re.fullmatch(r"e_\d+", p[4]):
            w = p[3].replace("_", " ").strip()
            if (WORDS if a.multiword else ONE_WORD).fullmatch(w):
                words.add(w)
    print(f"  milog: {len(locs):,} כתובות, {len(words):,} מילים עם ערך", file=sys.stderr)
    write_js("milog.js", "KK_MILOG", "|".join(sorted(words)),
             f"שמות הערכים במילוג (ממפת האתר בלבד, ללא הגדרות) — לקישור milog.co.il/<מילה>. {time.strftime('%Y-%m-%d')}, tools/fetch_wordlists.py")

def do_even(f, a):
    base = "https://www.even-shoshan.co.il"
    cands = []
    try:
        robots = f.get(base + "/robots.txt").decode("utf-8", "replace")
        cands += [l.split(":", 1)[1].strip() for l in robots.splitlines() if l.lower().startswith("sitemap:")]
    except Exception as e:
        print(f"  even: robots.txt — {e}", file=sys.stderr)
    cands += [base + "/sitemap.xml", base + "/sitemap_index.xml", base + "/wp-sitemap.xml"]
    locs = []
    for c in dict.fromkeys(cands):
        try:
            locs = sitemap_locs(f, c)
            if locs:
                print(f"  even: מפת אתר {c} — {len(locs):,} כתובות", file=sys.stderr)
                break
        except Exception as e:
            print(f"  even: {c} — {e}", file=sys.stderr)
    if not locs:
        print("  even: לא נמצאה מפת אתר; לא נכתב קובץ (התוסף ממשיך עם העתקה + דף הבית).", file=sys.stderr)
        return
    if a.raw:
        with open(a.raw, "w", encoding="utf-8") as fh:
            fh.write("\n".join(urllib.parse.unquote(u) for u in locs))
        print(f"  even: הכתובות הגולמיות נשמרו ב-{a.raw} לבדיקה", file=sys.stderr)
    out = {}
    for u in locs:
        path = urllib.parse.urlsplit(u).path
        last = strip(urllib.parse.unquote(path.rstrip("/").rsplit("/", 1)[-1])).replace("-", " ").replace("_", " ").strip()
        if ONE_WORD.fullmatch(last) and last not in out:
            out[last] = path
    if not out:
        print("  even: בכתובות אין מילים עבריות — יש לבדוק את הקובץ הגולמי ולהתאים את הכלי.", file=sys.stderr)
        return
    print(f"  even: {len(out):,} מילים", file=sys.stderr)
    write_js("even.js", "KK_EVEN", dict(sorted(out.items())),
             f"שמות ערכי אבן שושן ונתיביהם (ממפת האתר בלבד, ללא תוכן) — לקישור {base}<נתיב>. {time.strftime('%Y-%m-%d')}, tools/fetch_wordlists.py")

LOAZ_LANGS = ["יוונית", "לטינית", "ערבית", "פרסית", "אנגלית", "צרפתית", "גרמנית", "רוסית", "יידיש", "איטלקית", "ספרדית", "טורקית", "פולנית", "הולנדית", "אכדית", "סנסקריט", "פורטוגזית", "יפנית", "סינית", "הונגרית", "רומנית", "לדינו", "אמהרית", "מצרית"]
LOAZ_HINT = re.compile("מקור|שאול|שאולות|מוצא|גיזרון|לועז|נשאל")
def do_loaz(f, a):
    """2.5.3: מילים לועזיות שנכנסו לעברית — לפי קטגוריות המקור בוויקימילון (API). ארמית אינה נחשבת לועזית."""
    api = "https://he.wiktionary.org/w/api.php?format=json&formatversion=2&action=query&"
    def jget(q):  # API של ויקימדיה: איטי ומנומס — בקשה כל 2 שניות, ובשגיאת 429 המתנה לפי Retry-After
        for i in range(8):
            time.sleep(2)
            try:
                req = urllib.request.Request(api + q + "&maxlag=5", headers={"User-Agent": UA + " (loanwords list for an Otzaria plugin; low rate)", "Accept-Encoding": "identity"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    f.count += 1; return json.loads(r.read())
            except urllib.error.HTTPError as e:
                if e.code != 429 and e.code < 500: raise
                w = int(e.headers.get("Retry-After") or 0) or 30 * (i + 1); print(f"  loaz: {e.code}, ממתין {w} שניות", file=sys.stderr); time.sleep(w)
        raise RuntimeError("ויקימילון לא זמין כרגע (429)")
    cats, cont = [], ""
    while True:
        j = jget("list=allcategories&aclimit=500&acmin=3" + cont)
        cats += [c["category"] for c in j["query"]["allcategories"]]
        if "continue" not in j: break
        cont = "&accontinue=" + urllib.parse.quote(j["continue"]["accontinue"])
    pick = [(c, l) for c in cats for l in LOAZ_LANGS if l in c and LOAZ_HINT.search(c) and "ארמית" not in c]
    print(f"  loaz: {len(cats):,} קטגוריות, {len(pick)} קטגוריות מקור לועזי", file=sys.stderr)
    with open(os.path.join(ROOT, "docs", "loaz-categories.txt"), "w", encoding="utf-8") as fh:
        fh.write("# קטגוריות ויקימילון שנבחרו כמקור לועזי (נוצר ע\"י tools/fetch_wordlists.py loaz)\n" + "\n".join(f"{c}\t{l}" for c, l in pick) + "\n")
    out = {}
    for c, lang in pick:
        cont = ""
        while True:
            j = jget("list=categorymembers&cmnamespace=0&cmlimit=500&cmtitle=" + urllib.parse.quote("קטגוריה:" + c) + cont)
            for m in j["query"]["categorymembers"]:
                t = m["title"].strip()
                if " " in t or not WIKT_OK.fullmatch(t) or len(strip(t)) < 2: continue
                ls = out.setdefault(t, [])
                if lang not in ls: ls.append(lang)
            if "continue" not in j: break
            cont = "&cmcontinue=" + urllib.parse.quote(j["continue"]["cmcontinue"])
    print(f"  loaz: {len(out):,} מילים", file=sys.stderr)
    if not out: raise RuntimeError("לא נמצאו מילים — לבדוק את docs/loaz-categories.txt")
    write_js("loaz.js", "KK_LOAZ", {k: ",".join(v) for k, v in sorted(out.items())},
             "מילים לועזיות שנכנסו לעברית ושפת המקור, לפי קטגוריות המקור בוויקימילון (CC BY-SA). נוצר ע\"י tools/fetch_wordlists.py loaz")

SOURCES = {"loaz": do_loaz, "wikt": do_wikt, "academy": do_academy, "milog": do_milog, "even": do_even}

def main():
    ap = argparse.ArgumentParser(description="רשימות שמות ערכים ממילונים חיצוניים (ראו בראש הקובץ)")
    ap.add_argument("sources", nargs="*", help="wikt / academy / milog / even (ברירת מחדל: הכול)")
    ap.add_argument("--rate", type=float, default=5, help="מקסימום בקשות לשנייה (ברירת מחדל 5)")
    ap.add_argument("--multiword", action="store_true", help="לכלול גם צירופים (אקדמיה, מילוג)")
    ap.add_argument("--raw", help="אבן שושן: קובץ לשמירת כל כתובות מפת האתר")
    a = ap.parse_args()
    bad = [s for s in a.sources if s not in SOURCES]
    if bad:
        ap.error("מקור לא מוכר: " + ", ".join(bad))
    f = Fetcher(a.rate)
    failed = []
    for s in a.sources or list(SOURCES):
        print(f"[{s}]", file=sys.stderr)
        try:
            SOURCES[s](f, a)
        except Exception as e:
            print(f"  ! {s} נכשל: {e}", file=sys.stderr)
            failed.append(s)
    print(f"סה\"כ {f.count} בקשות.", file=sys.stderr)
    sys.exit(1 if failed and len(failed) == len(a.sources or SOURCES) else 0)

if __name__ == "__main__":
    main()
