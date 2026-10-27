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

  const mhRow = hits => hits.length ? `<div class="row"><b>בעינים למקרא</b><div class="chips">${hits.map(h => `<button class="chip pri" data-mhg="${esc(h.g)}" data-mhn="${esc(h.name)}">${esc(KK.MH_LABEL[h.g] || h.g)}: ${esc(h.name)} ↗</button>`).join("")}</div><span class="note">נפתח בכרטסת של התוסף "עינים למקרא" (צריך להיות מותקן).</span></div>` : "";
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
       <div class="hero"><h2>${esc(r.title)}</h2></div>` +
      (selWords.length > 1 ? `<div class="row"><b>מילים בבחירה</b><div class="chips"><button class="chip" data-comb="1">📋 דף משולב</button>${selWords.map(t => chip(t, "", t === r.title ? "pri" : "")).join("")}</div></div>` : "") +
      `<div class="row"><div class="chips"><button class="chip pri" id="osearch">${IC.search} חפש באוצריא</button><button class="chip" id="orel">📖 פסוקים ומפרשים קשורים</button><button class="chip" id="oconc">📚 קונקורדנציה לתנ"ך</button></div></div><div id="rel"></div>` +
      (isAcr ? "" : `<div class="row"><b>במילוני הספרייה</b><div class="chips"><button class="chip" data-lib="radak">ספר השרשים לרד"ק — שורש ${esc(KK.refinal(root))}</button><button class="chip" data-lib="bachur">ספר הבחור</button>${online ? `<button class="chip" id="oeven">אבן שושן ↗</button><button class="chip" data-ext="wiktionary">ויקימילון ↗</button><button class="chip" data-ext="wikisource">ויקיטקסט ↗</button><button class="chip" data-ext="academy">האקדמיה ללשון ↗</button>` : ""}</div>${online ? `<span class="note">קישורים חיצוניים בלבד, נפתחים בדפדפן ומוסתרים רק כשאוצריא מוגדרת "ללא גישה לאינטרנט". התוכן שם אינו מסונן. אבן שושן — מנוי באתר, והמילה מועתקת להדבקה.</span>` : ""}</div>`) +
      sensesHtml(r) +
      Object.entries(links).map(([k, a]) => chipRow(k.replace("_", " "), a)).join("") +
      mhRow(isAcr ? [] : MH.find([r.n, ...(selCtx.words || [])], D)) +
      (isAcr ? "" :       `<div class="row"><b>${an.ok ? (an.src === "rd" ? "שורש (מאומת מול ספר השרשים) · בניין משוער" : "שורש (נמצא במילון) · בניין משוער") : "שורש משוער, לא מאומת"}</b><div class="chips"><button class="chip pri" data-root="${esc(root)}">שורש: ${esc(KK.refinal(root))}</button>${(an.alts || []).map(x => `<button class="chip" data-root="${esc(x)}">או: ${esc(KK.refinal(x))}</button>`).join("")}<button class="chip" data-gram="הבניינים">📘 ${esc(bin)} — בדקדוק</button></div>
       <span class="note">זיהוי השורש והבניין הוא הערכה אוטומטית ועלול לטעות.</span></div>`) +
      chipRow("מאותו שורש", same.map(x => x.title)) + chipRow("מילים דומות", sim.map(x => x.title)) +
      `<div class="pager">${nb.prev ? chip(nb.prev.title, "", "") .replace(">", ">→ ") : "<span></span>"}${nb.next ? chip(nb.next.title).replace(">", ">← ") : ""}</div>`;
    $("#out").scrollTop = 0; window.scrollTo(0, 0);
  }
  /* מילונים מתוך ספריית אוצריא (רד"ק, ספר הבחור): מאתרים את הספר ופותחים אותו על השורש/המילה */
  const LIB = { radak: ["ספר השרשים", /רד"?ק|רדק/], bachur: ["ספר הבחור", /^ספר הבחור/], tzachot: ["צחות", /צחות/] };
  async function openLib(which) { return openLibTerm(which, which === "radak" ? KK.refinal(D.analyze(cur.n).root) : cur.title.replace(/[^\u05D0-\u05EA ]/g, "")); }
  /* קונקורדנציה לתנ"ך: כל צורות השורש שבמילון, וכל המופעים שלהן בתנ"ך מתוך ספריית אוצריא */
  async function showConc(r) {
    mode = "conc"; tabs(); const an = D.analyze(r.n); $("#out").classList.add("wide");
    const forms = [r.title.replace(/[^א-ת]/g, ""), KK.refinal(an.root), ...D.byRoot(an.root).map(x => x.title.replace(/[^א-ת]/g, ""))].filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 16);
    $("#out").innerHTML = `<h2>קונקורדנציה: ${esc(r.title)}</h2><p class="note">שורש ${esc(KK.refinal(an.root))}${an.ok ? "" : " (משוער)"} · ${forms.length} צורות · ${ST.concAll ? "מכל ספריית אוצריא" : "מתוך ספרי התנ\"ך בלבד"}, כולל קידומות. <a href="#" id="cscope">${ST.concAll ? "הגבל לתנ\"ך" : "חפש בכל הספרייה"}</a></p><div class="row"><div class="search mini"><input id="cq" placeholder="הוסיפו צורה לחיפוש…"></div></div><div id="cforms" class="chips"></div><div id="conc"><p class="note"><span class="spin"></span>אוסף מופעים…</p></div>`;
    const card = (x, q) => `<a class="res" href="#" data-open='${esc(JSON.stringify({ id: x.id, bookId: x.bookId, type: x.type, index: x.index, q }))}'><b>${esc(plain(x.reference || x.book || ""))}</b><span>${hlForm(x.text, q)}</span></a>`;
    const out = [], box = () => $("#conc"); let pick = "";
    const draw = () => {
      const total = out.reduce((t, x) => t + x.res.length, 0), fb = $("#cforms"); if (!box()) return;
      fb.innerHTML = `<button class="chip ${pick ? "" : "pri"}" data-cf="">הכל · ${total}</button>` + out.filter(x => x.res.length).map(x => `<button class="chip ${pick === x.f ? "pri" : ""}" data-cf="${esc(x.f)}">${esc(x.f)} · ${x.res.length}${ST.concAll && x.res.length >= CMAX ? "+" : ""}</button>`).join("");
      const shown = out.filter(x => !pick || x.f === pick);
      box().innerHTML = `<div class="results conc">${shown.map(x => x.res.map(y => card(y, x.f)).join("")).join("")}</div>` +
        (out.some(x => !x.res.length) ? `<p class="note">ללא מופעים ${ST.concAll ? "" : "בתנ\"ך"}: ${out.filter(x => !x.res.length).map(x => esc(x.f)).join(", ")}</p>` : "");
    };
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
  const EXT = { wiktionary: w => "https://he.wiktionary.org/wiki/" + encodeURIComponent(w), wikisource: w => "https://he.wikisource.org/w/index.php?search=" + encodeURIComponent(w), academy: w => "https://hebrew-academy.org.il/?s=" + encodeURIComponent(w) };
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
  function secHtml(x, q) {
    const hl = t => { let h = esc(t).replace(/\[\[([^|\]]+)\|([^\]]*)\]\]/g, (m, a, b) => a === "חיפוש" ? `<a href="#" class="blink" data-srch="${b}">🔍 ${b}</a>` : `<a href="#" class="blink" data-lt="${a}" data-lq="${b}">${b ? a + ": " + b : a} ↗</a>`).replace(/\[\[([^\]]+)\]\]/g, (m, a) => `<a href="#" class="blink" data-lt="${a}">${a} ↗</a>`).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>"); if (q) { const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"); h = h.replace(re, m => `<mark>${m}</mark>`); } return h; };
    let out = "", list = false, tbl = null;
    const flush = () => { if (list) { out += "</ul>"; list = false; } if (tbl) { out += `<div class="tblw"><table>${tbl.map((r, i) => `<tr>${r.map(c => i ? `<td>${hl(c)}</td>` : `<th>${hl(c)}</th>`).join("")}</tr>`).join("")}</table></div>`; tbl = null; } };
    for (const l of x.lines) {
      const t = l.trim();
      if (t.startsWith("|")) { if (list) { out += "</ul>"; list = false; } (tbl = tbl || []).push(t.slice(1).split("|").map(c => c.trim())); continue; }
      if (t.startsWith("- ")) { if (tbl) flush(); if (!list) { out += "<ul>"; list = true; } out += `<li>${hl(t.slice(2))}</li>`; continue; }
      if (t.startsWith("!ציור:")) { flush(); const f = ((window.KK_GRAMMAR || {}).figs || {})[t.slice(6).trim()]; if (f) out += `<figure class="fig">${f}</figure>`; continue; }
      flush(); if (t) out += /^ראו גם/.test(t) ? `<p class="see">${hl(t).replace(/&quot;([^&]+?)&quot;/g, (m, x) => `<a href="#" class="blink" data-gsec="${x}">${x}</a>`)}</p>` : `<p>${hl(t)}</p>`;
    }
    flush();
    return `<section class="bsec lv${x.lv}" id="${x.id}"><h${x.lv + 2}>${hl(x.title)}</h${x.lv + 2}>${out}</section>`;
  }
  async function showBooks() {
    mode = "books"; tabs(); $("#out").classList.add("wide");
    const lib = [["radak", "ספר השרשים לרד\"ק"], ["bachur", "ספר הבחור"], ["tzachot", "ספר צחות לראב\"ע"]];
    $("#out").innerHTML = `<h2>ספרי דקדוק</h2>
      <section class="card bk"><h3>בספרייה המובנית</h3>${bookList().map(b => `<div class="opt"><button class="chip pri" data-book="${b.id}">📖 ${esc(b.title)}</button>${b.builtin ? `<small>מובנה בתוסף</small>` : `<button class="ib" data-delbook="${b.id}" title="הסרת הספר" aria-label="הסרת הספר">✕</button>`}</div>`).join("")}
        <div class="opt"><span>ייבוא ספר ידני<small>קובץ טקסט (.txt / .md) או HTML. כותרות: # פרק, ## סעיף (ב-HTML: h1–h3). הספר יופיע גם בספריית אוצריא.</small></span><label class="chip">⬆ ייבוא ספר<input type="file" id="bkfile" accept=".txt,.md,.html,.htm" hidden></label></div></section>
      <section class="card bk wide"><h3>ספרי הדקדוק שבספריית אוצריא</h3><div class="ltiles">${LIBGRAM.map(([t, a, d]) => `<button class="ltile" data-lt="${esc(t)}"><b>${esc(t)}</b><small>${esc(a)}${d ? " · " + esc(d) : ""}</small></button>`).join("")}</div><p class="note">נפתחים בקורא של אוצריא, אם הספר קיים בספרייה שלך. מתוך ערך במילון, ספר השרשים וספר הבחור נפתחים ישירות על השורש או המילה.</p></section>`;
    $("#bkfile").onchange = importBook;
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
    mode = "books"; tabs(); $("#out").classList.add("wide"); const secs = parseBook(b.text);
    const render = q => {
      const shown = q ? secs.filter(x => (x.title + "\n" + x.lines.join("\n")).includes(q)) : secs;
      $("#bview").innerHTML = (q ? `<p class="note">${shown.length} סעיפים מכילים "${esc(q)}"</p>` : "") + (shown.length ? shown.map(x => secHtml(x, q)).join("") : '<p class="hint">לא נמצא.</p>');
    };
    $("#out").innerHTML = `<div class="reader"><div class="rbar"><button class="chip" id="bkback">→ ספרים</button><h2>${esc(b.title)}</h2><input id="bq" type="search" placeholder="חיפוש בספר…"><button class="chip" id="bkdl">⬇ הורדה</button><button class="chip" id="bkpdf">🖨 PDF / הדפסה</button></div>
      ${b.note ? `<p class="note">${esc(b.note)}</p>` : ""}
      <div class="rgrid"><nav class="toc"><b>תוכן עניינים</b><input id="tq" type="search" placeholder="חיפוש כותרת…">${secs.map(x => `<a href="#" data-sec="${x.id}" class="lv${x.lv}">${esc(x.title)}</a>`).join("")}</nav><article id="bview"></article></div></div>`;
    render("");
    $("#bq").oninput = deb(e => render(e.target.value.trim()), 250);
    $("#bkback").onclick = showBooks;
    $("#tq").oninput = e => { const v = e.target.value.trim(); document.querySelectorAll(".toc a").forEach(a => a.classList.toggle("hid", !!v && !a.textContent.includes(v))); };
    const io = "IntersectionObserver" in window ? new IntersectionObserver(es => { for (const x of es) if (x.isIntersecting) { document.querySelectorAll(".toc a.on").forEach(a => a.classList.remove("on")); const a = document.querySelector(`.toc a[data-sec="${x.target.id}"]`); if (a) { a.classList.add("on"); a.scrollIntoView({ block: "nearest" }); } } }, { rootMargin: "-20% 0px -70% 0px" }) : null;
    if (io) document.querySelectorAll("#bview .bsec").forEach(x => io.observe(x));
    $("#bkdl").onclick = () => { const h = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><title>${esc(b.title)}</title></head><body style="font-family:David,serif;max-width:50em;margin:2em auto;line-height:1.7"><h1>${esc(b.title)}</h1>${b.note ? `<p><i>${esc(b.note)}</i></p>` : ""}${secs.map(x => secHtml(x, "")).join("")}<hr><p>מתוך התוסף "לשון הקודש" לאוצריא. הורדת התוסף: <a href="${LINKS.gh}">GitHub</a> · <a href="${LINKS.store}">חנות התוספים של אוצריא</a></p></body></html>`;
      const el = document.createElement("a"); el.href = URL.createObjectURL(new Blob(["\ufeff" + h], { type: "text/html;charset=utf-8" })); el.download = b.title.replace(/[\\/:*?"<>|]/g, "") + ".html"; document.body.appendChild(el); el.click(); el.remove();
      copyText(`${LINKS.gh}\n${LINKS.store}`); call("ui.showMessage", { message: "הספר הורד; קישורי ההורדה של התוסף הועתקו" }); };
    $("#bkpdf").onclick = async () => { $("#bq").value = ""; render(""); document.body.classList.add("printing"); const f = document.createElement("p"); f.className = "pfoot"; f.textContent = `הורדת התוסף "לשון הקודש": ${LINKS.gh} · ${LINKS.store}`; $("#bview").appendChild(f);
      const r = await call("ui.exportPdf", { fileName: b.title, pageSize: "a4", marginMm: 15 }); if (!r || r.success === false) await call("ui.print", { pageSize: "a4", marginMm: 15 }); document.body.classList.remove("printing"); f.remove(); };
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
  /* ספרי הדקדוק שבספריית אוצריא (לפי רשימת הספרייה) */
  const LIBGRAM = [["ספר השרשים", "רד\"ק", "מילון השורשים של המקרא"], ["ספר מכלול", "רד\"ק", "תורת הדקדוק השיטתית"], ["מחברת מנחם", "ר' מנחם בן סרוק", "מילון המקרא הראשון בעברית; שיטת השורש בן שתי אותיות"],
    ["ספר אותיות הנוח (תרגום ראבע)", "ר' יהודה חיוג'", "יסוד שיטת השורש בן שלוש אותיות"], ["ספר אותיות הנוח (תרגום רמבג)", "ר' יהודה חיוג'", ""], ["ספר פעלי הכפל (תרגום ראבע)", "ר' יהודה חיוג'", "השורשים הכפולים (ע\"ע)"], ["ספר פעלי הכפל (תרגום רמבג)", "ר' יהודה חיוג'", ""],
    ["ספר הנקוד (תרגום ראבע, מהדורת נוט)", "ר' יהודה חיוג'", "כללי הניקוד"], ["דקדוקי הטעמים", "ר' אהרן בן אשר", "יסודות הניקוד והטעמים ממסורת טבריה"], ["ספר זכרון", "ר' יוסף קמחי", ""], ["שפת יתר", "ראב\"ע", ""], ["צחות", "ראב\"ע", "ספר צחות"], ["אבן עזרא בראשית שיטה אחרת - דקדוק", "ראב\"ע", ""],
    ["מעשה אפוד", "ר' יצחק ב\"ר משה הלוי", ""], ["בינת מקרא", "ר' מנשה בן פורת", ""], ["רדיפי מיא", "ר' יהודה ליב אדל", ""], ["שפה לנאמנים", "ר' יהודה ליב אדל", ""],
    ["ספר הבחור", "ר' אליהו בחור", ""], ["פרקי אליהו", "ר' אליהו בחור", ""], ["ספר הרכבה", "ר' אליהו בחור", ""]];
  function searchAll(q) {
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
    $("#out").innerHTML = `<div class="hero"><h2>${esc(w)}</h2></div><p class="hint">אין ערך במאגר. אפשר לחפש במקורות אחרים:</p>` + linksRow(w, mhHits) + sugHtml(D.similar(w, 12).map(k => D.get(k)));
    return false;
  }
  /* 1.8.0: מילה שאינה במאגר — המילה בלבד עם קישורים (בלי הגדרה) */
  const linksRow = (w, hits) => `<div class="row inl"><b>קישורים</b><div class="chips"><button class="chip pri" data-srch="${esc(w)}">${IC.search} חפש באוצריא</button><button class="chip" data-lib2="radak" data-w="${esc(w)}">ספר השרשים לרד"ק</button>${hits.map(h => `<button class="chip" data-mhg="${esc(h.g)}" data-mhn="${esc(h.name)}">עינים למקרא — ${esc(KK.MH_LABEL[h.g] || h.g)}: ${esc(h.name)} ↗</button>`).join("")}${online ? `<button class="chip" data-even="${esc(w)}">אבן שושן ↗</button>${Object.keys(EXT).map(k => `<button class="chip" data-ext2="${k}" data-w="${esc(w)}">${EXTN[k]} ↗</button>`).join("")}` : ""}</div></div>`;
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
    $("#s-conc").onchange = e => { ST.concAll = e.target.checked; save(); };
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
    const t = e.target.closest("[data-go],[data-root],[data-i],[data-mhg],[data-rep],[data-copy],[data-like],[data-open],[data-unfav],[data-comb],[data-lib],[data-book],[data-delbook],[data-libopen],[data-gram],[data-ext],[data-ext2],[data-srch],[data-lib2],[data-even],[data-lt],[data-cf],[data-gsec],[data-mhs],#genrep,#oconc,#oeven,#favexp,#osearch,#orel,#ftog,[data-letter],#more,#back,#clrh,#modes button,#clr"); if (!t) return;
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
    else if (t.dataset.ext2) call("app.openUrl", { url: EXT[t.dataset.ext2](t.dataset.w) });
    else if (t.dataset.srch) { e.preventDefault(); call("reader.openSearchTab", { query: t.dataset.srch, autoSearch: true }); }
    else if (t.dataset.lib2) openLibTerm(t.dataset.lib2, D.analyze(t.dataset.w).root ? KK.refinal(D.analyze(t.dataset.w).root) : t.dataset.w);
    else if (t.dataset.even) { copyText(t.dataset.even); call("app.openUrl", { url: "https://www.even-shoshan.co.il/" }); call("ui.showMessage", { message: "המילה הועתקה — הדביקו אותה בחיפוש של אבן שושן" }); }
    else if (t.dataset.lt) { e.preventDefault(); openTitle(t.dataset.lt, t.dataset.lq || ""); }
    else if (t.dataset.cf !== undefined) {}
    else if (t.dataset.gsec) readBook(1, t.dataset.gsec);
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
    else if (t.dataset.go) { $("#sug").classList.add("hid"); lookup(t.dataset.go); }
    else if (t.dataset.root) showRoot(t.dataset.root);
    else if (t.dataset.i) { const r = sugList[+t.dataset.i]; picked = Date.now(); $("#q").value = r.title; sugList = []; renderSug(); open(r); }
    else if (t.id === "back") { const n = stack.pop(); if (n) open(D.get(n), false); }
    else if (t.id === "favexp") exportFav();
    else if (t.dataset.comb) showCombined(selWords, selCtx.raw);
    else if (t.id === "clrh") { ST.hist = []; save(); showHist(); }
    else if (t.id === "clr") { $("#q").value = ""; sugList = []; renderSug(); $("#clr").classList.add("hid"); $("#q").focus(); }
    else if (t.closest("#modes")) { mode = t.dataset.m; tabs(); if (mode === "all") showAll(); else if (mode === "about") showAbout(); else if (mode === "hist") showHist(); else if (mode === "fav") showFav(); else if (mode === "set") showSet(); else if (mode === "books") showBooks(); else if (mode === "root") $("#out").innerHTML = `<p class="hint">הקלידו שורש (למשל: שלמ) וראו את כל המילים מאותו שורש.</p>`; else if (cur) open(cur, false); }
  });
  $("#q").addEventListener("input", onType);
  $("#q").addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sugIdx = (sugIdx + (e.key === "ArrowDown" ? 1 : -1) + sugList.length) % (sugList.length || 1); renderSug(); }
    else if (e.key === "Enter") { picked = Date.now(); const r = sugList[sugIdx] || null; sugList = []; renderSug(); if (r) { $("#q").value = r.title; open(r); } else if (mode === "root") showRoot(KK.norm($("#q").value)); else lookup($("#q").value); }
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
  /* דף משולב: כשבבחירה כמה מילים — הסבר קצר לכל מילה בדף אחד (דיווח משתמש 26.10.2026) */
  function showCombined(words, raw) {
    mode = "word"; tabs(); cur = null; const ctx = { raw: raw || "", words };
    const rows = words.map(t => { const r = D.find(t); if (!r) return `<div class="sense"><b>${esc(t)}</b><div class="sbody note">אין ערך במילון</div></div>`;
      const rk = KK.rank(r, ctx), pick = (rk.confident ? rk.best : rk.items.filter(x => x.kind !== "acr")).slice(0, 2);
      return `<div class="sense${r.n.includes(" ") ? " best" : ""}"><button class="chip pri" data-go="${esc(r.title)}">${r.n.includes(" ") ? "ביטוי: " : ""}${esc(r.title)}</button><div class="sbody">${pick.map(x => esc(r.s[x.i][1])).join("<br>")}</div></div>`; }).join("");
    $("#out").innerHTML = `<h2>${esc(KK.norm(raw || words.join(" ")))}</h2><p class="note">דף משולב של המילים שזוהו בבחירה. לחיצה על מילה פותחת את הערך המלא.</p><div class="senses">${rows}</div>`;
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
  checkOnline(); load().then(() => { syncLibrary(); fOpen = !!ST.fOpen; applyFs(); $("#q").focus(); });
})();
