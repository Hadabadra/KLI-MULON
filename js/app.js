(function () {
  const $ = s => document.querySelector(s), O = window.Otzaria;
  const D = new KK.Dict(window.KK_DICT), MH = new KK.MhIndex(window.MH_INDEX);
  let fOpen = false, allLetter = "א", allShown = 0, mode = "word", cur = null, stack = [], sugList = [], sugIdx = -1;
  let ST = { auto: true, mode: "toast", maxWords: 8, hist: [], likes: [], azSide: false, fOpen: false, noAcr: false, fs: 100, nakdan: true, concAll: false };
  let selWords = [], selCtx = { raw: "", words: [] };
  const call = async (m, p) => { try { return O ? await O.call(m, p || {}) : { success: false }; } catch (e) { return { success: false }; } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const deb = (f, t) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => f(...a), t); }; };
  const saveNow = () => call("storage.set", { key: "settings", value: ST });
  const save = deb(saveNow, 400);
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveNow(); }); window.addEventListener("pagehide", saveNow);

  async function load() {
    const r = await call("storage.get", { key: "settings" });
    if (r.success && r.data && typeof r.data === "object") ST = { ...ST, ...r.data, hist: Array.isArray(r.data.hist) ? r.data.hist : [], likes: Array.isArray(r.data.likes) ? r.data.likes : [] };
  }
  // צבעי אוצריא -> אסימוני --color-* של העיצוב (1.1.1: ב-1.1.0 נכתבו שמות ישנים ולכן הצבעים לא הותאמו)
  const TOK = { primary: "primary", onPrimary: "on-primary", surface: "surface", onSurface: "on-surface", onSurfaceVariant: "on-surface-variant",
    surfaceContainerLow: "surface-container-low", surfaceContainer: "surface-container", surfaceContainerHigh: "surface-container-high",
    surfaceContainerHighest: "surface-container-highest", outline: "outline", outlineVariant: "outline-variant" };
  function theme(t) {
    const c = t && (t.colorScheme || t); if (!c || typeof c !== "object") return; const st = document.documentElement.style;
    for (const [k, v] of Object.entries(TOK)) if (typeof c[k] === "string" && c[k]) st.setProperty("--color-" + v, c[k]);
    if (c.primary) st.setProperty("--color-primary-subtle", "color-mix(in srgb, " + c.primary + " 13%, transparent)");
    if (!c.outlineVariant && c.outline) st.setProperty("--color-outline-variant", "color-mix(in srgb, " + c.outline + " 45%, transparent)");
    const mix = (x, y, n) => `color-mix(in srgb, ${x} ${n}%, ${y})`;
    if (c.surface && !c.surfaceContainerLow) st.setProperty("--color-surface-container-low", mix(c.surfaceContainerHigh || c.onSurface, c.surface, c.surfaceContainerHigh ? 40 : 4));
    if (c.surface && !c.surfaceContainer) st.setProperty("--color-surface-container", mix(c.surfaceContainerHigh || c.onSurface, c.surface, c.surfaceContainerHigh ? 70 : 7));
    if (c.onSurface && !c.onSurfaceVariant) st.setProperty("--color-on-surface-variant", mix(c.onSurface, c.surface || "transparent", 72));
    const ty = t.typography || {};
    if (ty.fontFamily) st.setProperty("--font-main", `'${ty.fontFamily}', 'FrankRuhlCLM', 'David', serif`);
    if (ty.uiFontFamily) st.setProperty("--font-ui", `'${ty.uiFontFamily}', 'Rubik', system-ui, sans-serif`);
    if (t.mode) document.documentElement.dataset.theme = t.mode;
  }

  const sv = p => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const IC = {
    copy: sv('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    up: sv('<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>'),
    down: sv('<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>'),
    search: sv('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>'),
    side: sv('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>')
  };
  const senseCard = (r, i, best) => {
    const [nk, d, src] = r.s[i], liked = ST.likes.includes(r.n + "#" + i);
    return `<div class="sense${best ? " best" : ""}"><div class="sbody">${nk ? `<span class="nk">${esc(nk)}</span>` : ""}${esc(d)}${src ? (/ספר השרשים/.test(src) ? `<button class="src lnk" data-lib="radak">מקור: ${esc(src)} — פתח בספר ↗</button>` : `<span class="src">מקור: ${esc(src)}</span>`) : ""}</div><div class="tb"><button class="ib" data-copy="${i}" title="העתק" aria-label="העתק">${IC.copy}</button>
      <button class="ib" data-rep="${i}" title="דווח על הגדרה לא מתאימה" aria-label="דווח על הגדרה לא מתאימה">${IC.down}</button>
      <button class="ib ${liked ? "on" : ""}" data-like="${i}" title="הגדרה טובה" aria-label="הגדרה טובה">${IC.up}</button></div></div>`;
  };
  /* 1.11.0: כתיב מלא וחסר — צורות חלופיות שקיימות במילון (משל ← מושל / משל) */
  function pleneAlts(w) {
    const b = String(w || "").replace(/[^\u05D0-\u05EA]/g, ""), out = new Set();
    if (b.length < 2 || b.length > 9) return [];
    for (let i = 1; i < b.length; i++) for (const m of ["ו", "י"]) out.add(b.slice(0, i) + m + b.slice(i));
    for (let i = 1; i < b.length - 1; i++) if (b[i] === "ו" || b[i] === "י") out.add(b.slice(0, i) + b.slice(i + 1));
    const self = D.get(b) || D.find(b), seen = new Set(), res = [];
    for (const f of out) { const r = D.get(f); /* התאמה מדויקת בלבד, בלי הסרת קידומות */ if (r && (!self || r.n !== self.n) && !seen.has(r.n)) { seen.add(r.n); res.push(r); } }
    return res.slice(0, 8);
  }
  const pleneRow = w => { if (ST.plene === false) return ""; const a = pleneAlts(w); return a.length ? `<div class="row inl"><b>כתיב מלא / חסר</b><div class="chips">${a.map(r => `<button class="chip" data-go="${esc(r.title)}" title="${esc((r.s[0] || [])[1] || "")}">${esc(r.title)}</button>`).join("")}</div><span class="note">אותה מילה בכתיב אחר (למשל משל ← מושל) — לבחירתכם לפי ההקשר.</span></div>` : ""; };
  const IA = (f, ...a) => window.KKA && typeof KKA[f] === "function" ? KKA[f](...a) : ""; /* 2.0: פיצ'רים מ-js/ideas-a.js */
  const chip = (t, a = "", cls = "") => `<button class="chip ${cls}" data-go="${esc(t)}" ${a}>${esc(t)}</button>`;


  /* 1.8.0: תווית ושבבים בשורה אחת; מעל 10 — השאר מקופלים */
  const chipRow = (label, a, n = 10) => a.length ? `<div class="row inl"><b>${esc(label)}</b><div class="chips">${a.slice(0, n).map(t => chip(t)).join("")}${a.length > n ? `<details class="cmore"><summary class="chip">+${a.length - n}</summary><div class="chips">${a.slice(n).map(t => chip(t)).join("")}</div></details>` : ""}</div></div>` : "";
  const grid = h => `<div class="senses">${h}</div>`;
  const KIND_NAME = { lex: "פירושים", enc: "אנציקלופדיה (המכלול)", laaz: "לעזי רש\"י", acr: "ראשי תיבות" };
  function sensesHtml(r) {
    const rk = KK.rank(r, selCtx), idx = rk.items.map(x => x.i);
    if (rk.confident) {
      const b = new Set(rk.best.map(x => x.i));
      const rest = idx.filter(i => !b.has(i));
      return `<h4 class="gh">הפירוש המתאים להקשר</h4>${grid(rk.best.map(x => senseCard(r, x.i, true)).join(""))}` +
        (rest.length ? `<details class="more"><summary>עוד פירושים (${rest.length})</summary>${grid(rest.map(i => senseCard(r, i)).join(""))}</details>` : "");
    }
    const g = { lex: [], enc: [], laaz: [], acr: [] }; for (const it of rk.items) g[it.kind].push(it.i);
    const present = Object.keys(g).filter(k => g[k].length);
    return (present.length > 1 ? `<p class="note">לא זוהה פירוש יחיד לפי ההקשר, ולכן מוצגים כל הפירושים.</p>` : "") + present.map(k => {
      const html = grid(g[k].map(i => senseCard(r, i)).join(""));
      return k === "acr" && g[k].length > 3 ? `<details class="more"><summary>${KIND_NAME[k]} (${g[k].length})</summary>${html}</details>`
        : (present.length > 1 ? `<h4 class="gh">${KIND_NAME[k]} (${g[k].length})</h4>` : "") + html;
    }).join("");
  }

  const mhRow = hits => hits.length ? `<div class="row"><b>בעינים למקרא</b><div class="chips">${hits.map(h => `<button class="chip pri" data-mhg="${esc(h.g)}" data-mhn="${esc(h.name)}">${esc(KK.MH_LABEL[h.g] || h.g)}: ${esc(h.name)}${h.byRoot ? " (לפי השורש)" : ""} ↗</button>`).join("")}</div><span class="note">נפתח בכרטסת של התוסף "עינים למקרא" (צריך להיות מותקן).</span></div>` : "";
  async function openMh(g, name) {
    const r = await call("plugin.openOther", { pluginId: KK.MH_ID, param: { section: g, entry: name } });
    if (!r || !r.success) call("ui.showMessage", { message: "לא ניתן לפתוח את עינים למקרא. ודאו שהתוסף מותקן ומופעל." });
  }
  function showMhOnly(text, hits) {
    mode = "word"; tabs(); cur = null;
    $("#out").innerHTML = `<h2>${esc(KK.norm(text))}</h2><p class="hint">אין ערך במילון, אבל יש כרטסת בעינים למקרא.</p>` + mhRow(hits);
  }
  function open(r, push = true) {
    if (!r) return; if (push && cur) stack.push(cur.n); cur = r; mode = "word"; tabs();
    ST.hist = [r.title, ...ST.hist.filter(x => x !== r.title)].slice(0, 60); saveNow();
    const isAcr = /["'״׳]/.test(r.title), an = D.analyze(r.n), root = an.root, bin = an.binyan;
    const same = isAcr ? [] : D.byRoot(root).filter(x => x.n !== r.n).slice(0, 24);
    const sim = D.similar(r.n, 14).map(k => D.get(k)).filter(Boolean);
    const nb = D.neighbors(r.n);
    const links = {}; for (const [k, t] of r.l || []) (links[k] = links[k] || []).push(t);
    $("#out").innerHTML =
      `<div class="pager"><span>${stack.length ? `<button class="chip" id="back">→ חזרה</button>` : ""}</span></div>
       <div class="hero"><h2>${esc(r.title)}</h2>${window.KKB ? KKB.hero(r) : ""}</div>` +
      (selWords.length > 1 ? `<div class="row selrow"><b>מילים בבחירה</b><div class="chips"><button class="chip" data-comb="1">📋 דף משולב</button>${selWords.map(t => chip(t, "", t === r.title ? "pri" : "")).join("")}</div></div>` : "") +
      `<div class="row"><div class="chips"><button class="chip pri" id="osearch">${IC.search} חפש באוצריא</button><button class="chip" id="orel">📖 פסוקים ומפרשים קשורים</button><button class="chip" id="oconc">📚 קונקורדנציה לתנ"ך</button></div></div><div id="rel"></div>` +
      (isAcr ? "" : `<div class="row"><b>במילוני הספרייה</b><div class="chips"><button class="chip" data-lib="radak">ספר השרשים לרד"ק — שורש ${esc(KK.refinal(root))}</button><button class="chip" data-lib="bachur">ספר הבחור</button>${online ? `<button class="chip" id="oeven">אבן שושן ↗</button><button class="chip" data-ext="wiktionary">${wkHas(cur.title.replace(/[^\u05D0-\u05EA ]/g, "")) ? "ויקימילון — הערך ↗" : "ויקימילון (חיפוש) ↗"}</button><button class="chip" data-ext="wikisource">ויקיטקסט ↗</button><button class="chip" data-ext="academy">האקדמיה ללשון ↗</button>` : ""}</div>${online ? `<span class="note">קישורים חיצוניים בלבד, נפתחים בדפדפן ומוסתרים רק כשאוצריא מוגדרת "ללא גישה לאינטרנט". התוכן שם אינו מסונן. אבן שושן — מנוי באתר, והמילה מועתקת להדבקה.</span>` : ""}</div>`) +
      sensesHtml(r) + (isAcr ? "" : pleneRow(r.title)) +
      Object.entries(links).map(([k, a]) => chipRow(k.replace("_", " "), a)).join("") +
      mhRow(isAcr ? [] : MH.find([r.n, ...(selCtx.words || [])], D)) +
      (isAcr ? "" : `<div id="libhits"></div>`) +
      (isAcr ? "" :       `<div class="row"><b>${an.ok ? (an.src === "rd" ? "שורש (מאומת מול ספר השרשים) · בניין משוער" : "שורש (נמצא במילון) · בניין משוער") : "שורש משוער, לא מאומת"}</b><div class="chips"><button class="chip pri" data-root="${esc(root)}">שורש: ${esc(KK.refinal(root))}</button>${(an.alts || []).map(x => `<button class="chip" data-root="${esc(x)}">או: ${esc(KK.refinal(x))}</button>`).join("")}<button class="chip" data-gram="הבניינים">📘 ${esc(bin)} — בדקדוק</button></div>
       <span class="note">זיהוי השורש והבניין הוא הערכה אוטומטית ועלול לטעות.</span></div>`) +
      chipRow("מאותו שורש", same.map(x => x.title)) + chipRow("מילים דומות", sim.map(x => x.title)) +
      `<div class="pager">${nb.prev ? chip(nb.prev.title, "", "") .replace(">", ">→ ") : "<span></span>"}${nb.next ? chip(nb.next.title).replace(">", ">← ") : ""}</div>`;
    if (!isAcr) fillLibHits(r.title.replace(/[^\u05D0-\u05EA ]/g, ""), $("#libhits"));
    $("#out").scrollTop = 0; window.scrollTo(0, 0);
  }
  /* מילונים מתוך ספריית אוצריא (רד"ק, ספר הבחור): מאתרים את הספר ופותחים אותו על השורש/המילה */
  const LIB = { radak: ["ספר השרשים", /רד"?ק|רדק/], bachur: ["ספר הבחור", /^ספר הבחור/], tzachot: ["צחות", /צחות/] };
  async function openLib(which) { return openLibTerm(which, which === "radak" ? KK.refinal(D.analyze(cur.n).root) : cur.title.replace(/[^\u05D0-\u05EA ]/g, "")); }
  /* קונקורדנציה לתנ"ך: כל צורות השורש שבמילון, וכל המופעים שלהן בתנ"ך מתוך ספריית אוצריא */
  async function showConc(r) {
    mode = "conc"; tabs(); const an = D.analyze(r.n); $("#out").classList.add("wide");
    const forms = [r.title.replace(/[^א-ת]/g, ""), KK.refinal(an.root), ...D.byRoot(an.root).map(x => x.title.replace(/[^א-ת]/g, ""))].filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 16);
    $("#out").innerHTML = `<div class="chead"><h2>קונקורדנציה: ${esc(r.title)}</h2><button class="chip" id="cback" title="חזרה לערך">חזרה לערך ←</button></div><p class="note">שורש ${esc(KK.refinal(an.root))}${an.ok ? "" : " (משוער)"} · ${forms.length} צורות · ${ST.concAll ? "מכל ספריית אוצריא" : "מתוך ספרי התנ\"ך בלבד"}, כולל קידומות. <a href="#" id="cscope">${ST.concAll ? "הגבל לתנ\"ך" : "חפש בכל הספרייה"}</a></p><div class="row"><div class="search mini"><input id="cq" placeholder="הוסיפו צורה לחיפוש…"></div></div><div id="cforms" class="chips"></div><div id="cchart"></div><div id="conc"><p class="note"><span class="spin"></span>אוסף מופעים…</p></div>`;
    const card = (x, q) => `<a class="res" href="#" data-open='${esc(JSON.stringify({ id: x.id, bookId: x.bookId, type: x.type, index: x.index, q }))}'><b>${esc(plain(x.reference || x.book || ""))}</b><span>${hlForm(x.text, q)}</span></a>`;
    const out = [], box = () => $("#conc"); let pick = "";
    const draw = () => {
      const total = out.reduce((t, x) => t + x.res.length, 0), fb = $("#cforms"); if (!box()) return;
      fb.innerHTML = `<button class="chip ${pick ? "" : "pri"}" data-cf="">הכל · ${total}</button>` + out.map(x => x.res.length ? `<button class="chip ${pick === x.f ? "pri" : ""}" data-cf="${esc(x.f)}">${esc(x.f)} · ${x.res.length}${ST.concAll && x.res.length >= CMAX ? "+" : ""}</button>` : `<button class="chip zero" disabled title="ללא מופעים${ST.concAll ? "" : " בתנ\"ך"}">${esc(x.f)} · 0</button>`).join(""); /* 2.0: צורה ללא מופעים מוצגת בשורה עם 0, לא בתחתית */
      const shown = out.filter(x => !pick || x.f === pick), bf = IA("concChart", shown, draw) || null; /* 2.0: התפלגות לפי ספר + סינון לספר */
      box().innerHTML = `<div class="results conc">${shown.map(x => x.res.filter(y => !bf || bf(y)).map(y => card(y, x.f)).join("")).join("")}</div>`;
    };
    $("#cback").onclick = () => { mode = "word"; open(r, false); };
    $("#cforms").onclick = e => { const b = e.target.closest("[data-cf]"); if (b) { pick = b.dataset.cf; draw(); } };
    const books = ST.concAll ? null : await tanakhBooks();
    const add = async f => {
      let res = await runSearch(f, ST.concAll ? { limit: CMAX, order: "catalogue" } : books && books.length ? { books, limit: 20000, order: "catalogue" } : { categories: ["/תנך"], limit: 20000, order: "catalogue" });
      if (!ST.concAll) res = res.filter(isTanakh);
      const seen = new Set(out.flatMap(x => x.res.map(y => y.id + "#" + y.index)));
      out.push({ f, res: res.filter(y => !seen.has(y.id + "#" + y.index)) }); out.sort((a, b) => b.res.length - a.res.length); draw();
    };
    for (const f of forms) { if (mode !== "conc") return; await add(f); }
    if (!out.some(x => x.res.length) && box()) box().innerHTML = '<p class="hint">לא נמצאו מופעים, או שהחיפוש אינו זמין כרגע.</p>';
    const cs = $("#cscope"); if (cs) cs.onclick = e => { e.preventDefault(); ST.concAll = !ST.concAll; save(); showConc(r); };
    const cq = $("#cq"); if (cq) cq.onkeydown = e => { if (e.key === "Enter" && cq.value.trim()) { add(KK.norm(cq.value)); cq.value = ""; } };
  }
  const CMAX = 400;
  /* 1.8.0: ספרי התנ"ך בשמם המלא. קודם "דברי הימים" ו"שיר השירים" פוצלו למילים, וכל ספר שמתחיל ב"דברי"/"שיר"/"רות" נחשב תנ"ך */
  const TNK = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים", "יהושע", "שופטים", "שמואל א", "שמואל ב", "מלכים א", "מלכים ב", "ישעיהו", "ירמיהו", "יחזקאל", "הושע", "יואל", "עמוס", "עובדיה", "יונה", "מיכה", "נחום", "חבקוק", "צפניה", "חגי", "זכריה", "מלאכי", "תהלים", "תהילים", "משלי", "איוב", "שיר השירים", "רות", "איכה", "קהלת", "אסתר", "דניאל", "עזרא", "נחמיה", "דברי הימים א", "דברי הימים ב"];
  const TSET = new Set(TNK), CHAP = /^(טו|טז|ק?[יכלמנסעפצ]?[א-ט]?)[,:\s]/;
  const bookOf = x => plain(x.bookTitle || x.title || x.book || "").replace(/^ספר /, "").trim();
  const isTanakh = x => { const b = bookOf(x); if (b) return TSET.has(b); const ref = plain(x.reference || x.bookId || "").replace(/^ספר /, "");
    return TNK.some(t => ref.startsWith(t + " ") && CHAP.test(ref.slice(t.length + 1)) && ref.slice(t.length + 1).search(/[,:\s]/) > 0); };
  let tnkCache = null;
  async function tanakhBooks() {
    if (tnkCache) return tnkCache; const got = [];
    for (const t of TNK) { const f = await call("library.findBooks", { query: t, limit: 8 }); const b = (f.success && Array.isArray(f.data) ? f.data : []).find(x => String(x.title || "").replace(/^ספר /, "").trim() === t);
      if (b && !got.some(g => g.bookId === b.bookId)) got.push({ bookId: b.bookId, type: b.type || "text" }); }
    return (tnkCache = got.length >= 30 ? got : null);
  }
  /* מצב מקוון לפי אוצריא (כולל ההגדרה "ללא גישה לאינטרנט") — קישורים חיצוניים מוסתרים כשאין חיבור */
  let online = false;
  async function checkOnline(force) {
    try { let r = await call("app.getConnectivity", force ? { forceRefresh: true } : {});  online = !(r.success && r.data && r.data.isOfflineMode); } /* 1.7.1: מוסתר רק כשאוצריא במצב "ללא גישה לאינטרנט" */ catch (e) { online = false; }
  }
  window.addEventListener("online", () => checkOnline(true)); 
  let WK = null; const wkHas = w => { if (!WK) WK = new Set(String(window.KK_WIKT || "").split("|")); return WK.has(w); }; /* 1.10.0: קישור ישיר לערך בוויקימילון כשהערך קיים */
  const EXT = { wiktionary: w => wkHas(w) ? "https://he.wiktionary.org/wiki/" + encodeURIComponent(w) : "https://he.wiktionary.org/w/index.php?search=" + encodeURIComponent(w), wikisource: w => "https://he.wikisource.org/w/index.php?search=" + encodeURIComponent(w), academy: w => "https://hebrew-academy.org.il/?s=" + encodeURIComponent(w) };
  async function openExt(k) { const r = await call("app.openUrl", { url: EXT[k](cur.title.replace(/[^\u05D0-\u05EA ]/g, "")) }); if (!r || r.success === false) call("ui.showMessage", { message: "לא ניתן לפתוח את האתר" }); }
  async function openEven() {
    copyText(cur.title.replace(/[^\u05D0-\u05EA ]/g, ""));
    const r = await call("app.openUrl", { url: "https://www.even-shoshan.co.il/" });
    call("ui.showMessage", { message: r && r.success !== false ? "המילה הועתקה — הדביקו אותה בחיפוש של אבן שושן" : "לא ניתן לפתוח את האתר" });
  }
  /* ===== ספרי דקדוק (1.6.0): קורא מובנה עם תוכן עניינים, חיפוש וסימנייה; ייבוא ספר ידני; הצגה בספריית אוצריא ===== */
  const BUILTIN = { id: 1, title: (window.KK_GRAMMAR || {}).title || "יסודות הדקדוק", note: (window.KK_GRAMMAR || {}).note || "", text: (window.KK_GRAMMAR || {}).text || "" };
  const bookList = () => [{ id: 1, title: BUILTIN.title, builtin: true }, ...(ST.books || [])];
  async function getBook(id) {
    if (+id === 1) return BUILTIN;
    const meta = (ST.books || []).find(b => b.id === +id); if (!meta) return null;
    const r = await call("storage.get", { key: "book:" + id }); return r.success && r.data ? { ...meta, text: r.data } : null;
  }
  function parseBook(text) {
    const secs = []; let cur = { lv: 1, title: "פתיחה", lines: [] };
    for (const ln of String(text).split(/\r?\n/)) {
      const m = /^(#{1,3})\s+(.*)/.exec(ln);
      if (m) { if (cur.lines.length || secs.length) secs.push(cur); cur = { lv: m[1].length, title: m[2].trim(), lines: [] }; } else cur.lines.push(ln);
    }
    secs.push(cur);
    return secs.filter(x => x.title !== "פתיחה" || x.lines.some(l => l.trim())).map((x, i) => ({ ...x, id: "s" + i }));
  }
  function secHtml(x, q, bm) {
    const hl = t => { let h = esc(t).replace(/\[\[([^|\]]+)\|([^\]]*)\]\]/g, (m, a, b) => a === "חיפוש" ? `<a href="#" class="blink" data-srch="${b}">🔍 ${b}</a>` : a === "פסוק" ? `<a href="#" class="blink psk" data-psk="${b}">📖 ${b.split("|")[0]}</a>` : `<a href="#" class="blink" data-lt="${a}" data-lq="${b}">${b ? a + ": " + b : a} ↗</a>`).replace(/\[\[([^\]]+)\]\]/g, (m, a) => `<a href="#" class="blink" data-lt="${a}">${a} ↗</a>`).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>"); if (q) { const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"); h = h.replace(re, m => `<mark>${m}</mark>`); } return h; };
    let out = "", list = false, tbl = null, rule = false;
    const flush = () => { if (list) { out += "</ul>"; list = false; } if (tbl) { out += `<div class="tblw"><table${tbl[0][0] === "צורה" ? ' class="glyph"' : ""}>${tbl.map((r, i) => `<tr>${r.map(c => i ? `<td>${hl(c)}</td>` : `<th>${hl(c)}</th>`).join("")}</tr>`).join("")}</table></div>`; tbl = null; } };
    for (const l of x.lines) {
      const t = l.trim();
      if (t.startsWith("|")) { if (list) { out += "</ul>"; list = false; } (tbl = tbl || []).push(t.slice(1).split("|").map(c => c.trim())); continue; }
      if (t.startsWith("- ")) { if (tbl) flush(); if (!list) { out += "<ul>"; list = true; } out += `<li>${hl(t.slice(2))}</li>`; continue; }
      { const rk = /^:(קצר|מקור|דוגמה):\s*(.*)$/.exec(t); if (rk) { flush(); rule = true; out += `<div class="rk rk-${({ "קצר": "s", "מקור": "m", "דוגמה": "d" })[rk[1]]}"><b>${({ "קצר": "בקצרה", "מקור": "מקור", "דוגמה": "דוגמה מן המקרא" })[rk[1]]}</b> ${hl(rk[2])}</div>`; continue; } }
      if (t.startsWith("!ציור:")) { flush(); const f = ((window.KK_GRAMMAR || {}).figs || {})[t.slice(6).trim()]; if (f) out += `<figure class="fig">${f}</figure>`; continue; }
      flush(); if (t) out += /^ראו גם/.test(t) ? `<p class="see">${hl(t).replace(/&quot;([^&]+?)&quot;/g, (m, x) => `<a href="#" class="blink" data-gsec="${x}">${x}</a>`)}</p>` : `<p>${hl(t)}</p>`;
    }
    flush();
    return `<section class="bsec lv${x.lv}${rule ? " rule" : ""}" id="${x.id}"><h${x.lv + 2}>${hl(x.title)}${bm ? `<button class="bm${bm.on ? " on" : ""}" data-bm="${x.id}" title="סימנייה" aria-label="סימנייה">${bm.on ? "★" : "☆"}</button>` : ""}</h${x.lv + 2}>${out}</section>`;
  }
  async function showBooks() {
    mode = "books"; tabs(); $("#out").classList.add("wide");
    const lib = [["radak", "ספר השרשים לרד\"ק"], ["bachur", "ספר הבחור"], ["tzachot", "ספר צחות לראב\"ע"]];
    $("#out").innerHTML = `<h2>ספרי דקדוק</h2>
      <section class="card bk"><h3>ספרים שייבאתם</h3><div class="opt"><button class="chip pri" data-m2="rules">📖 כללי הדקדוק (הספר המובנה)</button><button class="chip" data-m2="audio">🔊 השמעת הטעמים</button><button class="chip" data-m2="terms">🔤 מפתח מונחים</button><button class="chip" data-m2="taam">🎼 מפת פסוק לפי הטעמים</button></div>${bookList().filter(b => !b.builtin).map(b => `<div class="opt"><button class="chip pri" data-book="${b.id}">📖 ${esc(b.title)}</button>${b.builtin ? `<small>מובנה בתוסף</small>` : `<button class="ib" data-delbook="${b.id}" title="הסרת הספר" aria-label="הסרת הספר">✕</button>`}</div>`).join("")}
        <div class="opt"><span>ייבוא ספר ידני<small>קובץ טקסט (.txt / .md) או HTML. כותרות: # פרק, ## סעיף (ב-HTML: h1–h3). הספר יופיע גם בספריית אוצריא.</small></span><label class="chip">⬆ ייבוא ספר<input type="file" id="bkfile" accept=".txt,.md,.html,.htm" hidden></label></div></section>
      <section class="card bk wide"><h3>ספרי הדקדוק שבספריית אוצריא</h3><div class="ltiles">${LIBGRAM.map(([t, a, d]) => `<button class="ltile" data-lt="${esc(t)}"><b>${esc(t)}</b><small>${esc(a)}${d ? " · " + esc(d) : ""}</small></button>`).join("")}</div><h4 class="gh">ספרים שהוספתם</h4><div class="ltiles">${(ST.extraGram || []).map(t => `<div class="ltile"><button class="chip" data-lt="${esc(t)}">${esc(t)}</button> <button class="ib" data-delgram="${esc(t)}" title="הסרה מהרשימה" aria-label="הסרה מהרשימה">✕</button></div>`).join("") || `<small class="note">עדיין לא נוספו ספרים.</small>`}</div><div class="opt"><span>הוספת ספר דקדוק מהספרייה<small>שם הספר כפי שהוא מופיע בספריית אוצריא. הספר ייכלל בחיפוש "בספרי הדקדוק שבספרייה".</small></span><input id="addgram" type="search" placeholder="שם הספר"><button class="chip" id="addgramb">הוספה</button></div>${online ? `<h4 class="gh">באתרים (נפתחים בדפדפן)</h4><div class="ltiles">${WEBGRAM.map(([t, d, u]) => `<button class="ltile" data-url="${esc(u)}"><b>${esc(t)} ↗</b><small>${esc(d)}</small></button>`).join("")}</div><p class="note">קישורים חיצוניים; התוכן שם אינו מסונן. מוסתרים כשאוצריא מוגדרת "ללא גישה לאינטרנט".</p>` : ""}<p class="note">נפתחים בקורא של אוצריא, אם הספר קיים בספרייה שלך. מתוך ערך במילון, ספר השרשים וספר הבחור נפתחים ישירות על השורש או המילה.</p></section>`;
    $("#bkfile").onchange = importBook;
    const addG = async () => { const t = $("#addgram").value.trim(); if (!t) return; const b = await findLibBook(t); if (!b) return call("ui.showMessage", { message: `הספר "${t}" לא נמצא בספרייה שלך. בדקו את השם המדויק.` }); if (gramTitles().includes(t)) return call("ui.showMessage", { message: "הספר כבר ברשימה." }); ST.extraGram = [...(ST.extraGram || []), t]; libGramBooks = null; save(); showBooks(); };
    $("#addgramb").onclick = addG; $("#addgram").onkeydown = e => { if (e.key === "Enter") addG(); };
  }
  async function importBook(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    let txt = await f.text();
    if (/\.html?$/i.test(f.name)) { const d = new DOMParser().parseFromString(txt, "text/html"); d.querySelectorAll("script,style").forEach(x => x.remove());
      d.querySelectorAll("h1,h2,h3").forEach(h => h.textContent = "\n" + "#".repeat(+h.tagName[1]) + " " + h.textContent.trim() + "\n");
      d.querySelectorAll("li").forEach(li => li.textContent = "\n- " + li.textContent.trim()); d.querySelectorAll("p,br,div,tr").forEach(x => x.append("\n"));
      txt = d.body.textContent.replace(/\n{3,}/g, "\n\n"); }
    const id = Math.max(1, ...(ST.books || []).map(b => b.id)) + 1, title = f.name.replace(/\.[^.]+$/, "");
    const r = await call("storage.set", { key: "book:" + id, value: txt });
    if (O && (!r || r.success === false)) return call("ui.showMessage", { message: "הספר גדול מדי לשמירה בתוסף" });
    if (!O) memBooks[id] = txt;
    ST.books = [...(ST.books || []), { id, title }]; save(); syncLibrary(); showBooks();
  }
  const memBooks = {};
  async function readBook(id, target) {
    const b = +id === 1 ? BUILTIN : (await getBook(id)) || (memBooks[id] ? { ...(ST.books || []).find(x => x.id === +id), text: memBooks[id] } : null);
    if (!b) return call("ui.showMessage", { message: "הספר לא נמצא" });
    mode = +id === 1 ? "rules" : "books"; tabs(); $("#out").classList.add("wide"); const secs = parseBook(b.text);
    const bmk = () => (ST.bmarks || []).filter(m => m.id === +id), isBm = sid => bmk().some(m => m.sec === sid);
    const bmList = () => { const l = bmk(); return l.length ? `<b>סימניות</b>${l.map(m => `<a href="#" data-sec="${m.sec}" class="lv3">★ ${esc(m.title)}</a>`).join("")}<hr>` : ""; };
    const render = q => {
      const shown = q ? secs.filter(x => (x.title + "\n" + x.lines.join("\n")).includes(q)) : secs;
      $("#bview").innerHTML = (q ? `<p class="note">${shown.length} סעיפים מכילים "${esc(q)}"</p>` : "") + (shown.length ? shown.map(x => secHtml(x, q, { on: isBm(x.id) })).join("") : '<p class="hint">לא נמצא.</p>');
    };
    $("#out").innerHTML = `<div class="reader"><div class="rbar">${+id === 1 ? "" : `<button class="chip" id="bkback">→ ספרים</button>`}<h2>${esc(b.title)}</h2><input id="bq" type="search" placeholder="חיפוש בספר…"><button class="chip" id="bkdl">⬇ הורדה</button><button class="chip" id="bktxt" title="קובץ טקסט פשוט, להעתקה ולשימוש בתוכנות אחרות">⬇ טקסט</button><button class="chip" id="bkpdf">🖨 PDF / הדפסה</button>${+id === 1 ? `<button class="chip" data-m2="terms">🔤 מפתח מונחים</button>` : ""}</div>
      ${b.note ? `<p class="note">${esc(b.note)}</p>` : ""}
      <div class="rgrid"><nav class="toc"><small class="note">לחיצה כפולה על מילה בספר — ניתוח המילה (שורש, בניין, ערך).</small><div id="bml">${bmList()}</div><b>תוכן עניינים</b><input id="tq" type="search" placeholder="חיפוש כותרת…">${secs.map(x => `<a href="#" data-sec="${x.id}" class="lv${x.lv}">${esc(x.title)}</a>`).join("")}</nav><article id="bview"></article></div></div>`;
    render("");
    $("#bq").oninput = deb(e => render(e.target.value.trim()), 250);
    if ($("#bkback")) $("#bkback").onclick = showBooks;
    $("#tq").oninput = e => { const v = e.target.value.trim(); document.querySelectorAll(".toc a").forEach(a => a.classList.toggle("hid", !!v && !a.textContent.includes(v))); };
    const io = "IntersectionObserver" in window ? new IntersectionObserver(es => { for (const x of es) if (x.isIntersecting) { document.querySelectorAll(".toc a.on").forEach(a => a.classList.remove("on")); const a = document.querySelector(`.toc a[data-sec="${x.target.id}"]`); if (a) { a.classList.add("on"); a.scrollIntoView({ block: "nearest" }); } } }, { rootMargin: "-20% 0px -70% 0px" }) : null;
    if (io) document.querySelectorAll("#bview .bsec").forEach(x => io.observe(x));
    $("#bkdl").onclick = () => { const h = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>${esc(b.title)}</title></head><body style="font-family:David,serif;max-width:50em;margin:2em auto;line-height:1.7"><h1>${esc(b.title)}</h1>${b.note ? `<p><i>${esc(b.note)}</i></p>` : ""}${secs.map(x => secHtml(x, "")).join("")}<hr><p>מתוך התוסף "לשון הקודש" לאוצריא. הורדת התוסף: <a href="${LINKS.gh}">GitHub</a> · <a href="${LINKS.store}">חנות התוספים של אוצריא</a></p></body></html>`;
      const el = document.createElement("a"); el.href = URL.createObjectURL(new Blob(["\ufeff" + h], { type: "text/html;charset=utf-8" })); el.download = b.title.replace(/[\\/:*?"<>|]/g, "") + ".html"; document.body.appendChild(el); el.click(); el.remove();
      copyText(`${LINKS.gh}\n${LINKS.store}`); call("ui.showMessage", { message: "הספר הורד; קישורי ההורדה של התוסף הועתקו" }); };
    $("#bktxt").onclick = () => { const clean = t => t.replace(/\[\[([^|\]]+)\|([^\]]*)\]\]/g, (m, a, b2) => a === "חיפוש" ? b2 : a === "פסוק" ? "(" + b2.split("|")[0] + ")" : (b2 ? a + ": " + b2 : a)).replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/^:קצר:\s*/, "בקצרה: ").replace(/^:מקור:\s*/, "מקור: ").replace(/^:דוגמה:\s*/, "דוגמה מן המקרא: ");
      const txt = [b.title, b.note || "", ...secs.flatMap(x => ["", "=".repeat(Math.max(1, 4 - x.lv)) + " " + clean(x.title), ...x.lines.filter(l => !/^!ציור:/.test(l.trim())).map(l => clean(l.trim()).replace(/^\|\s*|\s*\|$/g, "").replace(/\s*\|\s*/g, " | "))]), "", "———", `מתוך התוסף "לשון הקודש" לאוצריא. הורדת התוסף: GitHub ${LINKS.gh} · חנות התוספים של אוצריא ${LINKS.store}`].join("\n").replace(/\n{3,}/g, "\n\n");
      const el = document.createElement("a"); el.href = URL.createObjectURL(new Blob(["\ufeff" + txt], { type: "text/plain;charset=utf-8" })); el.download = b.title.replace(/[\\/:*?"<>|]/g, "") + ".txt"; document.body.appendChild(el); el.click(); el.remove(); call("ui.showMessage", { message: "הספר הורד כקובץ טקסט" }); };
    $("#bkpdf").onclick = async () => { $("#bq").value = ""; render(""); document.body.classList.add("printing"); const f = document.createElement("p"); f.className = "pfoot"; f.textContent = `הורדת התוסף "לשון הקודש": ${LINKS.gh} · ${LINKS.store}`; $("#bview").appendChild(f);
      const r = await call("ui.exportPdf", { fileName: b.title, pageSize: "a4", marginMm: 15 }); if (!r || r.success === false) await call("ui.print", { pageSize: "a4", marginMm: 15 }); document.body.classList.remove("printing"); f.remove(); };
    $("#bview").addEventListener("dblclick", () => { const w = String(window.getSelection() || "").trim().replace(/[^\u0591-\u05C7\u05D0-\u05EA"'״׳]/g, ""); if (/[\u05D0-\u05EA]{2,}/.test(w)) go(w); }); /* 1.10.0: ניתוח מילה מתוך הספר */
    $("#bview").addEventListener("click", e => { const t = e.target.closest("[data-bm]"); if (!t) return; e.preventDefault(); const sid = t.dataset.bm, x = secs.find(y => y.id === sid);
      ST.bmarks = isBm(sid) ? (ST.bmarks || []).filter(m => !(m.id === +id && m.sec === sid)) : [...(ST.bmarks || []), { id: +id, sec: sid, title: x ? x.title : sid }]; save();
      t.classList.toggle("on", isBm(sid)); t.textContent = isBm(sid) ? "★" : "☆"; $("#bml").innerHTML = bmList(); });
    $(".toc").onclick = e => { const a = e.target.closest("[data-sec]"); if (!a) return; e.preventDefault(); if ($("#bq").value) { $("#bq").value = ""; render(""); } const el = document.getElementById(a.dataset.sec); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); ST.lastSec = { id: +id, sec: a.dataset.sec }; save(); };
    const go2 = target ? secs.find(x => x.title.includes(target)) : (ST.lastSec && ST.lastSec.id === +id ? secs.find(x => x.id === ST.lastSec.sec) : null);
    if (go2) setTimeout(() => { const el = document.getElementById(go2.id); if (el) el.scrollIntoView({ block: "start" }); }, 50);
  }
  /* הצגת הספרים בספריית אוצריא (libraryBooks), כדי שיופיעו באיתור הספרים */
  function syncLibrary() { call("library.setProviderBooks", { provider: "klikodesh-dikduk", books: bookList().map(b => ({ id: b.id, title: b.title, categoryPath: "/דקדוק", author: b.builtin ? "לשון הקודש (תוסף)" : "", tags: ["דקדוק", "לשון הקודש", "ניקוד", "טעמים"] })) }); }
  async function openLibTerm(which, term) {
    const [q, must] = LIB[which];
    const f = await call("library.findBooks", { query: q, limit: 10 });
    /* 1.7.0: רק ספר שמתאים בדיוק (קודם נלקח הספר הראשון ברשימה ונפתחו ספרים אחרים) */
    const b = (f.success && Array.isArray(f.data) ? f.data : []).find(x => { const t = String(x.title || x.bookId); return t.includes(q) && must.test(t); });
    if (!b) return call("ui.showMessage", { message: `הספר "${q}" לא נמצא בספרייה שלך.` });
    const hit = term ? (await runSearch(term, { books: [{ bookId: b.bookId, type: b.type || "text" }], limit: 1, order: "catalogue" }))[0] : null;
    const r = hit ? await call("reader.openBook", { id: hit.id, bookId: hit.bookId || b.bookId, type: hit.type, index: hit.index, searchQuery: term })
                  : await call("reader.openBook", { bookId: b.bookId, searchQuery: term || "" });
    if (!r || r.success === false) call("ui.showMessage", { message: `לא ניתן לפתוח את "${b.title || b.bookId}".` });
  }
  /* 1.8.0: פתיחת ספר מהספרייה לפי שמו (התאמה מדויקת לשם), אופציונלית על מונח בתוכו */
  async function openTitle(title, term) {
    const f = await call("library.findBooks", { query: title, limit: 15 }), clean = t => String(t || "").replace(/^ספר /, "").trim(), want = clean(title);
    const list = f.success && Array.isArray(f.data) ? f.data : [];
    const b = list.find(x => clean(x.title) === want) || list.find(x => clean(x.title).startsWith(want));
    if (!b) return call("ui.showMessage", { message: `הספר "${title}" לא נמצא בספרייה שלך.` });
    const hit = term ? (await runSearch(term, { books: [{ bookId: b.bookId, type: b.type || "text" }], limit: 1, order: "catalogue" }))[0] : null;
    const r = hit ? await call("reader.openBook", { id: hit.id, bookId: hit.bookId || b.bookId, type: hit.type, index: hit.index, searchQuery: term })
                  : await call("reader.openBook", { bookId: b.bookId, searchQuery: term || "" });
    if (!r || r.success === false) call("ui.showMessage", { message: `לא ניתן לפתוח את "${b.title || title}".` });
  }
  const WEBGRAM = [["אבן שושן", "המילון המלא (מנוי באתר)", "https://www.even-shoshan.co.il/"], ["האקדמיה ללשון — מילון המונחים", "מונחי דקדוק ולשון", "https://terms.hebrew-academy.org.il/"], ["ויקימילון", "ערכים ונטיות", "https://he.wiktionary.org/"], ["האקדמיה ללשון העברית", "החלטות בדקדוק", "https://hebrew-academy.org.il/topic/hahlatot/grammardecisions/"], ["היברובוקס", "ספרי דקדוק סרוקים (חיפוש באתר)", "https://hebrewbooks.org/"], ["ויקיטקסט", "חיפוש \"דקדוק\"", "https://he.wikisource.org/w/index.php?search=%D7%93%D7%A7%D7%93%D7%95%D7%A7"]];
  /* ספרי הדקדוק שבספריית אוצריא (לפי רשימת הספרייה) */
  const LIBGRAM = [["ספר השרשים", "רד\"ק", "מילון השורשים של המקרא"], ["ספר מכלול", "רד\"ק", "תורת הדקדוק השיטתית"], ["מחברת מנחם", "ר' מנחם בן סרוק", "מילון המקרא הראשון בעברית; שיטת השורש בן שתי אותיות"],
    ["ספר אותיות הנוח (תרגום ראבע)", "ר' יהודה חיוג'", "יסוד שיטת השורש בן שלוש אותיות"], ["ספר אותיות הנוח (תרגום רמבג)", "ר' יהודה חיוג'", ""], ["ספר פעלי הכפל (תרגום ראבע)", "ר' יהודה חיוג'", "השורשים הכפולים (ע\"ע)"], ["ספר פעלי הכפל (תרגום רמבג)", "ר' יהודה חיוג'", ""],
    ["ספר הנקוד (תרגום ראבע, מהדורת נוט)", "ר' יהודה חיוג'", "כללי הניקוד"], ["דקדוקי הטעמים", "ר' אהרן בן אשר", "יסודות הניקוד והטעמים ממסורת טבריה"], ["ספר זכרון", "ר' יוסף קמחי", ""], ["שפת יתר", "ראב\"ע", ""], ["צחות", "ראב\"ע", "ספר צחות"], ["אבן עזרא בראשית שיטה אחרת - דקדוק", "ראב\"ע", ""],
    ["מעשה אפוד", "ר' יצחק ב\"ר משה הלוי", ""], ["בינת מקרא", "ר' מנשה בן פורת", ""], ["רדיפי מיא", "ר' יהודה ליב אדל", ""], ["שפה לנאמנים", "ר' יהודה ליב אדל", ""],
    ["ספר הבחור", "ר' אליהו בחור", ""], ["פרקי אליהו", "ר' אליהו בחור", ""], ["ספר הרכבה", "ר' אליהו בחור", ""]];
  /* 1.9.0: חיפוש המילה בכל ספרי הדקדוק שבספרייה בבת אחת; מוצגים רק ספרים שיש בהם מופע, וכל כפתור נפתח על המופע */
  let libGramBooks = null;
  const gramTitles = () => [...LIBGRAM.map(x => x[0]), ...(ST.extraGram || [])];
  async function findLibBook(t) {
    const clean = x => String(x || "").replace(/^ספר /, "").trim();
    try { const f = await call("library.findBooks", { query: t, limit: 15 }); const l = f && f.success && Array.isArray(f.data) ? f.data : []; const b = l.find(x => clean(x.title) === clean(t)); return b ? { t, bookId: b.bookId, type: b.type || "text" } : null; } catch (e) { return null; }
  }
  async function gramBooks() {
    if (libGramBooks) return libGramBooks;
    return (libGramBooks = (await Promise.all(gramTitles().map(findLibBook))).filter(Boolean));
  }
  /* 1.9.1: אופציה בהגדרות — חיפוש גם בצורות השורש שבמילון (ST.gramRoot); מונה מופעים ותצוגה מקדימה בריחוף */
  async function fillLibHits(w, el) {
    if (!el || !w) return;
    const books = await gramBooks(); if (!books.length) return;
    let forms = [w];
    if (ST.gramRoot) { const an = D.analyze(w); if (an && an.root) forms = [w, ...D.byRoot(an.root).map(x => x.title.replace(/[^\u05D0-\u05EA]/g, ""))].filter((x, i, a) => x && x.length > 1 && a.indexOf(x) === i).slice(0, 8); }
    const bk = books.map(b => ({ bookId: b.bookId, type: b.type }));
    const all = (await Promise.all(forms.map(f => runSearch(f, { books: bk, limit: 60, order: "catalogue" }).then(r => r.map(h => ({ ...h, _q: f }))).catch(() => [])))).flat();
    const per = new Map(); for (const h of all) { const id = h.bookId; if (id == null) continue; const e = per.get(id) || per.set(id, { h, n: 0 }).get(id); e.n++; }
    const hits = books.filter(b => per.has(b.bookId)).map(b => ({ b, ...per.get(b.bookId) }));
    if (!el.isConnected || !hits.length) return;
    const tip = h => { const t = plain(h.text || "").replace(/\s+/g, " ").trim(); const i = t.indexOf(h._q); const s0 = Math.max(0, i - 60); return (s0 ? "…" : "") + t.slice(s0, s0 + 160) + (t.length > s0 + 160 ? "…" : ""); };
    el.innerHTML = `<div class="row inl"><b>בספרי הדקדוק שבספרייה</b><div class="chips">${hits.map(({ b, h, n }) => `<button class="chip" title="${esc(tip(h))}" data-open="${esc(JSON.stringify({ id: h.id, bookId: h.bookId, type: h.type, index: h.index, q: h._q }))}">${esc(b.t)} <small>(${n >= 60 ? "60+" : n})</small></button>`).join("")}</div></div>`;
  }
  /* 1.11.0: חיפוש חדש מתוך התוסף מנקה את הבחירה הקודמת (קודם נשארו "מילים בבחירה" ודף משולב מבחירה ישנה) */
  function clearSel() { selWords = []; selCtx = { raw: "", words: [] }; }
  function searchAll(q) { clearSel();
    const w = KK.norm(q), r = D.find(w), secs = parseBook(BUILTIN.text).filter(x => (x.title + "\n" + x.lines.join("\n")).includes(w));
    mode = "word"; tabs(); cur = r || null; $("#q").value = w;
    if (r) open(r); else lookup(w);
    if (secs.length) $("#out").insertAdjacentHTML("afterbegin", `<div class="row inl"><b>בספר הדקדוק</b><div class="chips">${secs.slice(0, 12).map(x => `<button class="chip" data-gsec="${esc(x.title)}" data-gq="${esc(w)}">📘 ${esc(x.title)}</button>`).join("")}</div></div>`);
  }
  function lookup(text, push = true) {
    if (!selWords.length) selCtx = { raw: text, words: [] };
    const r = D.find(text);
    if (r) return open(r, push), true;
    const mhHits = MH.find(KK.norm(text).split(" "), D);
    mode = "word"; tabs(); cur = null; const w = KK.norm(text);
    $("#out").innerHTML = `<div class="hero"><h2>${esc(w)}</h2></div><p class="hint">אין ערך במאגר. אפשר לחפש במקורות אחרים:</p>` + pleneRow(w) + linksRow(w, mhHits) + `<div id="libhits"></div>` + sugHtml(D.similar(w, 12).map(k => D.get(k)));
    fillLibHits(w, $("#libhits"));
    return false;
  }
  /* 1.8.0: מילה שאינה במאגר — המילה בלבד עם קישורים (בלי הגדרה) */
  const linksRow = (w, hits) => `<div class="row inl"><b>קישורים</b><div class="chips"><button class="chip pri" data-srch="${esc(w)}">${IC.search} חפש באוצריא</button><button class="chip" data-lib2="radak" data-w="${esc(w)}">ספר השרשים לרד"ק</button>${hits.map(h => `<button class="chip" data-mhg="${esc(h.g)}" data-mhn="${esc(h.name)}">עינים למקרא — ${esc(KK.MH_LABEL[h.g] || h.g)}: ${esc(h.name)}${h.byRoot ? " (לפי השורש)" : ""} ↗</button>`).join("")}${online ? `<button class="chip" data-even="${esc(w)}">אבן שושן ↗</button>${Object.keys(EXT).map(k => `<button class="chip" data-ext2="${k}" data-w="${esc(w)}">${EXTN[k]} ↗</button>`).join("")}` : ""}</div></div>`;
  const EXTN = { wiktionary: "ויקימילון", wikisource: "ויקיטקסט", academy: "האקדמיה ללשון" };
  const sugHtml = a => a.length ? `<div class="row"><b>אולי התכוונתם</b><div class="chips">${a.map(x => chip(x.title)).join("")}</div></div>` : "";
  function showRoot(root) {
    mode = "root"; tabs(); const a = D.byRoot(root);
    $("#out").innerHTML = `<h2>שורש: ${esc(root)}</h2><p class="note">רשימה לפי זיהוי שורש אוטומטי (משוער).</p>` +
      (a.length ? (() => { const g = {}; for (const x of a) { const b = (D.analyze(x.n).binyan || "—").split(" (")[0]; (g[b] = g[b] || []).push(x); } return Object.entries(g).map(([b, xs]) => `<div class="row"><b>${esc(b)}</b><div class="chips">${xs.map(x => chip(x.title)).join("")}</div></div>`).join(""); })() : `<p class="hint">לא נמצאו מילים לשורש הזה.</p>`);
  }
  function showFav() {
    mode = "fav"; tabs();
    const items = ST.likes.map(k => { const [n, i] = k.split("#"), r = D.get(n); return r && r.s[+i] ? { r, i: +i, k } : null; }).filter(Boolean);
    $("#out").innerHTML = `<h2>מועדפים</h2>` + (items.length ? `<p><button class="chip" id="favexp">⬇ ייצוא מועדפים</button></p><p class="note">הגדרות שסימנתם 👍. לחיצה על הכותרת פותחת את הערך.</p><div class="senses">${items.map(x =>
      `<div class="sense"><button class="chip pri" data-go="${esc(x.r.title)}">${esc(x.r.title)}</button><div class="sbody">${esc(x.r.s[x.i][1])}</div><div class="tb"><button class="ib on" data-unfav="${esc(x.k)}" title="הסר ממועדפים" aria-label="הסר ממועדפים">${IC.up}</button></div></div>`).join("")}</div>`
      : `<p class="hint">עדיין אין מועדפים. לחצו 👍 על הגדרה כדי לשמור אותה כאן.</p>`);
  }
  function showHist() {
    $("#out").innerHTML = ST.hist.length ? `<div class="hist"><h2>היסטוריה</h2><div class="chips">${ST.hist.map(t => chip(t)).join("")}</div><p><button class="chip" id="clrh">נקה היסטוריה</button></p></div>` : `<p class="hint">אין היסטוריה עדיין.</p>`;
  }
  function showSet() {
    const sw = (id, on) => `<input type="checkbox" class="sw" id="${id}" ${on ? "checked" : ""}>`;
    const seg = (id, opts, val) => `<div class="seg" id="${id}">${opts.map(([v, t]) => `<button data-v="${v}" class="${String(val) === String(v) ? "on" : ""}">${t}</button>`).join("")}</div>`;
    const opt = (t, sub, ctl) => `<div class="opt"><span>${t}${sub ? `<small>${sub}</small>` : ""}</span>${ctl}</div>`;
    $("#out").innerHTML = `<h2>הגדרות</h2><div class="set">
     <section class="card"><h3>זיהוי בזמן לימוד</h3>
      ${opt("זיהוי אוטומטי", "מילה שמסמנים בספר מזוהה מעצמה", sw("s-auto", ST.auto))}
      ${opt("אופן הצגה", "מה קורה כשמילה מזוהה", seg("s-mode", [["toast", "הודעה"], ["panel", "פתיחת המילון"], ["off", "כבוי"]], ST.mode))}
      ${opt("אורך ההודעה הקופצת", "הודעה קצרה נעלמת מהר יותר. אוצריא קובעת את זמן ההצגה ואינה מאפשרת לתוסף לשנותו", seg("s-tlen", [["short", "קצרה"], ["normal", "רגילה"]], ST.tLen || "normal"))}
      ${opt("השמטת ראשי תיבות מההודעה", "מונע הצפה בערכים כמו א\"א", sw("s-noacr", ST.noAcr))}
      ${opt("מקסימום מילים בבחירה", "", seg("s-max", [[1, "1"], [2, "2"], [3, "3"], [4, "4"], [6, "6"], [8, "8"]], ST.maxWords))}
     </section>
     <section class="card"><h3>תצוגה</h3>
      ${opt("מצב קומפקטי", "סרגלים, כותרות ואריחים צפופים יותר — למסכים קטנים", sw("s-cmp", ST.compact))}
      ${opt("גודל גופן", "", seg("s-fs", [[90, "קטן"], [100, "רגיל"], [115, "גדול"], [130, "גדול מאוד"]], ST.fs || 100))}
      ${opt("חיפוש בספרי הדקדוק לפי שורש", "כבוי: רק הצורה המדויקת. פועל: גם צורות אחרות של השורש שבמילון (איטי יותר)", sw("s-groot", ST.gramRoot))}
      ${opt("הצעת כתיב מלא / חסר", "בערך מוצגות גם צורות בכתיב אחר שקיימות במילון (משל / מושל)", sw("s-plene", ST.plene !== false))}
      ${opt("תרגול", "לשונית תרגול (רשות): זיהוי שורש ובניין של מילים מהמילון", sw("s-pr", ST.practice))}
      ${opt("קונקורדנציה בכל הספרייה", "כבוי (ברירת מחדל): מופעים מהתנ\"ך בלבד", sw("s-conc", ST.concAll))}
      ${opt("מיקום סרגל האותיות", "בתצוגת \"כל המילים\"", seg("s-side", [[0, "למעלה"], [1, "בצד"]], ST.azSide ? 1 : 0))}
      ${opt("סרגל האותיות פתוח כברירת מחדל", "", sw("s-fopen", ST.fOpen))}
     </section>
     <section class="card"><h3>הנקדן המקומי</h3>
      ${opt("ניקוד הבחירה בעזרת הנקדן", "כשהתוסף \"הנקדן\" פועל, המילה מנוקדת לפי המשפט, וכך נבחר הפירוש הנכון (למשל אָשֵׁר / אֲשֶׁר)", sw("s-nak", ST.nakdan))}
      <div class="opt"><span id="nak-st">בודק חיבור…</span><span class="chips"><button class="chip" id="nak-copy">📋 העתקת קישור להורדה</button></span></div>
      <p class="note">הנקדן הוא תוסף אוצריא נפרד (באדיבות יוסף שלום בן שטרית) שאינו בחנות; מורידים אותו מהפורום: ${KKNakdan.FORUM}</p>
     </section>
     <section class="card"><h3>קיצורים</h3><p class="note">Ctrl+Alt+M על מילה מסומנת פותח את המילון. אפשר לשנות במסך ההגדרות של אוצריא ← קיצורי מקשים. יש גם כפתור בסרגל הקורא.</p></section></div>`;
    const segOn = (id, f) => $("#" + id).onclick = e => { const b = e.target.closest("button"); if (!b) return; $("#" + id).querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); f(b.dataset.v); save(); };
    segOn("s-mode", v => ST.mode = v); segOn("s-tlen", v => ST.tLen = v); segOn("s-max", v => ST.maxWords = +v);
    segOn("s-fs", v => { ST.fs = +v; applyFs(); }); segOn("s-side", v => ST.azSide = v === "1");
    $("#s-auto").onchange = e => { ST.auto = e.target.checked; save(); };
    $("#s-nak").onchange = e => { ST.nakdan = e.target.checked; save(); };
    $("#s-groot").onchange = e => { ST.gramRoot = e.target.checked; save(); };
    $("#s-plene").onchange = e => { ST.plene = e.target.checked; save(); };
    $("#s-conc").onchange = e => { ST.concAll = e.target.checked; save(); };
    $("#s-pr").onchange = e => { ST.practice = e.target.checked; save(); prTab(); };
    $("#nak-copy").onclick = () => { copyText(KKNakdan.FORUM); call("ui.showMessage", { message: "הקישור הועתק" }); };
    KKNakdan.scan(true).then(p => { const el = $("#nak-st"); if (el) el.textContent = p ? "🟢 הנקדן מחובר" : "⚪ הנקדן לא מחובר — המילון פועל כרגיל"; });
    $("#s-cmp").onchange = e => { ST.compact = e.target.checked; applyFs(); save(); };
    $("#s-noacr").onchange = e => { ST.noAcr = e.target.checked; save(); };
    $("#s-fopen").onchange = e => { ST.fOpen = e.target.checked; fOpen = ST.fOpen; save(); };
  }
  function showAll(letter, more) {
    mode = "all"; tabs(); if (letter) { allLetter = letter; allShown = 0; } if (!more) allShown = Math.max(allShown, PAGE);
    const L = unf(allLetter), list = D.keys.filter(k => unf(k[0]) === L && !k.includes(" "));
    const part = list.slice(0, allShown).map(k => D.get(k));
    const az = `<div class="fbar${fOpen ? "" : " hid"}"><div class="az">${LETTERS.map(l => `<button class="chip ${l === allLetter ? "pri" : ""}" data-letter="${l}">${l}</button>`).join("")}</div></div>`;
    $("#out").classList.add("wide");
    $("#out").innerHTML = `<div class="allhead"><h2>כל המילים</h2><button class="ftoggle ${fOpen ? "" : "on"}" id="ftog" aria-expanded="${fOpen}">${fOpen ? "✕ סגירת הסינון" : "☰ סינון לפי אות"}</button></div>
      ${fOpen ? "" : `<div class="fsum">אות: ${allLetter} · ${list.length.toLocaleString("he")} ערכים</div>`}
      <div class="${ST.azSide && fOpen ? "allwrap" : ""}">${az}<div class="allbody">${fOpen ? `<p class="note">${list.length.toLocaleString("he")} ערכים באות ${allLetter}</p>` : ""}
      <div class="tiles">${part.map(r => `<button class="tile" data-go="${esc(r.title)}"><b>${esc(r.title)}</b><small>${esc((r.s[0] || [])[1] || "")}</small></button>`).join("")}</div>` +
      (allShown < list.length ? `<p style="text-align:center"><button class="chip pri" id="more">הצג עוד (${(list.length - allShown).toLocaleString("he")})</button></p>` : "") + `</div></div>`;
  }
  const LETTERS = "אבגדהוזחטיכלמנסעפצקרשת".split(""), PAGE = 120; /* 1.7.0: הוחזרו — חסרו מאז 1.3.0 ולכן "כל המילים" לא נפתחה */
  const unf = s => s.replace(/[ךםןףץ]/g, c => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" }[c]));
  async function genReport() {
    const note = await new Promise(res => { const d = document.createElement("div"); d.className = "modal";
      d.innerHTML = `<div class="mbox"><h3>משוב או דיווח כללי</h3><textarea id="gtxt" rows="6" placeholder="כתבו כאן הצעה, תקלה או הערה…"></textarea><div class="chips"><button class="chip pri" id="gok">שליחה</button><button class="chip" id="gno">ביטול</button></div></div>`;
      document.body.appendChild(d); d.querySelector("#gtxt").focus();
      d.onclick = e => { if (e.target.id === "gok") { res(d.querySelector("#gtxt").value.trim()); d.remove(); } else if (e.target.id === "gno" || e.target === d) { res(""); d.remove(); } }; });
    if (!note) return;
    const details = `משוב כללי:\n${note}\nתוסף: לשון הקודש ${window.KK_VERSION || ""}`;
    let r = await call("feedback.report", { details, reportType: "general" });
    if (!r || r.success === false) r = await call("feedback.report", { details, reportType: "content" });
    call("ui.showMessage", { message: r && r.success !== false ? "תודה! המשוב נשלח" : "השליחה נכשלה" });
  }
  function showAbout() {
    mode = "about"; tabs();
    $("#out").innerHTML = `<div class="about"><h2>לשון הקודש</h2><p class="note">מילון, שורשים וקונקורדנציה לתנ"ך, מבוססי מאגר כליקודש (לשעבר "מילון כליקודש" / "קונקורדנציה").</p><p>גרסה ${esc(window.KK_VERSION || "")} · ${D.keys.length.toLocaleString("he")} ערכים</p>
     <p><button class="chip pri" id="genrep">✉ שליחת משוב או דיווח כללי</button></p>
     <h3>על המילון</h3><p>התוסף נבנה על פי מאגר המילון של פרויקט כליקודש (KleiKodeshProject), בקובץ הנושא את השם milon-klei-kodesh (גרסת המאגר: 13.10.2026). כל ההגדרות, הנרדפים, הניגודים וראשי התיבות לקוחים ממנו, והמקור של כל הגדרה מצוין בערך עצמו. אין בתוסף תוכן מילוני נוסף.</p><p><b>נוספו:</b> קישורי הכרטסות מבוססים על רשימת שמות הערכים של התוסף "עינים למקרא" מאת חד בדרא (שמות בלבד; התוכן נשאר אצלם).</p>
     <p class="note"><b>שימו לב:</b> המאגר עדיין צריך סינון, ותהליך הסינון טרם הסתיים. ייתכנו בו ערכים לא מילוניים (כגון שמות פרטיים), הגדרות כפולות או לא מדויקות, וערכים חסרים.</p>
     <p class="note">השורשים והבניינים אינם חלק מהמאגר. הם הערכה אוטומטית של התוסף ועלולים לטעות.</p>
     <h3>תוכנית עבודה ושיפורים מתוכננים</h3><details class="more"><summary>הצג את מסמך התכנון</summary><div class="rmdoc">${window.KK_ROADMAP || "<p>המסמך אינו זמין.</p>"}</div></details>
     <h3>יומן שינויים</h3><div class="rmdoc">${window.KK_CHANGELOG || "<p>היומן אינו זמין.</p>"}</div></div>`;
  }

  function report(r, i) {
    if (!r || !r.s[i]) return; const [nk, d, src] = r.s[i];
    const m = document.createElement("div"); m.className = "modal";
    m.innerHTML = `<div class="box"><h3>דיווח על הגדרה בערך: ${esc(r.title)}</h3><p class="note">${esc(d)}</p>
      <label>סיבה: <select id="rr"><option>ערך או הגדרה לא מילוניים</option><option>הגדרה שגויה או לא מדויקת</option><option>הגדרה כפולה</option><option>תוכן לא ראוי</option><option>אחר</option></select></label>
      <textarea id="rn" rows="3" placeholder="הערה (לא חובה)"></textarea>
      <p class="note" id="rm">הדיווח יישלח למפתח התוסף דרך אוצריא, רק לאחר אישור שלך בחלון האישור.</p>
      <div class="pager"><button class="chip" id="rc">סגירה</button><button class="chip pri" id="rs">שליחה</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector("#rc").onclick = () => m.remove(); m.onclick = e => { if (e.target === m) m.remove(); };
    m.querySelector("#rs").onclick = async () => {
      const note = m.querySelector("#rn").value.trim(), why = m.querySelector("#rr").value;
      const details = `ערך: ${r.title}\nהגדרה מס' ${i + 1}: ${d}${nk ? " [" + nk + "]" : ""}${src ? "\nמקור ההגדרה: " + src : ""}\nסיבה: ${why}${note ? "\nהערה: " + note : ""}\nתוסף: לשון הקודש ${window.KK_VERSION || ""}`;
      const res = await call("feedback.report", { details, reportType: "content" });
      const st = res && res.success ? res.data : null;
      m.querySelector("#rm").textContent = st === "sent" ? "הדיווח נשלח. תודה!" : st === "queued" ? "הדיווח נשמר ויישלח אוטומטית כשיהיה חיבור." : st === "cancelled" ? "השליחה בוטלה." : "לא ניתן לשלוח כרגע.";
      if (st === "sent" || st === "queued") setTimeout(() => m.remove(), 1600);
    };
  }
  function copyText(t) { const fb = () => { const x = document.createElement("textarea"); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand("copy"); } catch (e2) {} x.remove(); }; try { navigator.clipboard.writeText(t).catch(fb); return; } catch (e) { const x = document.createElement("textarea"); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand("copy"); } catch (e2) {} x.remove(); } }
  /* חיפוש באוצריא: פסוקים ומקורות/מפרשים קשורים, עם קישורים לפתיחה בקורא */
  async function runSearch(q, extra) {
    let res = [];
    try {
      const it = O.call("search.query", { query: q, limit: 14, mode: "exact", options: { "קידומות דקדוקיות": true }, ...extra });
      let it2 = it; if (it2 && typeof it2.then === "function" && !it2[Symbol.asyncIterator]) { const z = await it2; if (z && (z[Symbol.asyncIterator] || (z.data && z.data[Symbol.asyncIterator]))) it2 = z[Symbol.asyncIterator] ? z : z.data; else it2 = z; }
      // ה-chunk הראשון נושא רק ספירות; קוראים עד שמגיעים ל-limit או לסוף הזרם (תיקון 1.1.0)
      const lim = (extra && extra.limit) || 14;
      if (it2 && it2[Symbol.asyncIterator]) { for await (const ch of it2) { res = res.concat((ch && ch.results) || []); if (res.length >= lim) break; } }
      else { const x = it2; res = (x && (x.data && x.data.results || x.data)) || []; }
    } catch (e) { res = []; }
    if (!res.length) { // גיבוי: search.fullText (בלי id; reader.openBook מקבל bookId+type)
      try { const x = await call("search.fullText", { query: q, limit: (extra && extra.limit) || 14 }); if (x && x.success && Array.isArray(x.data)) res = x.data.map(y => ({ ...y, bookId: y.bookId || y.book, reference: y.reference || y.book })); } catch (e) {}
    }
    return Array.isArray(res) ? res : [];
  }
  const dec = t => { let x = String(t || ""); for (let k = 0; k < 2 && /&[#a-z0-9]+;/i.test(x); k++) { const e = document.createElement("textarea"); e.innerHTML = x; x = e.value; } return x; };
  const plain = t => dec(String(t || "").replace(/<[^>]+>/g, ""));
  const snip = (t, n = 220) => esc(plain(t).slice(0, n));
  /* 1.8.0: המילה מודגשת בתוך הפסוק, בלי תלות בניקוד ובטעמים */
  const hlForm = (t, f) => { const h = esc(plain(t)); if (!f) return h; const N = "[\u0591-\u05C7]*", L = [...KK.norm(f).replace(/[^\u05D0-\u05EA]/g, "")];
    if (!L.length) return h; const fin = c => ({ "כ": "[כך]", "מ": "[מם]", "נ": "[נן]", "פ": "[פף]", "צ": "[צץ]" }[c] || c);
    try { return h.replace(new RegExp("([\u05D0-\u05EA]" + N + "){0,3}" + L.map(fin).join(N) + N, "g"), m => `<mark>${m}</mark>`); } catch (e) { return h; } };
  async function related(r) {
    const box = $("#rel"); box.innerHTML = '<p class="note"><span class="spin"></span>מחפש באוצריא…</p>';
    const q = r.title.replace(/[^\u05D0-\u05EA ]/g, "").trim() || r.n;
    const bks = await tanakhBooks(), v = (await runSearch(q, bks ? { books: bks, limit: 40, order: "catalogue" } : { categories: ["/תנך"], limit: 40 })).filter(isTanakh).slice(0, 8), o = await runSearch(q, { limit: 30 });
    const key = x => x.id + "#" + x.index, vs = new Set(v.map(key)), others = o.filter(x => !vs.has(key(x))).slice(0, 10);
    const card = x => `<a class="res" href="#" data-open='${esc(JSON.stringify({ id: x.id, bookId: x.bookId, type: x.type, index: x.index, q: r.n }))}'><b>${esc(x.reference || x.book || "")}</b><span>${snip(x.text)}</span></a>`;
    box.innerHTML = (v.length ? `<div class="row"><b>פסוקים (${v.length})</b><div class="results">${v.map(card).join("")}</div></div>` : "") +
      (others.length ? `<div class="row"><b>מקורות ומפרשים (${others.length})</b><div class="results">${others.map(card).join("")}</div></div>` : "") +
      (!v.length && !others.length ? '<p class="hint">לא נמצאו תוצאות, או שהחיפוש אינו זמין כרגע.</p>' : "");
  }
  function tabs() {
    if (mode !== "all") $("#out").classList.remove("wide"); document.querySelectorAll("#modes button").forEach(b => b.classList.toggle("on", b.dataset.m === mode)); }

  /* חיפוש תוך כדי הקלדה */
  function renderSug() {
    const box = $("#sug");
    if (!sugList.length) return box.classList.add("hid");
    box.innerHTML = sugList.map((r, i) => `<div data-i="${i}" class="${i === sugIdx ? "act" : ""}">${esc(r.title)}<small>${esc((r.s[0] || [])[1] || "").slice(0, 50)}</small></div>`).join("");
    box.classList.remove("hid");
  }
  let picked = 0; // אחרי Enter/בחירה לא פותחים מחדש את רשימת ההצעות (תיקון 1.1.0)
  const onType = deb(() => {
    if (Date.now() - picked < 250) return;
    const v = $("#q").value; $("#clr").classList.toggle("hid", !v);
    if (!KK.norm(v)) { sugList = []; return renderSug(); }
    if (mode === "root") { sugList = []; renderSug(); return showRoot(KK.norm(v)); }
    sugList = D.suggest(v, 12); sugIdx = -1; renderSug();
  }, 60);

  document.addEventListener("click", e => {
    if (!e.target.closest(".search")) { sugList = []; renderSug(); }
    const t = e.target.closest("[data-go],[data-root],[data-i],[data-mhg],[data-rep],[data-copy],[data-like],[data-open],[data-unfav],[data-comb],[data-lib],[data-book],[data-delbook],[data-delgram],[data-libopen],[data-gram],[data-ext],[data-ext2],[data-url],[data-m2],[data-srch],[data-lib2],[data-even],[data-lt],[data-cf],[data-gsec],[data-psk],[data-mhs],#genrep,#oconc,#oeven,#favexp,#osearch,#orel,#ftog,[data-letter],#more,#back,#clrh,#modes button,#clr"); if (!t) return;
    if (t.dataset.mhg) openMh(t.dataset.mhg, t.dataset.mhn);
    else if (t.dataset.rep !== undefined) report(cur, +t.dataset.rep);
    else if (t.dataset.copy !== undefined) { const s = cur.s[+t.dataset.copy]; copyText(`${cur.title}: ${s[1]}`); }
    else if (t.dataset.like !== undefined) { const k = cur.n + "#" + t.dataset.like; ST.likes = ST.likes.includes(k) ? ST.likes.filter(x => x !== k) : [...ST.likes, k]; save(); t.classList.toggle("on"); }
    else if (t.dataset.unfav) { ST.likes = ST.likes.filter(x => x !== t.dataset.unfav); save(); showFav(); }
    else if (t.dataset.open) { e.preventDefault(); const o = JSON.parse(t.dataset.open); call("reader.openBook", { id: o.id, bookId: o.bookId, type: o.type, index: o.index, searchQuery: o.q }); }
    else if (t.id === "osearch") call("reader.openSearchTab", { query: cur.title.replace(/[^\u05D0-\u05EA ]/g, ""), autoSearch: true });
    else if (t.id === "orel") related(cur);
    else if (t.id === "oconc") showConc(cur);
    else if (t.id === "oeven") openEven();
    else if (t.dataset.ext) openExt(t.dataset.ext);
    else if (t.dataset.url) call("app.openUrl", { url: t.dataset.url });
    else if (t.dataset.m2 === "rules") { mode = "rules"; readBook(1); }
    else if (t.dataset.m2 === "taam") showTaam("");
    else if (t.dataset.m2 === "terms") showTerms();
    else if (t.dataset.m2 === "audio") { mode = "audio"; tabs(); window.KKAudio && KKAudio.show($("#out")); }
    else if (t.dataset.ext2) call("app.openUrl", { url: EXT[t.dataset.ext2](t.dataset.w) });
    else if (t.dataset.srch) { e.preventDefault(); call("reader.openSearchTab", { query: t.dataset.srch, autoSearch: true }); }
    else if (t.dataset.lib2) openLibTerm(t.dataset.lib2, D.analyze(t.dataset.w).root ? KK.refinal(D.analyze(t.dataset.w).root) : t.dataset.w);
    else if (t.dataset.even) { copyText(t.dataset.even); call("app.openUrl", { url: "https://www.even-shoshan.co.il/" }); call("ui.showMessage", { message: "המילה הועתקה — הדביקו אותה בחיפוש של אבן שושן" }); }
    else if (t.dataset.delgram) { e.preventDefault(); ST.extraGram = (ST.extraGram || []).filter(x => x !== t.dataset.delgram); libGramBooks = null; save(); showBooks(); }
    else if (t.dataset.lt) { e.preventDefault(); openTitle(t.dataset.lt, t.dataset.lq || ""); }
    else if (t.dataset.cf !== undefined) {}
    else if (t.dataset.gsec) readBook(1, t.dataset.gsec);
    else if (t.dataset.psk) { e.preventDefault(); openVerse(t.dataset.psk); }
    else if (t.dataset.mhs) call("plugin.openOther", { pluginId: KK.MH_ID, param: { section: t.dataset.mhs, term: t.dataset.w } }).then(r => { if (!r || !r.success) call("ui.showMessage", { message: "לא ניתן לפתוח את עינים למקרא. ודאו שהתוסף מותקן ומופעל." }); });
    else if (t.id === "genrep") genReport();
    else if (t.dataset.lib) { if (cur) openLib(t.dataset.lib); }
    else if (t.dataset.book) readBook(t.dataset.book);
    else if (t.dataset.gram) readBook(1, t.dataset.gram);
    else if (t.dataset.libopen) openLibTerm(t.dataset.libopen, "");
    else if (t.dataset.delbook) { const id = +t.dataset.delbook; ST.books = (ST.books || []).filter(b => b.id !== id); call("storage.set", { key: "book:" + id, value: null }); save(); syncLibrary(); showBooks(); }
    else if (t.id === "ftog") { fOpen = !fOpen; showAll(null, true); }
    else if (t.dataset.letter) { showAll(t.dataset.letter); }
    else if (t.id === "more") { allShown += PAGE; showAll(null, true); }
    else if (t.dataset.go) { if (!t.closest(".selrow")) clearSel(); $("#sug").classList.add("hid"); lookup(t.dataset.go); }
    else if (t.dataset.root) showRoot(t.dataset.root);
    else if (t.dataset.i) { clearSel(); const r = sugList[+t.dataset.i]; picked = Date.now(); $("#q").value = r.title; sugList = []; renderSug(); open(r); }
    else if (t.id === "back") { const n = stack.pop(); if (n) open(D.get(n), false); }
    else if (t.id === "favexp") exportFav();
    else if (t.dataset.comb) showCombined(selWords, selCtx.raw);
    else if (t.id === "clrh") { ST.hist = []; save(); showHist(); }
    else if (t.id === "clr") { $("#q").value = ""; sugList = []; renderSug(); $("#clr").classList.add("hid"); $("#q").focus(); }
    else if (t.closest("#modes")) { mode = t.dataset.m; tabs(); if (mode === "all") showAll(); else if (mode === "about") showAbout(); else if (mode === "hist") showHist(); else if (mode === "fav") showFav(); else if (mode === "set") showSet(); else if (mode === "books") showBooks(); else if (mode === "rules") readBook(1); else if (mode === "pr") showPractice(); else if (mode === "root") $("#out").innerHTML = `<p class="hint">הקלידו שורש (למשל: שלמ) וראו את כל המילים מאותו שורש.</p>`; else if (cur) open(cur, false); }
  });
  $("#q").addEventListener("input", onType);
  $("#q").addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sugIdx = (sugIdx + (e.key === "ArrowDown" ? 1 : -1) + sugList.length) % (sugList.length || 1); renderSug(); }
    else if (e.key === "Enter") { picked = Date.now(); clearSel(); const r = sugList[sugIdx] || null; sugList = []; renderSug(); if (r) { $("#q").value = r.title; open(r); } else if (mode === "root") showRoot(KK.norm($("#q").value)); else lookup($("#q").value); }
    else if (e.key === "Escape") { sugList = []; renderSug(); }
  });

  function applyFs() { document.documentElement.style.fontSize = (ST.fs || 100) + "%"; document.body.classList.toggle("compact", !!ST.compact); hdr(); }
  /* גובה הכותרת הצמודה — כדי שתוכן העניינים וסרגל הספר ייצמדו מתחתיה */
  function hdr() { const h = document.querySelector("header"); if (h) document.documentElement.style.setProperty("--hdr", h.offsetHeight + "px"); }
  window.addEventListener("resize", hdr);
  const LINKS = { gh: "https://github.com/Hadabadra/KLI-MULON/releases/latest", store: "https://otzaria.org/plugins/6ade7923afc55cf35f057cf1" };
  function exportFav() {
    const items = ST.likes.map(k => { const [n, i] = k.split("#"), r = D.get(n); return r && r.s[+i] ? `<h3>${esc(r.title)}</h3><p>${esc(r.s[+i][1])}</p>` : ""; }).join("");
    const html = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>מועדפים — מילון כליקודש</title></head><body style="font-family:David,serif;max-width:50em;margin:2em auto"><h1>מועדפים — מילון כליקודש</h1>${items}<hr><p>הורדת התוסף: <a href="${LINKS.gh}">GitHub</a> · <a href="${LINKS.store}">חנות התוספים של אוצריא</a></p></body></html>`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + html], { type: "text/html;charset=utf-8" })); a.download = "milon-favorites.html"; document.body.appendChild(a); a.click(); a.remove();
    copyText(`${LINKS.gh}\n${LINKS.store}`);
  }
  /* 2.0: [[פסוק|בראשית א ג]] או [[פסוק|בראשית א ג|מילה]] — פתיחת הפסוק באוצריא. עם מילה: חיפוש המילה בספר ובחירת המופע שההפניה שלו היא הפסוק; בלי מילה — נפתח הספר וההפניה מועתקת */
  const refNorm = t => plain(t).replace(/^ספר /, "").replace(/[,:.()\-–]/g, " ").replace(/(^| )(פרק|פסוק)(?= )/g, " ").replace(/\s+/g, " ").trim();
  async function openVerse(spec) {
    const [ref, word] = String(spec || "").split("|").map(x => x.trim()), r0 = refNorm(ref);
    const bk = [...TNK].sort((a, b) => b.length - a.length).find(t => r0 === t || r0.startsWith(t + " ")) || (r0.startsWith("ישעיה ") ? "ישעיהו" : r0.startsWith("ירמיה ") ? "ירמיהו" : "");
    const b = bk && (await findLibBook(bk) || (bk === "תהלים" ? await findLibBook("תהילים") : null));
    if (!b) return call("ui.showMessage", { message: `הספר של "${ref}" לא נמצא בספרייה` });
    const cv = r0.slice(bk.length).trim();
    if (word) { const hits = await runSearch(word, { books: [{ bookId: b.bookId, type: b.type }], limit: 5000, order: "catalogue" });
      const h = hits.find(x => { const z = refNorm(x.reference || ""); return z === r0 || z.endsWith(" " + cv) && z.includes(bk); });
      if (h) return call("reader.openBook", { id: h.id, bookId: h.bookId, type: h.type, index: h.index, searchQuery: word }); }
    copyText(ref); await call("reader.openBook", { bookId: b.bookId, type: b.type, ref, reference: ref });
    call("ui.showMessage", { message: `נפתח ספר ${bk}; ההפניה "${ref}" הועתקה` });
  }
  /* 2.0: מפתח מונחים — מכותרות הסעיפים ומההדגשות שבספר הדקדוק, בסדר אלפביתי; כל מונח מקשר לסעיף */
  function termIndex() {
    const m = new Map(), put = (t, sec) => { t = t.replace(/[.,;:]+$/, "").trim(); if (t.length < 2 || t.split(" ").length > 5 || /\d|^(הרחבה|דוגמה|מקור|בקצרה|הערה)$/.test(t)) return; const a = m.get(t) || m.set(t, []).get(t); if (!a.includes(sec)) a.push(sec); };
    for (const x of gsecs()) { if (x.lv < 2) continue; put(x.title.replace(/^כלל( [א-ת]['׳]?)?:\s*/, "").replace(/\s*\([^)]*\)\s*$/, ""), x.title);
      for (const l of x.lines) for (const b of l.matchAll(/\*\*([^*]+)\*\*/g)) put(b[1], x.title); }
    return [...m].sort((a, b) => a[0].replace(/[^א-ת ]/g, "").localeCompare(b[0].replace(/[^א-ת ]/g, ""), "he"));
  }
  function showTerms() {
    mode = "rules"; tabs(); $("#out").classList.add("wide"); const ti = termIndex(), g = {};
    for (const [t, secs] of ti) { const k = (t.replace(/[^א-ת]/g, "")[0] || "#"); (g[k] = g[k] || []).push([t, secs]); }
    $("#out").innerHTML = `<div class="chead"><h2>מפתח מונחים</h2><button class="chip" data-m2="rules">← לספר</button><button class="chip" id="tidl">⬇ טקסט</button></div><p class="note">${ti.length} מונחים מכותרות הסעיפים ומן ההדגשות בספר "${esc(BUILTIN.title)}". לחיצה פותחת את הסעיף.</p><input id="tiq" type="search" placeholder="סינון מונחים…">` +
      Object.entries(g).map(([k, l]) => `<div class="row ti"><b>${esc(k)}</b><div class="chips">${l.map(([t, secs]) => `<span class="tie"><button class="chip" data-gsec="${esc(secs[0])}" title="${esc(secs.join(" · "))}">${esc(t)}</button>${secs.slice(1, 4).map((x, i) => `<a href="#" class="blink" data-gsec="${esc(x)}" title="${esc(x)}">${i + 2}</a>`).join("")}</span>`).join("")}</div></div>`).join("");
    $("#tiq").oninput = e => { const v = e.target.value.trim(); document.querySelectorAll(".tie").forEach(x => x.classList.toggle("hid", !!v && !x.textContent.includes(v))); };
    $("#tidl").onclick = () => { const txt = [`מפתח מונחים — ${BUILTIN.title}`, "", ...ti.map(([t, secs]) => `${t} — ${secs.join("; ")}`), "", "———", `מתוך התוסף "לשון הקודש" לאוצריא. הורדת התוסף: GitHub ${LINKS.gh} · חנות התוספים של אוצריא ${LINKS.store}`].join("\n");
      const el = document.createElement("a"); el.href = URL.createObjectURL(new Blob(["\ufeff" + txt], { type: "text/plain;charset=utf-8" })); el.download = "מפתח מונחים.txt"; document.body.appendChild(el); el.click(); el.remove(); call("ui.showMessage", { message: "מפתח המונחים הורד כקובץ טקסט" }); };
  }
  /* 2.0: תרגול (רשות, כבוי כברירת מחדל) — זיהוי שורש ובניין. רק פעלים שלמים בעבר נסתר, שהניקוד שלהם (מהמילון) תואם בדיוק את תבנית הבניין — והשורש נלקח מהתבנית עצמה */
  const PR_BIN = ["קל", "נפעל", "פיעל", "הפעיל", "הופעל", "התפעל"], PL = "([א-ת])", PD = "\u05BC?";
  const PR_PAT = [["קל", "^" + PL + PD + "\u05B8" + PL + "\u05B7" + PL + "$"], ["נפעל", "^נ\u05B4" + PL + "\u05B0" + PL + "\u05B8" + PL + "$"], ["פיעל", "^" + PL + PD + "\u05B4" + PL + "\u05BC\u05B5" + PL + "$"],
    ["הפעיל", "^ה\u05B4" + PL + "\u05B0" + PL + "\u05B4י" + PL + "$"], ["הופעל", "^ה\u05BB" + PL + "\u05B0" + PL + "\u05B7" + PL + "$"], ["התפעל", "^ה\u05B4ת\u05B0" + PL + PD + "\u05B7" + PL + "\u05BC\u05B5" + PL + "$"]].map(([b, re]) => [b, new RegExp(re)]);
  const prRand = a => a[Math.floor(Math.random() * a.length)], prShuf = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  function prItem() {
    for (let k = 0; k < 3000; k++) { const r = D.get(prRand(D.keys)); if (!r || /[^א-ת]/.test(r.n) || r.n.length < 3) continue;
      for (const sn of r.s) { if (sn[2] !== "מילון עברי") continue; const v = String(sn[0] || "").normalize("NFC").replace(/[\u0591-\u05AF\u05BD\u05C1\u05C2]/g, "");
        for (const [bin, re] of PR_PAT) { const m = re.exec(v); if (m && !/[אהחעריו]/.test(m[1] + m[2] + m[3]) && m[2] !== m[3]) return { r, root: KK.refinal(m[1] + m[2] + m[3]), bin }; } } }
    return null;
  }
  function prTab() { let b = document.querySelector('#modes [data-m="pr"]'); if (!b) { b = document.createElement("button"); b.dataset.m = "pr"; b.textContent = "תרגול"; $("#modes").insertBefore(b, document.querySelector('#modes [data-m="hist"]')); } b.classList.toggle("hid", !ST.practice); }
  function showPractice() {
    mode = "pr"; tabs(); if (window.KKB && KKB.pr()) return; /* 2.0: כרטיסיות שינון / תרגול ניקוד — js/ideas-b.js */ const it = prItem(), sc = ST.prScore || { ok: 0, n: 0 };
    if (!it) { $("#out").innerHTML = '<p class="hint">לא נמצאה מילה לתרגול. נסו שוב.</p>'; return; }
    const isRoot = Math.random() < 0.6 && KK.norm(it.r.title) !== it.root, right = isRoot ? it.root : it.bin;
    const pool = isRoot ? [...new Set(Array.from({ length: 12 }, () => (prItem() || {}).root).filter(x => x && x !== right))].slice(0, 3) : prShuf(PR_BIN.filter(x => x !== right)).slice(0, 3);
    const opts = prShuf([right, ...pool]);
    $("#out").innerHTML = `<h2>תרגול</h2>${window.KKB ? KKB.prBar("root") : ""}<p class="note">רשות. המילים — פעלים שלמים בעבר, שהניקוד שלהם במילון תואם את תבנית הבניין; השורש נלקח מהתבנית.</p>
      <section class="card pr"><p class="prw">${esc(it.r.title)}</p><p>${isRoot ? "מהו השורש?" : "באיזה בניין?"}</p><div class="chips" id="pra">${opts.map(o => `<button class="chip" data-pa="${esc(o)}">${esc(o)}</button>`).join("")}</div><div id="prr"></div></section>
      <p class="note" id="prs">ציון: ${sc.ok} מתוך ${sc.n} <a href="#" id="prz">איפוס</a></p>`;
    $("#pra").onclick = e => { const b = e.target.closest("[data-pa]"); if (!b || $("#pra").dataset.done) return; $("#pra").dataset.done = 1; const ok = b.dataset.pa === right;
      ST.prScore = { ok: sc.ok + (ok ? 1 : 0), n: sc.n + 1 }; save();
      $("#pra").querySelectorAll("button").forEach(x => { x.disabled = true; x.classList.toggle("pri", x.dataset.pa === right); x.classList.toggle("bad", x === b && !ok); });
      $("#prr").innerHTML = `<p>${ok ? "✓ נכון" : "✗ התשובה: " + esc(right)} · שורש ${esc(it.root)} · ${esc(it.bin)}</p><div class="chips"><button class="chip pri" id="prn">שאלה הבאה ←</button><button class="chip" data-go="${esc(it.r.title)}">פתיחת הערך</button></div>`;
      $("#prs").firstChild.textContent = `ציון: ${ST.prScore.ok} מתוך ${ST.prScore.n} `; $("#prn").onclick = showPractice; };
    $("#prz").onclick = e => { e.preventDefault(); ST.prScore = { ok: 0, n: 0 }; save(); showPractice(); };
  }
  /* 2.0: סעיפי ספר הדקדוק לפי מילות מפתח בכותרת (הספר משתנה — לכן חיפוש לפי מילים ולא לפי מספר סעיף) */
  let GSECS = null; const gsecs = () => GSECS || (GSECS = parseBook(BUILTIN.text));
  const secFor = keys => { for (const k of keys || []) { const x = gsecs().find(y => y.title.includes(k)); if (x) return x.title; } return ""; };
  const tagHtml = tags => tags.map(g => { const st = secFor(g.sec), lb = esc(g.t) + (g.q && !/\?/.test(g.t) ? "?" : ""); return st ? `<button class="chip tg${g.q ? " q" : ""}" data-gsec="${esc(st)}" title="${esc(st)}">${lb}</button>` : `<span class="chip tg${g.q ? " q" : ""}">${lb}</span>`; }).join("");
  const hasTaam = t => /[\u0591-\u05AE]/.test(t || ""), hasNikud = t => /[\u05B0-\u05BC\u05C7]/.test(t || "");
  /* 2.0: מפת פסוק לפי הטעמים + ניתוח הניקוד לכל מילה */
  function showTaam(text) {
    mode = "word"; tabs(); cur = null; $("#out").classList.add("wide");
    const t = String(text || "").trim(), r = t ? KK.taamMap(t) : { error: "empty" };
    /* חלק שנחתם באותו מפסיק כמו האב הוא "המשך" — בלי שם טעם חוזר */
    const node = (n, pe) => { const words = r.units.slice(n.from, n.to + 1).map(u => esc(u.text)).join(" ");
      return `<div class="tnode lv${Math.min(n.end.lv, 4)}"><div class="thead"><span class="tw">${words}</span>${n.end === pe ? "" : `<small>${esc(n.end.name || "")}</small>`}</div>${n.kids ? `<div class="tkids">${n.kids.map(k => node(k, n.end)).join("")}</div>` : ""}</div>`; };
    const msg = { notaam: "בטקסט אין טעמי מקרא. בחרו פסוק מוטעם מספר התנ\"ך.", emet: "זהו פסוק בטעמי אמ\"ת (תהלים, משלי, איוב) — המפה תומכת כרגע רק בטעמי כ\"א ספרים.", empty: "הדביקו פסוק מנוקד ומוטעם." }[r.error];
    const ws = t.replace(/[\u05C3:]\s*$/, "").split(/\s+/).filter(w => w && !/^[|\u05C0]$/.test(w));
    $("#out").innerHTML = `<h2>מפת הפסוק לפי הטעמים</h2><p class="note">חלוקה דיכוטומית לפי דרגות המפסיקים: סילוק ואתנחתא, ואחריהם סגולתא, זקף וטפחא, רביע, זרקא, פשטא ותביר, ולבסוף גרש, פזר, קרני פרה ותלישא גדולה. בכל חלק — המפסיק שחותם אותו. טעמי כ"א ספרים בלבד.</p>` +
      (msg ? `<p class="hint">${msg}</p>` : `<div class="tmap">${node(r.tree, null)}</div>`) + IA("qk", t) +
      (hasNikud(t) ? `<h3>ניתוח הניקוד והטעמים</h3><p class="note">נגזר מהסימנים עצמם. "?" — מקרה מסופק או שנחלקו בו. לחיצה על תגית פותחת את הכלל בספר הדקדוק.</p><div class="senses">${ws.map((w, i) => { const tg = KK.nikudAnalyze(w, i === ws.length - 1); return `<div class="sense"><b class="nw">${esc(w)}</b><div class="chips">${tagHtml(tg) || '<small class="note">—</small>'}</div></div>`; }).join("")}</div>` : "") +
      `<div class="row"><textarea id="tmq" rows="2" placeholder="הדביקו פסוק מנוקד ומוטעם…">${esc(t)}</textarea><button class="chip pri" id="tmgo">🎼 הצג מפה</button></div>`;
    $("#tmgo").onclick = () => showTaam($("#tmq").value);
  }
  /* 2.0: "הכלל במשפט" — לכל מילה בדף המשולב, סעיפי הספר לפי הניתוח (בניין, גזרה, אותיות השימוש) */
  const BIN = ["התפעל", "הופעל", "הפעיל", "נפעל", "פיעל", "פועל"], GZ = { 'ל"ה': 'נחי ל"ה', 'פ"נ': 'חסרי פ"נ', 'ע"ו': 'נחי ע"ו', 'ע"ע': "כפולים", 'פ"י': 'פ"י ופ"ו' };
  const PARTICLES = new Set("את אשר על אל כי לא כל מן עם גם אך רק הנה אם או כן עד בין אין יש זה זאת אלה הוא היא הם הן אני אתה".split(" "));
  function ruleTags(word, an, t) {
    const out = [], b = String((an && an.binyan) || ""), w = String(word || "").normalize("NFC"), M = "[\\u0591-\\u05C7]*";
    const hey = new RegExp("^(ו" + M + ")?ה\\u05B7" + M + "[א-ת][\\u0591-\\u05BB\\u05BD\\u05C1\\u05C2\\u05C7]*\\u05BC").test(w);
    if (new RegExp("^ו\\u05B7" + M + "[יתנ][\\u0591-\\u05BB\\u05BD\\u05C1\\u05C2\\u05C7]*\\u05BC|^ו\\u05B8" + M + "א").test(w)) out.push({ t: "ו' ההיפוך", sec: ["ו' ההיפוך"] });
    else if (/^ו/.test(w) && t && t.length > 2 && D.find(t.slice(1))) out.push({ t: "ו' החיבור", sec: ["ו' החיבור"] });
    if (hey) out.push({ t: "ה' הידיעה", sec: ["ה' הידיעה"] });
    /* בניין וגזרה — מהזיהוי האוטומטי (משוער, מסומן ?); לא למילות יחס ולא לשם עם ה' הידיעה */
    const base = t && /^ו/.test(t) && D.find(t.slice(1)) ? t.slice(1) : t;
    if (an && an.ok && an.src === "rd" && !hey && base && base.length > 2 && !PARTICLES.has(base) && D.find(t)) {
      const nm = BIN.find(x => b.includes(x)) || (/^קל/.test(b) ? "קל" : "");
      if (nm && !b.includes(" / ") && !b.includes(" או ")) out.push({ t: "בניין " + nm, sec: nm === "קל" ? ["טבלת נטייה מלאה: בניין קל", "הבניינים"] : ["הבניינים"], q: true });
      const g = (/\(([^)]+)\)/.exec(b) || [])[1]; if (GZ[g]) out.push({ t: "גזרת " + g, sec: [GZ[g], "הגזרות"], q: true });
    }
    return out;
  }
  /* דף משולב: כשבבחירה כמה מילים — הסבר קצר לכל מילה בדף אחד (דיווח משתמש 26.10.2026) */
  function showCombined(words, raw) {
    mode = "word"; tabs(); cur = null; const ctx = { raw: raw || "", words };
    const rw = String(raw || "").replace(/[\u05C3:]\s*$/, "").split(/\s+/).filter(Boolean), rawOf = t => rw.find(x => KK.norm(x).split(" ").includes(t)) || ""; /* 2.0: המילה המנוקדת מתוך הבחירה */
    const rules = t => { const x = rawOf(t), tg = [...ruleTags(x, D.analyze(t), t), ...(hasNikud(x) ? KK.nikudAnalyze(x, x === rw[rw.length - 1]) : [])]; return tg.length ? `<div class="chips rules">${tagHtml(tg)}</div>` : ""; };
    const rows = words.map(t => { const r = D.find(t); if (!r) return `<div class="sense"><b>${esc(t)}</b><div class="sbody note">⚠ לא זוהתה — אין ערך במילון (בדקו כתיב או ניקוד)</div>${rules(t)}</div>`;
      const rk = KK.rank(r, ctx), pick = (rk.confident ? rk.best : rk.items.filter(x => x.kind !== "acr")).slice(0, 2);
      return `<div class="sense${r.n.includes(" ") ? " best" : ""}"><button class="chip pri" data-go="${esc(r.title)}">${r.n.includes(" ") ? "ביטוי: " : ""}${esc(r.title)}</button><div class="sbody">${(() => { const a = D.analyze(r.n); return a && a.root ? `<small class="note">שורש ${esc(KK.refinal(a.root))}${a.binyan ? " · " + esc(String(a.binyan).split(" (")[0]) : ""}${a.ok ? "" : " (משוער)"}</small><br>` : ""; })()}${pick.map(x => esc(r.s[x.i][1])).join("<br>")}</div>${rules(t)}</div>`; }).join("");
    $("#out").innerHTML = `<h2>${esc(KK.norm(raw || words.join(" ")))}</h2><p class="note">ניתוח המשפט: לכל מילה — שורש ובניין (זיהוי אוטומטי, משוער) ופירוש; מילה שלא זוהתה מסומנת ⚠. לחיצה על מילה פותחת את הערך המלא. התגיות — הכלל במשפט: לחיצה פותחת את הסעיף בספר הדקדוק.</p>${IA("qk", raw)}${hasTaam(raw) ? `<p><button class="chip pri" id="taambtn">🎼 מפת הפסוק לפי הטעמים</button></p>` : ""}<div class="senses">${rows}</div>${window.KKB ? KKB.aram(words, raw) : ""}`;
    if ($("#taambtn")) $("#taambtn").onclick = () => showTaam(raw);
  }

  /* זיהוי אוטומטי: בחירה, תפריט הקשר, לחיצה על הודעה, פתיחה עם פרמטר */
  async function applySel(text) {
    text = await KKNakdan.voc(text, ST.nakdan);
    const rs = D.resolve(text, ST.maxWords), list = rs.phrase ? [rs.phrase] : [...rs.phrases, ...rs.words.filter(w => !rs.phrases.some(p => p.n.split(" ").includes(w.n)))];
    if (!list.length) { const hh = MH.find(KK.norm(text).split(" "), D); if (hh.length) { $("#q").value = KK.norm(text); showMhOnly(text, hh); } return; }
    selCtx = { raw: text, words: KK.norm(text).split(" ") }; selWords = rs.phrase ? [] : list.map(x => x.title); $("#q").value = list[0].title; if (rs.phrases.length && list.length > 1) return showCombined(selWords, text); open(list[0]);
  }
  const fromSel = deb(async d => {
    let t = d && (d.text || d.selectedText); const g = await call("reader.getSelection"); let raw = t; if (g.success && g.data) { t = g.data.text || t; raw = g.data.sourceSelectedText || g.data.renderedSelectedText || t; }
    const n = KK.norm(t); if (n && n.split(" ").length <= ST.maxWords) { const r = D.find(n); if (!(cur && r && cur.n === r.n)) applySel(raw); }
  }, 300);
  function go(word, words, raw) { if (!word) return; if (Array.isArray(words) && words.length > 1) { selWords = words; selCtx = { raw: raw || "", words }; $("#q").value = word; return showCombined(words, raw); } selWords = Array.isArray(words) ? words : []; selCtx = { raw: raw || "", words: selWords.length ? selWords : [word] }; $("#q").value = word; lookup(word); }
  if (O) {
    O.on("plugin.boot", p => { if (p && p.theme) theme(p.theme); else call("app.getTheme").then(r => r && r.success && theme(r.data)); const prm = p && (p.param || p.params); if (prm && prm.word) go(prm.word, prm.words, prm.raw); });
    O.on("theme.changed", theme);
    O.on("reader.selection_changed", fromSel);
    O.on("reader.context_menu_item_clicked", d => { const t = (d && (d.selectedText || (d.selection && d.selection.text))) || ""; if (t) applySel(t); });
    O.on("reader.toolbar_item_clicked", async () => { const g = await call("reader.getSelection"); const t = g.success && g.data && (g.data.sourceSelectedText || g.data.text); if (t) applySel(t); else $("#q").focus(); });
    O.on("app.command", async d => { if (d && d.command === "lookup") { const g = await call("reader.getSelection"); const t = g.success && g.data && (g.data.sourceSelectedText || g.data.text); if (t) applySel(t); } });
    /* 1.8.0: תיבת סימון בחלון החיפוש של אוצריא (כמו בעינים למקרא) — חיפוש במילון ובספר הדקדוק */
    O.on("search.requested", d => { const q = String((d && d.request && d.request.query) || (d && d.query) || "").trim(); if (q) searchAll(q); });
    O.on("library.providerBook.openRequested", d => { const id = d && (d.id || (d.book && d.book.id)); if (id) readBook(id); });
    O.on("ui.messageClicked", d => d && d.payload && go(d.payload.word, d.payload.words, d.payload.raw));
    O.on("plugin.page_opened", p => { const prm = p && (p.param || p.params); if (prm && prm.word) go(prm.word, prm.words, prm.raw); });
  }
  window.KKA = Object.assign(window.KKA || {}, { D, call, esc, plain, TNK, bookOf, copyText, LINKS, PARTICLES, getST: () => ST }); /* 2.0: חיבור ל-js/ideas-a.js */
  window.KKAPP = Object.assign(window.KKAPP || {}, { st: () => ST, D, save, call, esc, chip, showPractice }); /* 2.0: ממשק לקבצי ההרחבה (js/ideas-*.js) */
  checkOnline(); load().then(() => { syncLibrary(); fOpen = !!ST.fOpen; applyFs(); prTab(); $("#q").focus(); });
})();
