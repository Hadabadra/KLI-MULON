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
  const SUPP = 'בטח שלט כשר עלב רעב זכר חסר דמה פדה קדש נתנ הלכ שתה שוב שנא לבש חזק רעה מצא בקש ארכ מלא שבע עמד יכל לקח יצא ישב קומ בוא שומ שמר ידע ראה עשה שמע פתח למד קרא שלח מות ירד זכר שבר ברכ נהג כנס מלכ פסק דרש עבד ישע ירא אהב ארג בחר גנב הרג חפצ טהר ירש סבב סלח רדפ תפש'.split(' ');
  const PRE = "והבכלמש";
  const SUF = ["תי", "ותיהם", "ותיו", "יהם", "ותי", "ות", "ים", "ין", "תם", "תן", "נו", "כם", "כן", "ה", "י", "ך", "ו", "ם", "ן", "ת"];

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
    get(n) { return this.map.get(n) || null; }
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
    find(word) { for (const c of this.candidates(word)) { const r = this.map.get(c); if (r) return r; } return null; }
    /* בחירה של כמה מילים: קודם כביטוי שלם, ואז כל מילה בנפרד; גם מילה חלקית (קידומת) */
    resolve(text, max = 8) {
      const t = norm(text), out = { phrase: null, phrases: [], words: [] };
      if (!t) return out;
      out.phrase = this.find(t);
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
        let r = this.find(w);
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
    ["נאמן נאמנה נאמנים האמין ויאמן", "אמן", "נפעל / הפעיל"]]) for (const f of forms.split(" ")) IRREG[unfinal(f)] = [root, bin, alts];
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
  const kindOf = src => /ראשי תיבות/.test(src) ? "acr" : /לעזי/.test(src) ? "laaz" : src === "המכלול" ? "enc" : "lex";
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
    find(words) {
      const out = [], seen = new Set();
      for (const raw of words) {
        const w = norm(raw), forms = [w];
        for (let i = 1; i <= 2 && w.length - i >= 3 && PRE.includes(w[i - 1]); i++) forms.push(w.slice(i));
        for (const f of [...forms]) for (const s of ["ים", "ות"]) if (f.length - s.length >= 3 && f.endsWith(s)) forms.push(f.slice(0, -s.length));
        for (const c of forms) {
          const hits = this.m.get(c); if (!hits) continue;
          const ranked = [...hits].sort((a, b) => (norm(b.name) === c) - (norm(a.name) === c));
          for (const h of ranked) { const k = h.g + "|" + h.name; if (!seen.has(k)) { seen.add(k); out.push(h); } }
          break;
        }
      }
      return out.slice(0, 5);
    }
  }
  g.KK = { norm, Dict, skeleton, rank, kindOf, refinal, MhIndex, MH_ID, MH_LABEL };
  if (typeof module !== "undefined") module.exports = g.KK;
})(typeof window !== "undefined" ? window : globalThis);
