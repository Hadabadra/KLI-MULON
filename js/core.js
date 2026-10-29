/* ליבה משותפת: נירמול, חיפוש, שורשים, בניינים, דמיון. עובד בדף, ברקע וב-Node. */
(function (g) {
  const NIKUD = /[\u0591-\u05C7]/g;
  const norm = w => String(w || "").replace(NIKUD, "").replace(/[״“”]/g, '"').replace(/[׳‘’]/g, "'")
    .replace(/[^\u05D0-\u05EA"' ]/g, "").trim();
  const F2R = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" }, R2F = { כ: "ך", מ: "ם", נ: "ן", פ: "ף", צ: "ץ" };
  const unfinal = s => s.replace(/[ךםןףץ]/g, c => F2R[c]);
  const refinal = s => s.length ? s.slice(0, -1) + (R2F[s.slice(-1)] || s.slice(-1)) : s;
  /* סינון (דיווחי משתמשים): הגדרות שאינן מתאימות לציבור שומר תורה ומצוות. ראו docs/REPORTS.md */
  const BLOCK_DEF = [["דמי", "זמרת יווניה"]];
  const BLOCK_ENC = /זמר|זמרת|שחקנ|שחקן קולנוע|כדורגל|כדורסל|להקת|סדרת טלוויזיה|סרט |דוגמנ/;
  /* תיקוני הגדרות (דיווחי משתמשים): [ערך, הגדרה שגויה, הגדרה מתוקנת]. ראו docs/REPORTS.md */
  const FIX_DEF = [
    ['אא"ב', "אם אתה אומר בשלום (נניח שמה שאתה אומר ... מתקבל על הדעת, אבל ...)", "אי אמרת בשלמא — אם תאמר: מובן הדבר (אם אתה אומר כך — ניחא, אבל ...)"],
    ["בשלמא", "בשלום", "ניחא, מובן הדבר (בלשון הגמרא: \"בשלמא ... אלא ...\")"],
    ["בשלמא", "בשלום (נניח ש... אפשרי, אבל ... )", "ניחא — נניח ש... מובן, אבל ..."],
    ["עליה", "אוניית מעפילים", "עלייה ממקום נמוך לגבוה; גם: עליית הגג, עלייה לרגל, עלייה לתורה", "עֲלִיָּה"]
  ];
  const fixed = (t, x) => { const f = FIX_DEF.find(([w, d]) => t === w && x[1] === d); return f ? [f[3] !== undefined ? f[3] : x[0], f[2], f[3] !== undefined ? "תיקון התוסף" : x[2]] : x; };
  const blocked = (t, x) => (x[2] === "המכלול" && BLOCK_ENC.test(x[1])) || BLOCK_DEF.some(([w, d]) => t === w && x[1] === d);
  const SUPP = 'בטח שלט כשר עלב רעב זכר חסר דמה פדה קדש נתנ הלכ שתה שוב שנא לבש חזק רעה מצא בקש ארכ מלא שבע עמד יכל לקח יצא ישב קומ בוא שומ שמר ידע ראה עשה שמע פתח למד קרא שלח מות ירד זכר שבר ברכ נהג כנס מלכ פסק דרש עבד ישע ירא אהב ארג בחר גנב הרג חפצ טהר ירש סבב סלח רדפ תפש ברא רפא צמא ברח ברק'.split(' '); /* 2.0: ברא ועוד — חסרו, ולכן "ברא" נותח כ-ראה */
  const PRE = "והבכלמש";
  const PRE2 = new Set("וה וב וכ ול ומ וש שה שב שכ של שמ מה מש כש לכ וכש ולכ ושה ושב ושל ומה".split(" "));
  const SUF = ["תי", "ותיהם", "ותיו", "יהם", "ותי", "ות", "ים", "ין", "תם", "תן", "נו", "כם", "כן", "ה", "י", "ך", "ו", "ם", "ן", "ת"];

  /* 2.1.0: מילות היסוד — מילות יחס, שלילה, קישור, כינויים ותיאורים, שבמאגר חסרו או פורשו שלא כעניינן ("לא" לא זוהתה; "כי" הוצגה כאות יוונית).
     [ניקוד, פירוש]. נכתב בתוסף. */
  const CORE = {};
  for (const [w, nk, d] of [
    ["לא", "לֹא", "מילת שלילה: אין כך, היפך ההן"], ["לו", "לוּ", "מילת תנאי ומשאלה (\"לוּ\"); וגם \"לוֹ\" — ל' עם כינוי הנסתר"], ["אל", "אַל", "\"אַל\" — מילת שלילה לבקשה ולאיסור; \"אֶל\" — מילת יחס: לקראת, לעבר; \"אֵל\" — שם"],
    ["על", "עַל", "מילת יחס: מעל, על גבי; וגם: בעניין, בגלל, אצל"], ["את", "אֶת", "\"אֶת\" — מילת יחס המציינת את המושא הישיר; וגם: עם (\"אִתּוֹ\"); \"אַתְּ\" — כינוי נוכחת"],
    ["כי", "כִּי", "מילת קישור: משום ש־, ש־; וגם: אם, כאשר, אלא, אכן (לפי ההקשר)"], ["אשר", "אֲשֶׁר", "מילת זיקה: ש־, אשר; וגם: כאשר, באופן ש־. \"אָשֵׁר\" — שם השבט"],
    ["אם", "אִם", "מילת תנאי; וגם שאלה (\"האם\") ושבועה. \"אֵם\" — הורה"], ["גם", "גַּם", "מילת תוספת: אף, וכן"], ["אף", "אַף", "מילת תוספת: גם, אפילו; וגם \"אַף\" — חוטם, כעס"],
    ["רק", "רַק", "מילת הגבלה: בלבד, אך"], ["אך", "אַךְ", "מילת הגבלה: רק; וגם הדגשה: אכן, אבל"], ["אבל", "אֲבָל", "\"אֲבָל\" — אכן, אולם; \"אָבֵל\" — מתאבל"],
    ["הנה", "הִנֵּה", "מילת הצבעה והתעוררות: ראה, הרי; וגם \"הֵנָּה\" — לכאן"], ["הן", "הֵן", "\"הֵן\" — הנה, אם; וגם כינוי נסתרות"], ["פן", "פֶּן", "מילת חשש: שמא, שלא"],
    ["בלי", "בְּלִי", "מילת שלילה: לא, בלא"], ["בלתי", "בִּלְתִּי", "מילת שלילה: לבלתי, חוץ מ־"], ["אין", "אֵין", "מילת שלילה: לא קיים, לא יש"], ["אין", "אַיִן", "שלילה"],
    ["יש", "יֵשׁ", "מילת קיום: קיים, ישנו"], ["עוד", "עוֹד", "מילת תוספת והמשך: שוב, עדיין"], ["עד", "עַד", "מילת יחס: עד, לשיעור; וגם \"עֵד\" — מעיד"],
    ["מן", "מִן", "מילת יחס: מתוך, מאת, מ־"], ["עם", "עִם", "\"עִם\" — מילת יחס: יחד; \"עַם\" — אומה"], ["בין", "בֵּין", "מילת יחס: בתוך, בין זה לזה"],
    ["תחת", "תַּחַת", "מילת יחס: מתחת; וגם: במקום, בעבור"], ["אחר", "אַחַר", "\"אַחַר\" — אחרי (זמן ומקום); \"אַחֵר\" — שונה"], ["אחרי", "אַחֲרֵי", "מילת יחס: לאחר, בעקבות"],
    ["לפני", "לִפְנֵי", "מילת יחס: נוכח, לעיני; וגם קודם (זמן)"], ["אצל", "אֵצֶל", "מילת יחס: סמוך ל־"], ["נגד", "נֶגֶד", "מילת יחס: מול, כנגד"], ["כמו", "כְּמוֹ", "מילת דמיון: כ־"],
    ["למען", "לְמַעַן", "מילת תכלית: בעבור, כדי"], ["יען", "יַעַן", "מילת סיבה: משום ש־"], ["לכן", "לָכֵן", "מילת תוצאה: משום כך"], ["עתה", "עַתָּה", "מילת זמן: כעת, עכשיו"],
    ["אז", "אָז", "מילת זמן: בעת ההיא"], ["טרם", "טֶרֶם", "מילת זמן: לפני ש־, עדיין לא"], ["כה", "כֹּה", "מילת הצבעה: כך, כאן"], ["כן", "כֵּן", "\"כֵּן\" — כך, אמת; \"כַּן\" — בסיס"],
    ["פה", "פֹּה", "\"פֹּה\" — כאן; \"פֶּה\" — איבר הדיבור"], ["שם", "שָׁם", "\"שָׁם\" — במקום ההוא; \"שֵׁם\" — כינוי, תואר"], ["איה", "אַיֵּה", "מילת שאלה: היכן"],
    ["איך", "אֵיךְ", "מילת שאלה ותמיהה: באיזה אופן"], ["מה", "מָה", "מילת שאלה ותמיהה"], ["מי", "מִי", "מילת שאלה על אדם"], ["למה", "לָמָּה", "מילת שאלה: מדוע"], ["מדוע", "מַדּוּעַ", "מילת שאלה: למה"],
    ["אנכי", "אָנֹכִי", "כינוי גוף ראשון: אני"], ["אני", "אֲנִי", "כינוי גוף ראשון יחיד"], ["אנחנו", "אֲנַחְנוּ", "כינוי גוף ראשון רבים"], ["אתה", "אַתָּה", "כינוי נוכח יחיד"],
    ["אתם", "אַתֶּם", "כינוי נוכחים"], ["אתן", "אַתֶּן", "כינוי נוכחות"], ["הוא", "הוּא", "כינוי נסתר יחיד"], ["היא", "הִיא", "כינוי נסתרת יחידה"], ["הם", "הֵם", "כינוי נסתרים"], ["המה", "הֵמָּה", "כינוי נסתרים"],
    ["זה", "זֶה", "כינוי רמז לזכר קרוב"], ["זאת", "זֹאת", "כינוי רמז לנקבה קרובה"], ["אלה", "אֵלֶּה", "כינוי רמז לרבים"], ["כל", "כָּל", "מילת כמות: כולו, כל אחד"], ["מאד", "מְאֹד", "מילת הפלגה: הרבה"],
    ["נא", "נָא", "מילת בקשה: בבקשה, עתה"], ["הלא", "הֲלֹא", "שאלה שתשובתה חיובית: והרי"], ["אולי", "אוּלַי", "מילת ספק"], ["פתאם", "פִּתְאֹם", "בלא הכנה, לפתע"], ["יחד", "יַחַד", "ביחד, כאחד"],
    ["ש", "שֶׁ", "אות שימוש: אשר"], ["בעד", "בְּעַד", "מילת יחס: בשביל; וגם: דרך, סביב"], ["לבד", "לְבַד", "בלבד, חוץ מ־"], ["זולת", "זוּלַת", "חוץ מ־"], ["אפס", "אֶפֶס", "\"אֶפֶס\" — אין, רק, אך; וגם קצה"]
  ]) if (!CORE[w]) CORE[w] = [nk, d];
  /* מאגר הצורות: תנ"ך (data/forms.js), Hspell (data/hspell.js), מילוג, ויקימילון, האקדמיה. נטען בעצלות. */
  const HSM = { "ע": "שם עצם", "פ": "פועל", "ת": "שם תואר", "ז": "זכר", "נ": "נקבה", "יחיד": "יחיד", "רבים": "רבים", "זוגי": "זוגי", "1": "גוף ראשון", "2": "גוף שני", "3": "גוף שלישי",
    "עבר": "עבר", "עתיד": "עתיד", "הווה": "הווה", "ציווי": "ציווי", "מקור": "מקור", "סמיכות": "נסמך", "פרטי": "שם פרטי", "x": "", "ב": "מקור נטוי (עם ב')", "ל": "מקור נטוי (עם ל')" };
  function hsText(d) {
    const [main, suf] = d.split("כינוי/"), t = main.split(",").filter(Boolean).map(x => HSM[x] !== undefined ? HSM[x] : x).filter(Boolean);
    if (suf !== undefined) { const p = suf.split(","); t.push("עם כינוי " + [p[1] && HSM[p[1]], p[0] && HSM[p[0]], p[2] && HSM[p[2]]].filter(Boolean).join(" ")); }
    return t.join(", ");
  }
  class Lex {
    constructor(o = {}) { this.o = o; this.hs = null; this.tnk = null; this.mod = null; this.roots = null; }
    _hs() { if (!this.hs) { this.hs = new Map(); const H = this.o.hs; if (H) { this.hsD = H.d.map(hsText); for (const l of (H.w || H.p.join("|")).split("|")) { const t = l.indexOf("\t"); this.hs.set(l.slice(0, t), l.slice(t + 1)); } } } return this.hs; }
    hsGet(w) { const r = this._hs().get(w); if (!r) return null; return r.split(",").map(a => { const i = a.lastIndexOf(":"); return { lemma: a.slice(0, i), m: this.hsD[+a.slice(i + 1)] }; }); }
    _tnk() { if (!this.tnk) { this.tnk = new Map(); for (const l of String(this.o.forms || "").split("|")) { const [n, v, c, ref, root] = l.split("~"); if (n) this.tnk.set(n, { v, c: +c, ref, root: root || "" }); } } return this.tnk; }
    tnkGet(w) { return this._tnk().get(w) || null; }
    byRoot(r) { if (!this.roots) { this.roots = new Map(); for (const [n, x] of this._tnk()) if (x.root) (this.roots.get(x.root) || this.roots.set(x.root, []).get(x.root)).push(n); }
      return (this.roots.get(r) || []).slice().sort((a, b) => this.tnk.get(b).c - this.tnk.get(a).c); }
    known(w) {
      if (!this.mod) { this.mod = new Set(); for (const k of ["milog", "wikt"]) for (const x of String(this.o[k] || "").split("|")) if (x) this.mod.add(x); if (this.o.academy) for (const x of Object.keys(this.o.academy)) this.mod.add(x); }
      return !!(this._tnk().has(w) || this._hs().has(w) || this.mod.has(w));
    }
  }
  class Dict {
    constructor(data) {
      this.map = new Map(); this.keys = []; this.radak = new Set();
      for (const [t, v0] of Object.entries(data)) {
        const n = norm(t); if (!n) continue;
        const v = { ...v0, s: v0.s.filter(x => !blocked(t, x)).map(x => fixed(t, x)) }; if (!v.s.length) continue;
        if (!this.map.has(n)) { this.map.set(n, { title: t, n, ...v }); this.keys.push(n); }
        else this.map.get(n).s.push(...v.s);
      }
      for (const [t, v] of Object.entries(data)) if (v.s.some(x => x[2] === 'ספר השרשים לרד"ק')) this.radak.add(unfinal(norm(t)).replace(/[^\u05D0-\u05EA]/g, ''));
      for (const r of SUPP) this.radak.add(unfinal(r));
      this.keys.sort();
      this.skel = new Map(); this.roots = null; this.known = new Set();
      for (const k of this.keys) {
        const s = skeleton(k); (this.skel.get(s) || this.skel.set(s, []).get(s)).push(k);
        const u = unfinal(k); if (u.length === 3 && !/[ '"]/.test(u)) this.known.add(u);
      }
    }
    get(n) { return this.map.get(n) || (this.vc && this.vc.get(n)) || (this.lex && n && this.lex.known(n) ? this.virtual(n) : null); }
    /* 2.1.0: כל מילה — ערך. מאגר צורות (תנ"ך, Hspell, מילוג, ויקימילון, האקדמיה) ומילות יסוד; צורה שאינה ערך במאגר
       נעשית ערך משלה: הצורה, הפירוק (מין, מספר, גוף, זמן, כינוי), השורש, המקום הראשון בתנ"ך, וערך הבסיס עם פירושיו. */
    useLex(L) { this.lex = L; this.vc = new Map(); return this; }
    lookup(word) {
      const w = norm(word); if (!w || /^[^\u05D0-\u05EA]*$/.test(w)) return null;
      const c = CORE[w]; if (c && !this.vc.has(w)) return this.virtual(w);
      return this.map.get(w) || this.vc.get(w) || this.virtual(w);
    }
    /* פירוק לאות שימוש + מילה: "מעל" = מ + על; "בבננה" = ב + בננה */
    splits(w) {
      w = norm(w); const out = [], L = this.lex;
      for (let i = 1; i <= 3 && w.length - i >= 2; i++) {
        const p = w.slice(0, i); if (i === 1 ? !PRE.includes(p) : !PRE2.has(p)) continue;
        const rest = w.slice(i); if (CORE[rest] || this.map.has(rest) || (L && (L.hsGet(rest) || L.tnkGet(rest)))) out.push({ p, rest });
      }
      return out;
    }
    /* ערכי הבסיס: קודם הבסיס הדקדוקי מ-Hspell (גם אחרי הסרת אותיות שימוש), ואחר כך הסרת סיומות/קידומות במאגר */
    bases(w) {
      const L = this.lex, out = [], seen = new Set([w]);
      const add = (b, m, how) => { b = norm(b); if (!b || seen.has(b)) return; const r = this.map.get(b) || (CORE[b] || (b !== w && b.length < w.length && L && L.known(b)) ? this.virtual(b) : null); if (!r) return; seen.add(b); out.push({ r, m, how }); };
      for (const sp of [{ p: "", rest: w }, ...this.splits(w)]) {
        for (const a of (L ? L.hsGet(sp.rest) : []) || []) add(a.lemma === "=" ? sp.rest : a.lemma, a.m, sp.p ? sp.p + " + " : "");
        if (out.length) break;
      }
      if (!out.length && !(L && L.known(w))) for (const c of this.candidates(w).slice(1)) { const r = this.map.get(c); if (r && !seen.has(c)) { seen.add(c); out.push({ r, m: "", how: "~" }); break; } }
      return out;
    }
    virtual(w) {
      const L = this.lex, real = this.map.get(w), t = L ? L.tnkGet(w) : null, core = CORE[w];
      let hs = L ? L.hsGet(w) : null, pre = ""; if (L && !hs) for (const sp of this.splits(w)) { const h = L.hsGet(sp.rest); if (h) { hs = h; pre = sp.p; break; } }
      let bs0 = core ? [] : this.bases(w);
      if (t && bs0.length > 1) { const end = t.v.slice(-2), f = b => !(end === "\u05D5\u05B9" && /גוף ראשון רבים$/.test(b.m)) && !(/\u05D5\u05BC$/.test(t.v) && /גוף שלישי זכר יחיד$/.test(b.m)); if (bs0.some(f)) bs0 = bs0.filter(f); }
      const bs = bs0, an = this.analyze(w), root = (t && t.root) || (bs[0] && !bs[0].how ? this.analyze(bs[0].r.n).root : an.root);
      const morph = (pre ? hs.map(a => ({ ...a, m: `${pre}' + ${a.m}` })) : t && bs.length && hs ? hs.filter(a => bs.some(b => b.m === a.m) || a.lemma === "=") : hs || []).map(a => a.m).filter((x, i, a) => x && a.indexOf(x) === i);
      const desc = [core ? core[1] : "", morph.length ? morph.join(" / ") : "",
        bs.length ? (bs[0].how === "~" ? `קרוב במאגר: "${bs[0].r.title}" (ייתכן שאינו אותו עניין)` : (bs[0].how && w === bs[0].how.replace(" + ", "") + bs[0].r.n ? `${bs[0].how.replace(" + ", "' + ")}"${bs[0].r.title}"` : (bs[0].how ? `${bs[0].how.replace(" + ", "' + ")}` : "") + `נטייה של "${bs.map(b => b.r.title).filter((x, i, a) => a.indexOf(x) === i).join("\" / \"")}"`)) : "",
        t ? `בתנ"ך ${t.c} פעמים; ראשון: ${t.ref}` : ""].filter(Boolean).join(" · ") || "מילה שאינה במאגר הפירושים";
      const s = [[t ? t.v : (core ? core[0] : ""), desc, core ? "מילות היסוד (התוסף)" : "צורת המילה (התוסף)"]];
      if (real) s.push(...real.s);
      for (const b of bs) for (const x of b.r.s) s.push([x[0], x[1], `${x[2]} · בערך ${b.r.title}`]);
      const v = { title: real ? real.title : refinal(w), n: w, s, l: real ? real.l : [], virtual: !real, form: { t, morph, root, bases: bs, known: !!(t || hs || core || (L && L.known(w))) } };
      if (this.vc) this.vc.set(w, v); return v;
    }
    /* כל צורות השורש בתנ"ך (לקונקורדנציה), לפי מספר המופעים */
    tnkByRoot(root) { return this.lex ? this.lex.byRoot(unfinal(norm(root)).replace(/[^\u05D0-\u05EA]/g, "")) : []; }
    firstRef(w) { const L = this.lex; if (!L) return null; w = norm(w); return L.tnkGet(w) || (this.splits(w).map(x => L.tnkGet(x.rest)).find(Boolean)) || null; }
    /* מילה כפי שבטקסט → ערך. סדר העדפה: פחות הסרות קודם. */
    candidates(word) {
      const w = norm(word), out = [], seen = new Set();
      const add = x => { if (x.length >= 2 && !seen.has(x)) { seen.add(x); out.push(x); } };
      add(w);
      for (let p = 0; p <= 2; p++) {
        if (p > 0 && !(w.length - p >= 3 && PRE.includes(w[p - 1]))) break;
        const b = w.slice(p); add(b);
        for (const s of SUF) if (b.length - s.length >= 2 && b.endsWith(s)) {
          const st = b.slice(0, -s.length); add(st); add(refinal(st));
          if (s === "ות" || s === "ים") { add(st + "ה"); add(st + "ת"); }
        }
      }
      return out;
    }
    find(word) { const w0 = norm(word); if (this.lex && w0 && !w0.includes(" ") && !this.map.has(w0) && (CORE[w0] || this.lex.known(w0))) return this.lookup(w0);
      for (const c of this.candidates(word)) { const r = this.map.get(c); if (r) return r; } return null; }
    /* בחירה של כמה מילים: קודם כביטוי שלם, ואז כל מילה בנפרד; גם מילה חלקית (קידומת) */
    resolve(text, max = 8) {
      const t = norm(text), out = { phrase: null, phrases: [], words: [] };
      if (!t) return out;
      out.phrase = this.lex && !t.includes(" ") ? this.lookup(t) : this.find(t);
      /* ביטויים של כמה מילים בתוך הבחירה (צירופים קבועים, "אי אפשר" וכד'), הארוכים קודם (#3, 1.6.0) */
      const ws = t.split(" ").slice(0, max), used = new Set();
      if (!out.phrase || ws.length < 2) for (let len = Math.min(5, ws.length - (out.phrase ? 1 : 0)); len >= 2; len--) for (let i = 0; i + len <= ws.length; i++) {
        if ([...Array(len).keys()].some(k => used.has(i + k))) continue;
        let span = ws.slice(i, i + len).join(" "), r = this.map.get(span);
        if (!r && /^[והבלמכש]/.test(span) && span.length > 3) r = this.map.get(span.slice(1));     // קידומת: "ובית המקדש"
        if (r) { out.phrases.push(r); for (let k = 0; k < len; k++) used.add(i + k); }
      }
      const seen = new Set();
      for (const w of t.split(" ").slice(0, max)) {
        let r = this.lex ? this.lookup(w) : this.find(w);
        if (!r && w.length >= 3) { const s = this.suggest(w, 12).find(x => x.n.startsWith(w) && !/[ '"]/.test(x.n) && x.n.length <= w.length + 2); if (s) r = s; }
        if (r && !seen.has(r.n)) { seen.add(r.n); out.words.push(r); }
      }
      return out;
    }
    suggest(q, limit = 12) {
      const n = norm(q); if (!n) return [];
      const k = this.keys; let lo = 0, hi = k.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (k[m] < n) lo = m + 1; else hi = m; }
      const res = [];
      for (let i = lo; i < k.length && k[i].startsWith(n) && res.length < limit; i++) res.push(k[i]);
      if (res.length < limit) for (const x of k) { if (res.length >= limit) break; if (!res.includes(x) && x.includes(n)) res.push(x); }
      if (res.length < 3) for (const x of this.similar(n, limit)) if (!res.includes(x)) res.push(x);
      return res.slice(0, limit).map(x => this.map.get(x));
    }
    similar(w, limit = 14) {
      const n = norm(w), out = [], seen = new Set([n]);
      for (const x of this.skel.get(skeleton(n)) || []) if (!seen.has(x)) { seen.add(x); out.push(x); }
      for (const x of this.keys) {
        if (out.length >= limit * 2) break;
        if (Math.abs(x.length - n.length) <= 1 && !seen.has(x) && lev1(x, n)) { seen.add(x); out.push(x); }
      }
      return out.slice(0, limit);
    }
    neighbors(n) {
      const k = this.keys; let lo = 0, hi = k.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (k[m] < n) lo = m + 1; else hi = m; }
      return { prev: k[lo - 1] ? this.map.get(k[lo - 1]) : null, next: k[lo + 1] ? this.map.get(k[lo + 1]) : null };
    }
    /* שורש: מועמדים לפי משקלים ובניינים (פעל, נפעל, הפעיל, התפעל, הופעל, פיעל, בינוני, עתיד),
       כולל שורשים חלשים (ל"ה, ע"ו/ע"י, ע"ע, פ"נ). האימות: קודם מול רשימת השורשים של ספר השרשים לרד"ק, אחר כך מול ערכי המילון. */
    analyze(word) {
      const w = unfinal(norm(word)).replace(/[^\u05D0-\u05EA]/g, "");
      if (!w) return { root: "", binyan: "—", ok: false };
      const ir = IRREG[w]; if (ir) return { root: unfinal(ir[0]), binyan: ir[1], ok: true, src: "rd", alts: (ir[2] || []).map(unfinal) };
      const stems = [[w, 0]];
      for (const s0 of SUF) { const s = unfinal(s0); if (w.length - s.length >= 2 && w.endsWith(s)) { stems.push([w.slice(0, -s.length), 1]); if (s === 'ות' || s === unfinal('ים')) stems.push([w.slice(0, -s.length) + 'ה', 1]); } }
      const all = [];
      for (const [st, c0] of stems) {
        all.push([st, c0]);
        for (let i = 1; i <= 2; i++) if (st.length - i >= 2 && [...st.slice(0, i)].every(ch => "והבכלש".includes(ch))) all.push([st.slice(i), c0 + [...st.slice(0, i)].reduce((t, ch) => t + (ch === "ו" ? 1 : 1.5), 0)]);
      }
      const cands = [];
      for (const [st, c0] of all) for (const [re, pick, label, cost] of TEMPL) {
        const m = re.exec(st); if (!m) continue;
        const r = pick(m); const cc = c0 + cost;
        if (r.length === 3) {
          cands.push([r.join(""), label, cc]); const l = r[2];
          if ("יות".includes(l)) cands.push([r[0] + r[1] + "ה", label + " (ל\"ה)", cc + 0.5]);
          if (r[0] === "ו") cands.push(["י" + r[1] + r[2], label + " (פ\"י)", cc + 0.3]);
        }
        else if (r.length === 2) {
          cands.push([r[0] + r[1] + r[1], label + " (ע\"ע)", cc + 1.4]); cands.push(["נ" + r[0] + r[1], label + " (פ\"נ)", cc + 1.15]);
          cands.push([r[0] + r[1] + "ה", label + " (ל\"ה)", cc + 1.1]); cands.push([r[0] + "ו" + r[1], label + " (ע\"ו)", cc + 1]);
          cands.push(["י" + r[0] + r[1], label + " (פ\"י)", cc + 1.2]); cands.push(["ה" + r[0] + r[1], label + " (הלך)", cc + 1.3]); cands.push(["ל" + r[0] + r[1], label + " (פ\"ל)", cc + 1.3]);
        }
      }
      cands.sort((a, b) => a[2] - b[2]);
      const rd = new Map(), dk = new Map(), put = (mp, r, label, cost) => { if (!mp.has(r) || cost < mp.get(r).cost) mp.set(r, { cost, root: r, binyan: label }); };
      for (const [r, label, cost] of cands) {
        if (this.radak.has(r) && cost <= 3.5) put(rd, r, label, cost); else if (this.known.has(r)) put(dk, r, label, cost);
      }
      if (w.length === 3 && !rd.has(w) && this.known.has(w) && !/^[והבכלמש]/.test(w) && !/[והי]$/.test(w)) put(rd, w, "שם / פעל", -0.1); /* 2.1.0: מילה תלת־אותית שהיא ערך במילון — היא השורש (גפן, בגד) */
      const tier = rd.size ? rd : dk;                   // קודם שורשים מאומתים (רד"ק + רשימה נפוצה), ורק אחר כך כל ערך תלת-אותי במילון
      if (tier.size) {
        const arr = [...tier.values()].sort((a, b) => a.cost - b.cost);
        return { root: arr[0].root, binyan: arr[0].binyan, ok: true, src: rd.size ? "rd" : "dict", alts: arr.slice(1, 3).filter(x => x.cost - arr[0].cost < 1.5).map(x => x.root) };
      }
      const f = cands[0];
      return f ? { root: f[0], binyan: f[1], ok: false } : { root: w.slice(0, 3), binyan: "—", ok: false };
    }
    buildRoots() {
      if (this.roots) return; this.roots = new Map();
      for (const k of this.keys) {
        if (/[ '"]/.test(k) || k.length < 3) continue;
        const a = this.analyze(k); if (!a.ok) continue;
        (this.roots.get(a.root) || this.roots.set(a.root, []).get(a.root)).push(k);
      }
    }
    byRoot(root) {
      this.buildRoots();
      const r = unfinal(norm(root)).replace(/[^\u05D0-\u05EA]/g, "");
      return (this.roots.get(r) || []).map(x => this.map.get(x));
    }
  }
  /* 1.8.1: צורות נפוצות שהשורש שלהן אינו נראה מן הכתב בלי ניקוד (פ"נ בהפעיל, ע"ו, ל"ה מקוצר, שמות ממשקלים חלשים).
     המפתח בלי אותיות סופיות. [שורש, בניין, שורשים חלופיים כשהכתב משמש לשניהם] */
  const IRREG = {};
  for (const [forms, root, bin, alts] of [
    ["מתו מת מתה מתי וימת וימתו", "מות", "קל (ע\"ו)"], ["המית הומת ימות תמות", "מות", "הפעיל / הופעל (ע\"ו)"],
    ["הציל הצילו ויצל להציל מציל", "נצל", "הפעיל (פ\"נ)"], ["הגיד הגידו ויגד להגיד מגיד הוגד", "נגד", "הפעיל / הופעל (פ\"נ)"],
    ["הכיר הכירו ויכר להכיר מכיר", "נכר", "הפעיל (פ\"נ)"], ["הכה הכו ויך ויכו להכות מכה", "נכה", "הפעיל (פ\"נ, ל\"ה)"],
    ["הביט הביטו ויבט להביט", "נבט", "הפעיל (פ\"נ)"], ["הגיע הגיעו ויגע להגיע", "נגע", "הפעיל (פ\"נ)"], ["הפיל הפילו ויפל", "נפל", "הפעיל / קל (פ\"נ)"],
    ["ויתן ויתנו תת לתת", "נתן", "קל (פ\"נ)"], ["ויט ויטו הטה", "נטה", "קל / הפעיל (פ\"נ, ל\"ה)"], ["ויקח ויקחו קח לקחת", "לקח", "קל (ל' כנ')"],
    ["הובא הביא הביאו ויבא ויבאו יבוא תבוא בא באו באה", "בוא", "קל / הפעיל / הופעל (ע\"ו, ל\"א)"],
    ["הוסר הסיר ויסר ויסרו סר סרו", "סור", "הפעיל / הופעל / קל (ע\"ו)"], ["ויקם ויקמו הקים קם קמו", "קום", "קל / הפעיל (ע\"ו)"],
    ["ויעש ויעשו עשו לעשות", "עשה", "קל (ל\"ה)"], ["ויבן ויבנו", "בנה", "קל (ל\"ה)"], ["ויהי ויהיו יהי", "היה", "קל (ל\"ה)"], ["ויעל ויעלו", "עלה", "קל (ל\"ה)"],
    ["וירא ויראו לראות", "ראה", "קל (ל\"ה)", ["ירא"]], ["יראה יראת", "ירא", "שם (יִרְאָה) / קל", ["ראה"]],
    ["ויצא ויצאו הוציא הוציאו יצאו", "יצא", "קל / הפעיל (פ\"י, ל\"א)"],
    ["תפילה תפלה תפילת תפלת תפילות תפלות התפלל ויתפלל", "פלל", "שם (תְּפִלָּה) / התפעל (ע\"ע)"],
    ["מצוה מצות מצוות מצותי מצותיו", "צוה", "שם (מִצְוָה, ל\"ה)"], ["משכן משכנות משכנו", "שכן", "שם (משקל מִקְטָל)"],
    ["נאמן נאמנה נאמנים האמין ויאמן", "אמן", "נפעל / הפעיל"],
    ["בורא בוראך בוראי", "ברא", "בינוני (קל)"], ["ישגלנה ישגלו שגלוני שגלת", "שגל", "קל / פעל (פ\"נ הנראה כפ\"י)"], ["בריאה בראשית", "ברא", "שם"]]) for (const f of forms.split(" ")) IRREG[unfinal(f)] = [root, bin, alts];
  function skeleton(s) { return unfinal(s).replace(/[וי'"]/g, ""); }
  function lev1(a, b) {
    if (a === b) return true; let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
    return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }
  const L = "[\u05D0-\u05EA]";
  const TEMPL = [
    [new RegExp(`^(${L})(${L})(${L})ונ$`), m => [m[1], m[2], m[3]], "שם (משקל קִטָּלוֹן)", -0.6],
    /* 1.8.0: משקלים שזוהו לא נכון (פלוגתא→פלג, מריבה→ריב, למדנות→למד) */
    [new RegExp(`^(${L})(${L})ו(${L})ת[אה]$`), m => [m[1], m[2], m[3]], "שם ארמי (משקל פְּלוּגְתָּא)", -0.7],
    [new RegExp(`^(${L})(${L})(${L})נות$`), m => [m[1], m[2], m[3]], "שם (משקל קַטְלָנוּת)", -0.8],
    [new RegExp(`^מ(${L})י(${L})ה$`), m => [m[1], "י", m[2]], "שם (משקל מְקִימָה, ע\"י)", -0.5],
    [new RegExp(`^מ(${L})ו(${L})ה$`), m => [m[1], "ו", m[2]], "שם (משקל מְנוּחָה, ע\"ו)", -0.3],
    [new RegExp(`^(${L})(${L})ו(${L})$`), m => [m[1], m[2], m[3]], "פעול / עתיד (קל)", 1],
    [new RegExp(`^(${L})(${L})(${L})$`), m => [m[1], m[2], m[3]], "פעל / פיעל", 0],
    [new RegExp(`^נ(${L})(${L})(${L})$`), m => [m[1], m[2], m[3]], "נפעל", 1],
    [new RegExp(`^הת(${L})(${L})(${L})$`), m => [m[1], m[2], m[3]], "התפעל", 1],
    [new RegExp(`^הו(${L})(${L})(${L})$`), m => [m[1], m[2], m[3]], "הופעל", 1],
    [new RegExp(`^הו(${L})י(${L})$`), m => ["י", m[1], m[2]], "הפעיל (פ\"י)", 0.5],
    [new RegExp(`^ת(${L})ו(${L})$`), m => [m[1], "ו", m[2]], "שם פעולה (תפעולה)", 1],
    [new RegExp(`^התיי(${L})(${L})$`), m => ["י", m[1], m[2]], "התפעל (פ\"י)", 0.5],
    [new RegExp(`^ה(${L})י(${L})$`), m => [m[1], "ו", m[2]], "הפעיל (ע\"ו)", 0.8],
    [new RegExp(`^ה(${L})י(${L})$`), m => [m[1], "י", m[2]], "הפעיל (ע\"י)", 0.8],
    [new RegExp(`^ה(${L})י(${L})$`), m => ["נ", m[1], m[2]], "הפעיל (פ\"נ)", 0.9],
    [new RegExp(`^[יתאנ](${L})(${L})ה$`), m => [m[1], m[2], "ה"], "נפעל או עתיד (ל\"ה)", 0.3],
    [new RegExp(`^ת(${L})י(${L})$`), m => [m[1], m[2]], "שם פעולה (תפעילה)", 1],
    [new RegExp(`^ה(${L})(${L})י(${L})$`), m => [m[1], m[2], m[3]], "הפעיל", 1],
    [new RegExp(`^ה(${L})(${L})(${L})$`), m => [m[1], m[2], m[3]], "הפעיל / הפעל", 1.5],
    [new RegExp(`^(${L})י(${L})(${L})$`), m => [m[1], m[2], m[3]], "פיעל / פועל", 1],
    [new RegExp(`^(${L})ו(${L})(${L})$`), m => [m[1], m[2], m[3]], "פועל / בינוני (קל)", 1],
    [new RegExp(`^(${L})(${L})ו(${L})$`), m => [m[1], m[2], m[3]], "פעול / עתיד (קל)", 1],
    [new RegExp(`^(${L})(${L})י(${L})$`), m => [m[1], m[2], m[3]], "פעיל", 1],
    [new RegExp(`^מת(${L})(${L})(${L})$`), m => [m[1], m[2], m[3]], "התפעל (בינוני)", 1],
    [new RegExp(`^מ(${L})(${L})י(${L})$`), m => [m[1], m[2], m[3]], "הפעיל (בינוני)", 1],
    [new RegExp(`^מ(${L})(${L})(${L})$`), m => [m[1], m[2], m[3]], "פיעל (בינוני) / שם משקל מקטל", 1.5],
    [new RegExp(`^נ(${L})(${L})ו(${L})$`), m => [m[1], m[2], m[3]], "נפעל (בינוני)", 1],
    [new RegExp(`^[יתאנ](${L})ו(${L})$`), m => [m[1], m[2]], "עתיד (קל)", 0.5],
    [new RegExp(`^[יתאנ](${L})(${L})ו(${L})$`), m => [m[1], m[2], m[3]], "עתיד (קל)", 1],
    [new RegExp(`^[יתאנ](${L})(${L})(${L})$`), m => [m[1], m[2], m[3]], "עתיד", 1.5],
    [new RegExp(`^ת(${L})(${L})י(${L})$`), m => [m[1], m[2], m[3]], "שם פעולה (תפעיל)", 1.5],
    [new RegExp(`^(${L})ו(${L})$`), m => [m[1], "ו", m[2]], "קל (ע\"ו)", 0.5],
    [new RegExp(`^(${L})י(${L})$`), m => [m[1], "י", m[2]], "קל (ע\"י)", 0.5],
    [new RegExp(`^[יתנ](${L})(${L})$`), m => [m[1], m[2]], "עתיד / נפעל", 1],
    [new RegExp(`^(${L})(${L})$`), m => [m[1], m[2]], "קל", 0.5]
  ];
  /* דירוג הגדרות לפי הקשר: ניקוד, מילים אחרות בבחירה, והעדפת פירוש מילוני על פני ראשי תיבות/אנציקלופדיה */
  const VOW = /[\u05B0-\u05BB\u05C7]/g;
  const vowels = s => (String(s || "").match(VOW) || []).join("");
  const kindOf = src => /ראשי תיבות/.test(src) ? "acr" : /לעזי/.test(src) ? "laaz" : /^המכלול( ·|$)/.test(src) ? "enc" : "lex";
  function rank(r, ctx = {}) {
    const raw = ctx.raw || "", words = (ctx.words || []).map(norm).filter(x => x.length >= 2);
    const vs = vowels(raw), hasQ = /["'״׳]/.test(raw), toks = new Set();
    const items = r.s.map(([nk, d, src], i) => {
      let sc = { lex: 0.4, laaz: 0.1, enc: 0, acr: hasQ ? 0.6 : -0.6 }[kindOf(src)];
      if (vs.length >= 2 && nk) sc += vowels(nk) === vs ? 3 : -0.8;
      const body = norm(d).split(" ");
      for (const w of words) if (w !== r.n && body.some(b => b === w || (b.length > 3 && w.length > 3 && (b.startsWith(w) || w.startsWith(b))))) sc += 1;
      return { i, sc, kind: kindOf(src) };
    });
    items.sort((a, b) => (a.kind === "enc") - (b.kind === "enc") || b.sc - a.sc || a.i - b.i);
    const top = items[0] ? items[0].sc : 0, second = items[1] ? items[1].sc : -9;
    const confident = items.length > 1 && top - second >= 0.95 && top >= 1.2;     // רק כשיש הוכחה מההקשר או מהניקוד
    return { items, confident, best: confident ? items.filter(x => x.sc >= top - 0.5) : [] };
  }
  /* קישור לכרטסות של התוסף "עינים למקרא" (com.chadbedera.madaeihatanach) */
  const MH_ID = "com.chadbedera.madaeihatanach";
  const MH_LABEL = { people: "אישים", places: "מקומות", animal: "בע״ח", flora: "צומח", domem: "דומם", amoraim: "אנשים מהתלמוד", beithamikdash: "בית המקדש", mumim: "מומים", chullin: "חולין", sukkah: "סוכה ולולב", archaeology: "ארכיאולוגיה" };
  class MhIndex {
    constructor(data) {
      this.m = new Map();
      for (const [g, list] of Object.entries(data || {})) for (const names of list) for (const k of names) {
        const n = norm(k); if (n.length < 3) continue;
        const a = this.m.get(n) || this.m.set(n, []).get(n); if (!a.some(h => h.g === g && h.name === names[0])) a.push({ g, name: names[0] });
      }
    }
    /* התאמה בשם מלא, עם הסרת תחיליות (ו/ה/ב/כ/ל/מ/ש) ורבים (ים/ות) בלבד; התאמה בשם הערך עצמו קודמת להתאמה בכינוי */
    find(words, D) {
      const out = [], seen = new Set(), push = h => { const k = h.g + "|" + h.name; if (!seen.has(k)) { seen.add(k); out.push(h); } };
      for (const raw of words) {
        const w = norm(raw), forms = [w];
        for (let i = 1; i <= 2 && w.length - i >= 3 && PRE.includes(w[i - 1]); i++) forms.push(w.slice(i));
        const bare = [...forms];
        for (const f of bare) for (const s of ["ים", "ות"]) if (f.length - s.length >= 3 && f.endsWith(s)) { const b = f.slice(0, -s.length); forms.push(b); const rf = refinal(b); if (rf !== b) forms.push(rf); }
        let hit = false;
        for (const c of forms) {
          const hits = this.m.get(c); if (!hits) continue;
          [...hits].sort((a, b) => (norm(b.name) === c) - (norm(a.name) === c)).forEach(push); hit = true;
          break;
        }
        /* 1.9.1: אין התאמה בשם — לפי השורש: מילה מאותו שורש במילון שהיא שם ערך בעינים למקרא, ורק כשהיא נטייה של אותו שם (תאנתו←תאנה), לא כל מילה מהשורש.
           2.0: לכל מילה בנפרד (קודם: רק כשאף מילה בבחירה לא נמצאה בשם), וגם אחרי הסרת תחיליות (ותאנתו) */
        if (hit || !D || !D.analyze || !D.byRoot) continue;
        for (const f of bare) {
          const an = D.analyze(f); if (!an || !an.root || !an.ok) continue;
          const w0 = unfinal(f), sub = [w0, w0.slice(1), w0.slice(2)]; let got = false;
          for (const x of D.byRoot(an.root)) { const hits = x && this.m.get(norm(x.title)); if (!hits) continue;
            const base = unfinal(norm(x.title)).replace(/[הת]$/, ""); if (base.length < 3 || !sub.some(g => g.startsWith(base))) continue;
            hits.forEach(h => push({ ...h, byRoot: true })); got = true; }
          if (got) break;
        }
      }
      return out.slice(0, 5);
    }
  }

  /* 2.0: מפת פסוק לפי הטעמים (טעמי כ"א ספרים). דרגות המפסיקים: 0 סילוק · 1 אתנחתא · 2 סגולתא/שלשלת/זקף/טפחא · 3 רביע/זרקא/פשטא/יתיב/תביר · 4 גרש/גרשיים/פזר/קרני פרה/תלישא גדולה/לגרמיה.
     המשרתים (מונח, מהפך, מרכא, מרכא כפולה, דרגא, קדמא, תלישא קטנה, ירח בן יומו) אינם מחלקים. מילים במקף — יחידה אחת. */
  const TA = { "\u0591": [1, "אתנחתא"], "\u0592": [2, "סגולתא"], "\u0593": [2, "שלשלת"], "\u0594": [2, "זקף קטן"], "\u0595": [2, "זקף גדול"], "\u0596": [2, "טפחא"],
    "\u0597": [3, "רביע"], "\u0598": [3, "זרקא"], "\u05AE": [3, "זרקא"], "\u0599": [3, "פשטא"], "\u059A": [3, "יתיב"], "\u059B": [3, "תביר"],
    "\u059C": [4, "גרש"], "\u059D": [4, "גרש"], "\u059E": [4, "גרשיים"], "\u059F": [4, "קרני פרה"], "\u05A0": [4, "תלישא גדולה"], "\u05A1": [4, "פזר"] };
  const TA_CONJ = { "\u05A3": "מונח", "\u05A4": "מהפך", "\u05A5": "מרכא", "\u05A6": "מרכא כפולה", "\u05A7": "דרגא", "\u05A8": "קדמא", "\u05A9": "תלישא קטנה", "\u05AA": "ירח בן יומו" };
  const TA_EMET = /[\u05A2\u05AB\u05AC\u05AD]/; /* אתנח הפוך, עולה, עילוי, דחי — רק בטעמי אמ"ת */
  function taamMap(text) {
    const t = String(text || "").replace(/[\u05C3:]\s*$/, "").trim();
    if (!/[\u0591-\u05AE]/.test(t)) return { error: "notaam" };
    if (TA_EMET.test(t)) return { error: "emet" };
    /* יחידות: מילה, או כמה מילים במקף; פסק (|) אחרי מונח = לגרמיה */
    const raw = t.split(/\s+/).filter(Boolean), units = [];
    for (let i = 0; i < raw.length; i++) {
      let w = raw[i]; if (w === "|" || w === "\u05C0") { if (units.length) units[units.length - 1].paseq = true; continue; }
      const pq = /[|\u05C0]$/.test(w); w = w.replace(/[|\u05C0]$/, "");
      const prev = units[units.length - 1];
      if (prev && /\u05BE$/.test(prev.text)) { prev.text += w; prev.last = w; } else units.push({ text: w, last: w });
      if (pq) units[units.length - 1].paseq = true;
    }
    for (const u of units) {
      let lv = 9, name = "", conj = "";
      for (const ch of u.last) { const d = TA[ch]; if (d && d[0] < lv) { lv = d[0]; name = d[1]; } else if (TA_CONJ[ch] && !conj) conj = TA_CONJ[ch]; }
      if (lv === 9 && u.paseq && conj === "מונח") { lv = 4; name = "לגרמיה"; }
      if (name === "שלשלת" && !u.paseq) { lv = 9; conj = "שלשלת קטנה"; name = ""; } /* שלשלת בלי פסק — משרת (שלשלת קטנה); בכ"א ספרים שלשלת היא תמיד בפסק */
      u.lv = lv; u.name = name; u.conj = conj;
    }
    if (!units.length) return { error: "empty" };
    const L = units[units.length - 1]; L.lv = 0; L.name = "סילוק";
    /* חלוקה דיכוטומית: כל תחום נחלק במפסיק החזק ביותר שבתוכו (בשוויון — הראשון), וכן הלאה */
    const split = (a, b) => {
      const node = { from: a, to: b, end: units[b] };
      let best = -1; for (let i = a; i < b; i++) if (units[i].lv < 9 && (best < 0 || units[i].lv < units[best].lv)) best = i;
      if (best >= 0) node.kids = [split(a, best), split(best + 1, b)];
      return node;
    };
    return { units, tree: split(0, units.length - 1) };
  }

  /* 2.0: ניתוח ניקוד וטעם למילה מנוקדת — רק מה שנגזר בוודאות מהסימנים; מקרה מסופק מסומן "?" (q: true).
     sec: מילות מפתח לכותרת הסעיף בספר הדקדוק (הראשונה שנמצאת). */
  const V = { "\u05B0": "sh", "\u05B1": "hs", "\u05B2": "hp", "\u05B3": "hq", "\u05B4": "i", "\u05B5": "e", "\u05B6": "E", "\u05B7": "a", "\u05B8": "A", "\u05B9": "o", "\u05BA": "o", "\u05BB": "u", "\u05C7": "Aq" };
  const BGD = "בגדכפת", SHORT = { a: 1, E: 1, u: 1, Aq: 1 }, POSTPRE = /[\u0592\u0599\u05AE\u05A9\u05A0\u059A]/;
  const SEC = { shNa0: ["כלל א: שווא בתחילת", "שווא נע ושווא נח"], sh2: ["כלל ב: שני שוואים", "שווא נע ושווא נח"], shEnd: ["כלל ח: שווא בסוף", "כלל ג: שני שוואים בסוף", "שווא נע ושווא נח"],
    shDag: ["כלל ד: שווא תחת אות דגושה", "שווא נע ושווא נח"], shLong: ["כלל ה: שווא אחרי תנועה גדולה", "שווא נע ושווא נח"], shSame: ["כלל ו: שווא תחת הראשונה", "שווא נע ושווא נח"],
    shShort: ["כלל ז: שווא בסוף הברה", "שווא נע ושווא נח"], dkal: ["כלל: דגש קל", "דגש קל ודגש חזק", "הדגש"], dhaz: ["כלל: דגש חזק", "דגש קל ודגש חזק", "הדגש"],
    qq: ["כלל ב: לפני חטף קמץ", "כללי קמץ קטן", "קמץ גדול וקמץ קטן"], qqClosed: ["כלל א: קמץ בהברה סגורה", "כללי קמץ קטן", "קמץ גדול וקמץ קטן"], qqx: ["קמץ גדול וקמץ קטן", "כללי קמץ קטן"],
    pg: ["פתח גנובה"], mapiq: ["מפיק"], stress: ["הטעם במילה", "מלרע ומלעיל"], taam: ["שמות הטעמים"], meteg: ["כלל: מתג", "מתג וגעיה", "מתג (געיה)"] };
  function clusters(word) {
    const cs = [];
    for (const ch of word) {
      if (/[א-ת]/.test(ch)) { cs.push({ ch, v: "", dag: false, met: false, acc: [] }); continue; }
      const c = cs[cs.length - 1]; if (!c) continue;
      if (V[ch]) c.v = V[ch]; else if (ch === "\u05BC") c.dag = true; else if (ch === "\u05BD") c.met = true; else if (/[\u0591-\u05AF]/.test(ch)) c.acc.push(ch);
    }
    /* אמות קריאה: חולם מלא, שורוק, יו"ד אחרי חיריק/צירה/סגול, ה/א בלי ניקוד בסוף מילה */
    cs.forEach((c, i) => { const p = cs[i - 1];
      if (c.ch === "ו" && c.v === "o" && p && !p.v) { p.v = "o"; c.mater = true; c.v = ""; }
      else if (c.ch === "ו" && c.dag && !c.v && (!p || !p.v || p.v === "sh")) { c.dag = false; if (p) { p.v = "u+"; c.mater = true; } else c.v = "u+"; }
      else if (c.ch === "י" && !c.v && !c.dag && p && /^(i|e|E)$/.test(p.v)) { c.mater = true; p.v += "+"; }
      else if (/[הא]/.test(c.ch) && !c.v && !c.dag && i === cs.length - 1 && p && p.v) c.mater = true; });
    return cs;
  }
  const full = v => v && !/^(sh|hs|hp|hq)$/.test(v);
  const isLong = v => /^(e|o|u\+|i\+|e\+)$/.test(v) || v === "A";
  function nikudAnalyze(word, last) {
    const out = [], add = (t, sec, q) => out.push({ t, sec: SEC[sec] || [], q: !!q });
    if (!/[\u05B0-\u05BC\u05C7]/.test(word)) return out;
    const parts = word.split("\u05BE");                                   /* מילים במקף — הטעם על האחרונה */
    parts.forEach((pw, pi) => {
      const cs = clusters(pw), n = cs.length, lastPart = pi === parts.length - 1; if (!n) return;
      const L = c => c.ch + (c.v === "sh" ? "\u05B0" : "");
      /* פתח גנובה ומפיק */
      const z = cs[n - 1], y = cs.slice(0, n - 1).reverse().find(c => !c.mater);   /* התנועה שלפני האות האחרונה, אחרי דילוג על אמות קריאה (רו\u05BCח\u05B7) */
      const pg = z && z.v === "a" && (/[חע]/.test(z.ch) || (z.ch === "ה" && z.dag)) && y && full(y.v) && !/^(a|E)$/.test(y.v);
      if (pg) { z.pg = true; add(`פתח גנובה (${z.ch})`, "pg"); }
      if (z && z.ch === "ה" && z.dag) add("מפיק (ה)", "mapiq");
      cs.forEach((c, i) => {
        const p = cs[i - 1], nx = cs[i + 1];
        /* דגש */
        if (c.dag && !(c.ch === "ה" && i === n - 1)) {
          if (i === 0) BGD.includes(c.ch) ? add(`דגש קל (${c.ch}\u05BC)`, "dkal", pi > 0) : add(`דגש חזק בראש מילה (${c.ch}\u05BC)`, "dhaz", true);
          else if (i === n - 1 && c.v === "sh" && BGD.includes(c.ch)) add(`דגש באות האחרונה בשווא (${c.ch}\u05BC)`, "dkal", true); /* א\u05B7ת\u05B0\u05BC, ו\u05B7י\u05B5\u05BCש\u05B0\u05C1ת\u05B0\u05BC */
          else if (p.mater || full(p.v)) add(`דגש חזק (${c.ch}\u05BC)`, "dhaz"), c.hz = true;
          else if (p.v === "sh" && BGD.includes(c.ch)) add(`דגש קל (${c.ch}\u05BC)`, "dkal");
          else add(`דגש (${c.ch}\u05BC)`, "dhaz", true);
        }
        /* שווא */
        if (c.v === "sh") {
          if (i === 0) add(`שווא נע (${L(c)})`, "shNa0");
          else if (i === n - 1) add(`שווא נח (${L(c)})`, "shEnd");
          else if (nx && nx.v === "sh" && i + 1 === n - 1) add(`שווא נח (${L(c)})`, "shEnd");
          else if (p.v === "sh" && !(i === 1)) add(`שווא נע (${L(c)})`, "sh2");
          else if (nx && nx.v === "sh") add(`שווא נח (${L(c)})`, "sh2");
          else if (c.hz) add(`שווא נע (${L(c)})`, "shDag");
          else if (nx && nx.ch === c.ch) add(`שווא נע (${L(c)})`, "shSame");
          else if (SHORT[p.v] || p.v === "i") p.met ? add(`שווא נע? (${L(c)})`, "shShort", true) : add(`שווא נח (${L(c)})`, "shShort");
          else if (p.v === "A") p.met ? add(`שווא נע (${L(c)})`, "shLong") : add(`שווא — תלוי בקמץ (${L(c)})`, "qqx", true);
          else if (isLong(p.v)) p.met ? add(`שווא נע (${L(c)})`, "shLong") : add(`שווא אחרי תנועה גדולה (${L(c)})`, "shLong", true);
          else if (p.v === "sh" && i === 1) add(`שווא נע (${L(c)})`, "sh2");
        }
        /* קמץ קטן */
        if (c.v === "Aq") add(`קמץ קטן (${c.ch}\u05C7)`, "qqx");
        else if (c.v === "A" && !c.met) {
          if (nx && nx.v === "hq") add(`קמץ קטן (${c.ch}\u05B8)`, "qq");
          else if (!lastPart && i === n - 2 && !cs[n - 1].v && !c.acc.length) add(`קמץ קטן לפני מקף (${c.ch}\u05B8)`, "qqClosed");
        }
        if (c.met && !(last && lastPart && i === cs.map(x => x.met).lastIndexOf(true))) add(`מתג (${c.ch})`, "meteg"); /* בסוף פסוק — המתג האחרון הוא הסילוק */
      });
      /* טעם: שם ומקום (מלרע / מלעיל) */
      if (!lastPart) return;
      const accs = cs.flatMap((c, i) => c.acc.map(a => ({ a, i })));
      for (const { a } of accs) { const nm = (TA[a] || [])[1] || TA_CONJ[a]; if (nm && !out.some(o => o.t === "טעם: " + nm)) add("טעם: " + nm, "taam"); }
      let si = -1; const real = accs.filter(x => !POSTPRE.test(x.a));
      if (real.length) si = real[real.length - 1].i; else { const ps = accs.filter(x => x.a === "\u0599"); if (ps.length > 1) si = ps[0].i; }
      if (si < 0 && last) { const m = cs.map(c => c.met).lastIndexOf(true); if (m >= 0) { si = m; if (!accs.length) add("טעם: סילוק", "taam"); } }
      if (si < 0) return;
      const after = cs.slice(si + 1).filter(c => full(c.v) && !c.mater && !c.pg).length;
      if (after === 0) add("מלרע", "stress"); else if (after === 1) add("מלעיל", "stress"); else add("מקום הטעם?", "stress", true);
    });
    return out;
  }
  g.KK = { Lex, CORE, hsText, nikudAnalyze, taamMap, norm, Dict, skeleton, rank, kindOf, refinal, MhIndex, MH_ID, MH_LABEL };
  if (typeof module !== "undefined") module.exports = g.KK;
})(typeof window !== "undefined" ? window : globalThis);
