(function () {
  const $ = s => document.querySelector(s), O = window.Otzaria;
  const D = new KK.Dict(window.KK_DICT), MH = new KK.MhIndex(window.MH_INDEX);
  let fOpen = false, allLetter = "א", allShown = 0, mode = "word", cur = null, stack = [], sugList = [], sugIdx = -1;
  let ST = { auto: true, mode: "toast", maxWords: 8, hist: [], likes: [], azSide: false, fOpen: false };
  let selWords = [], selCtx = { raw: "", words: [] };
  const call = async (m, p) => { try { return O ? await O.call(m, p || {}) : { success: false }; } catch (e) { return { success: false }; } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const deb = (f, t) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => f(...a), t); }; };
  const save = deb(() => call("storage.set", { key: "settings", value: ST }), 400);

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
    return `<div class="sense${best ? " best" : ""}"><div class="sbody">${nk ? `<span class="nk">${esc(nk)}</span>` : ""}${esc(d)}${src ? `<span class="src">מקור: ${esc(src)}</span>` : ""}</div><div class="tb"><button class="ib" data-copy="${i}" title="העתק" aria-label="העתק">${IC.copy}</button>
      <button class="ib" data-rep="${i}" title="דווח על הגדרה לא מתאימה" aria-label="דווח על הגדרה לא מתאימה">${IC.down}</button>
      <button class="ib ${liked ? "on" : ""}" data-like="${i}" title="הגדרה טובה" aria-label="הגדרה טובה">${IC.up}</button></div></div>`;
  };
  const chip = (t, a = "", cls = "") => `<button class="chip ${cls}" data-go="${esc(t)}" ${a}>${esc(t)}</button>`;


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
    ST.hist = [r.title, ...ST.hist.filter(x => x !== r.title)].slice(0, 60); save();
    const isAcr = /["'״׳]/.test(r.title), an = D.analyze(r.n), root = an.root, bin = an.binyan;
    const same = isAcr ? [] : D.byRoot(root).filter(x => x.n !== r.n).slice(0, 24);
    const sim = D.similar(r.n, 14).map(k => D.get(k)).filter(Boolean);
    const nb = D.neighbors(r.n);
    const links = {}; for (const [k, t] of r.l || []) (links[k] = links[k] || []).push(t);
    $("#out").innerHTML =
      `<div class="pager"><span>${stack.length ? `<button class="chip" id="back">→ חזרה</button>` : ""}</span></div>
       <div class="hero"><h2>${esc(r.title)}</h2></div>` +
      (selWords.length > 1 ? `<div class="row"><b>מילים בבחירה</b><div class="chips">${selWords.map(t => chip(t, "", t === r.title ? "pri" : "")).join("")}</div></div>` : "") +
      `<div class="row"><div class="chips"><button class="chip pri" id="osearch">${IC.search} חפש באוצריא</button><button class="chip" id="orel">📖 פסוקים ומפרשים קשורים</button></div></div><div id="rel"></div>` +
      sensesHtml(r) +
      Object.entries(links).map(([k, a]) => `<div class="row"><b>${esc(k.replace("_", " "))}</b><div class="chips">${a.map(t => chip(t)).join("")}</div></div>`).join("") +
      mhRow(isAcr ? [] : MH.find([r.n, ...(selCtx.words || [])], D)) +
      (isAcr ? "" :       `<div class="row"><b>${an.ok ? "שורש משוער · בניין משוער" : "שורש לא מאומת"}</b><div class="chips"><button class="chip pri" data-root="${esc(root)}">שורש: ${esc(KK.refinal(root))}</button>${(an.alts || []).map(x => `<button class="chip" data-root="${esc(x)}">או: ${esc(KK.refinal(x))}</button>`).join("")}<span class="chip">${esc(bin)}</span></div>
       <span class="note">זיהוי השורש והבניין הוא הערכה אוטומטית ועלול לטעות.</span></div>`) +
      (same.length ? `<div class="row"><b>מילים מאותו שורש</b><div class="chips">${same.map(x => chip(x.title)).join("")}</div></div>` : "") +
      (sim.length ? `<div class="row"><b>מילים דומות</b><div class="chips">${sim.map(x => chip(x.title)).join("")}</div></div>` : "") +
      `<div class="pager">${nb.prev ? chip(nb.prev.title, "", "") .replace(">", ">→ ") : "<span></span>"}${nb.next ? chip(nb.next.title).replace(">", ">← ") : ""}</div>`;
    $("#out").scrollTop = 0; window.scrollTo(0, 0);
  }
  function lookup(text, push = true) {
    if (!selWords.length) selCtx = { raw: text, words: [] };
    const r = D.find(text);
    if (r) return open(r, push), true;
    const mhHits = MH.find(KK.norm(text).split(" "), D);
    $("#out").innerHTML = `<p class="hint">לא נמצא ערך עבור "${esc(KK.norm(text))}".</p>` + mhRow(mhHits) + sugHtml(D.similar(KK.norm(text), 12).map(k => D.get(k)));
    return false;
  }
  const sugHtml = a => a.length ? `<div class="row"><b>אולי התכוונתם</b><div class="chips">${a.map(x => chip(x.title)).join("")}</div></div>` : "";
  function showRoot(root) {
    mode = "root"; tabs(); const a = D.byRoot(root);
    $("#out").innerHTML = `<h2>שורש: ${esc(root)}</h2><p class="note">רשימה לפי זיהוי שורש אוטומטי (משוער).</p>` +
      (a.length ? `<div class="chips">${a.map(x => chip(x.title)).join("")}</div>` : `<p class="hint">לא נמצאו מילים לשורש הזה.</p>`);
  }
  function showFav() {
    mode = "fav"; tabs();
    const items = ST.likes.map(k => { const [n, i] = k.split("#"), r = D.get(n); return r && r.s[+i] ? { r, i: +i, k } : null; }).filter(Boolean);
    $("#out").innerHTML = `<h2>מועדפים</h2>` + (items.length ? `<p class="note">הגדרות שסימנתם 👍. לחיצה על הכותרת פותחת את הערך.</p><div class="senses">${items.map(x =>
      `<div class="sense"><button class="chip pri" data-go="${esc(x.r.title)}">${esc(x.r.title)}</button><div class="sbody">${esc(x.r.s[x.i][1])}</div><div class="tb"><button class="ib on" data-unfav="${esc(x.k)}" title="הסר ממועדפים" aria-label="הסר ממועדפים">${IC.up}</button></div></div>`).join("")}</div>`
      : `<p class="hint">עדיין אין מועדפים. לחצו 👍 על הגדרה כדי לשמור אותה כאן.</p>`);
  }
  function showHist() {
    $("#out").innerHTML = ST.hist.length ? `<h2>היסטוריה</h2><div class="chips">${ST.hist.map(t => chip(t)).join("")}</div><p><button class="chip" id="clrh">נקה היסטוריה</button></p>` : `<p class="hint">אין היסטוריה עדיין.</p>`;
  }
  function showSet() {
    $("#out").innerHTML = `<h2>הגדרות</h2><div class="set">
     <label class="opt"><span>זיהוי אוטומטי בזמן לימוד<small>מילה שמסמנים בספר מזוהה מעצמה</small></span><input type="checkbox" id="s-auto" ${ST.auto ? "checked" : ""}></label>
     <label class="opt"><span>אופן הצגה<small>מה קורה כשמילה מזוהה</small></span><select id="s-mode"><option value="toast">הודעה קופצת (לחיצה פותחת כאן)</option><option value="panel">פתיחת המילון אוטומטית</option><option value="off">כבוי (רק בתפריט ההקשר)</option></select></label>
     <label class="opt"><span>מקסימום מילים בבחירה</span><select id="s-max"><option>1</option><option>2</option><option>3</option><option>4</option><option>6</option><option>8</option></select></label>
     <label class="opt"><span>מיקום סרגל האותיות<small>בתצוגת "כל המילים"</small></span><select id="s-side"><option value="0">למעלה</option><option value="1">בצד</option></select></label>
     <label class="opt"><span>סרגל האותיות פתוח כברירת מחדל</span><input type="checkbox" id="s-fopen" ${ST.fOpen ? "checked" : ""}></label></div>`;
    $("#s-mode").value = ST.mode; $("#s-max").value = String(ST.maxWords); $("#s-side").value = ST.azSide ? "1" : "0";
    $("#s-fopen").onchange = e => { ST.fOpen = e.target.checked; fOpen = ST.fOpen; save(); };
    $("#s-auto").onchange = e => { ST.auto = e.target.checked; save(); };
    $("#s-mode").onchange = e => { ST.mode = e.target.value; save(); };
    $("#s-side").onchange = e => { ST.azSide = e.target.value === "1"; save(); };
    $("#s-max").onchange = e => { ST.maxWords = +e.target.value; save(); };
  }

  const LETTERS = "אבגדהוזחטיכלמנסעפצקרשת".split("");
  const PAGE = 120;
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
  const unf = s => s.replace(/[ךםןףץ]/g, c => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" }[c]));
  function showAbout() {
    mode = "about"; tabs();
    $("#out").innerHTML = `<div class="about"><h2>מילון כליקודש</h2><p>גרסה 1.1.1 · ${D.keys.length.toLocaleString("he")} ערכים</p>
     <h3>על המילון</h3><p>קישורי הכרטסות מבוססים על רשימת שמות הערכים של התוסף "עינים למקרא" מאת חד בדרא (שמות בלבד; התוכן נשאר אצלם). התוסף נבנה על פי מאגר המילון של פרויקט כליקודש (KleiKodeshProject), בקובץ הנושא את השם milon-klei-kodesh (גרסת המאגר: 13.10.2026). כל ההגדרות, הנרדפים, הניגודים וראשי התיבות לקוחים ממנו, והמקור של כל הגדרה מצוין בערך עצמו. אין בתוסף תוכן מילוני נוסף.</p>
     <p class="note"><b>שימו לב:</b> המאגר עדיין צריך סינון, ותהליך הסינון טרם הסתיים. ייתכנו בו ערכים לא מילוניים (כגון שמות פרטיים), הגדרות כפולות או לא מדויקות, וערכים חסרים.</p>
     <p class="note">השורשים והבניינים אינם חלק מהמאגר. הם הערכה אוטומטית של התוסף ועלולים לטעות.</p>
     <h3>תוכנית עבודה ושיפורים מתוכננים</h3><details class="more"><summary>הצג את מסמך התכנון</summary><div class="rmdoc">${window.KK_ROADMAP || "<p>המסמך אינו זמין.</p>"}</div></details>
     <h3>יומן שינויים</h3><ul>
      <li><b>1.1.1</b> — תיקון: צבעי אוצריא (ערכת הנושא, בהיר/כהה) מוחלים שוב על התוסף.</li>
      <li><b>1.1.0</b> — מראה חדש תואם אוצריא; הפירושים מוצגים כאריחים; סרגל האותיות מתקפל (כמו ב"עינים למקרא") ומיקומו נקבע בלשונית ההגדרות; מסך מועדפים; תיקון הכפתור "פסוקים ומפרשים קשורים" שלא החזיר תוצאות.</li>
      <li><b>1.0.7</b> — זיהוי שורשים מדויק יותר (93.9% על סט בדיקה ראשוני): אימות בשתי שכבות, שורשים חלשים, והוספת רשימת שורשים נפוצים.</li>
      <li><b>1.0.6</b> — מסמך תכנון ותוכנית עבודה מוטמעים בתוסף (בלשונית זו).</li>
      <li><b>1.0.5</b> — קישור לכרטסות של התוסף "עינים למקרא" (בעלי חיים, צומח, אישים, מקומות ועוד): ערך שיש לו כרטסת מציג כפתור שפותח אותה. גם מילה שאינה במילון אך יש לה כרטסת תזוהה.</li>
      <li><b>1.0.4</b> — זיהוי שורש ובניין מחדש לפי משקלים ושורשים חלשים, ואימות מול שורשי ספר השרשים לרד"ק; הצגת שורשים חלופיים; דירוג פירושים לפי ניקוד והקשר (כשיש כמה פירושים ואין הכרעה מוצגים כולם, מקובצים); ראשי תיבות מקופלים.</li>
      <li><b>1.0.3</b> — עיצוב הגדרות בסגנון אוצריא עם סרגל העתקה/דיווח/אהבתי; הדיווח עבר להגדרות ולא למילים; בחירה של כמה מילים; חיפוש מילה באוצריא ופסוקים ומקורות קשורים עם קישורים; אריחים ברוחב מלא ואפשרות להעביר את סינון האותיות לצד.</li>
      <li><b>1.0.2</b> — כפתור 👎 על כל אריח ובכל ערך לדיווח על ערך לא מתאים (נשלח למפתח התוסף דרך אוצריא, באישור המשתמש).</li>
      <li><b>1.0.1</b> — תצוגת אריחים של כל המילים עם סינון לפי אות, כפתור אודות ויומן שינויים, והערה שהמאגר טרם סונן עד תומו.</li>
      <li><b>1.0.0</b> — גרסה ראשונה: זיהוי אוטומטי של מילה מסומנת, חיפוש תוך כדי הקלדה, שורשים, בניינים, מילים דומות, היסטוריה והגדרות.</li></ul></div>`;
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
      const details = `ערך: ${r.title}\nהגדרה מס' ${i + 1}: ${d}${nk ? " [" + nk + "]" : ""}${src ? "\nמקור ההגדרה: " + src : ""}\nסיבה: ${why}${note ? "\nהערה: " + note : ""}\nתוסף: מילון כליקודש 1.1.1`;
      const res = await call("feedback.report", { details, reportType: "content" });
      const st = res && res.success ? res.data : null;
      m.querySelector("#rm").textContent = st === "sent" ? "הדיווח נשלח. תודה!" : st === "queued" ? "הדיווח נשמר ויישלח אוטומטית כשיהיה חיבור." : st === "cancelled" ? "השליחה בוטלה." : "לא ניתן לשלוח כרגע.";
      if (st === "sent" || st === "queued") setTimeout(() => m.remove(), 1600);
    };
  }
  function copyText(t) { try { navigator.clipboard.writeText(t); } catch (e) { const x = document.createElement("textarea"); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand("copy"); } catch (e2) {} x.remove(); } }
  /* חיפוש באוצריא: פסוקים ומקורות/מפרשים קשורים, עם קישורים לפתיחה בקורא */
  async function runSearch(q, extra) {
    let res = [];
    try {
      const it = O.call("search.query", { query: q, limit: 14, mode: "exact", options: { "קידומות דקדוקיות": true }, ...extra });
      // ה-chunk הראשון נושא רק ספירות; קוראים עד שמגיעים ל-limit או לסוף הזרם (תיקון 1.1.0)
      const lim = (extra && extra.limit) || 14;
      if (it && it[Symbol.asyncIterator]) { for await (const ch of it) { res = res.concat((ch && ch.results) || []); if (res.length >= lim) break; } }
      else { const x = await it; res = (x && (x.data && x.data.results || x.data)) || []; }
    } catch (e) { res = []; }
    if (!res.length) { // גיבוי: search.fullText (בלי id; reader.openBook מקבל bookId+type)
      try { const x = await call("search.fullText", { query: q, limit: (extra && extra.limit) || 14 }); if (x && x.success && Array.isArray(x.data)) res = x.data.map(y => ({ ...y, bookId: y.bookId || y.book, reference: y.reference || y.book })); } catch (e) {}
    }
    return Array.isArray(res) ? res : [];
  }
  const snip = t => esc(String(t || "").replace(/<[^>]+>/g, "").slice(0, 220));
  async function related(r) {
    const box = $("#rel"); box.innerHTML = '<p class="note"><span class="spin"></span>מחפש באוצריא…</p>';
    const q = r.title.replace(/[^\u05D0-\u05EA ]/g, "").trim() || r.n;
    const v = await runSearch(q, { categories: ["/תנך"], limit: 8 }), o = await runSearch(q, { limit: 30 });
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
    const t = e.target.closest("[data-go],[data-root],[data-i],[data-mhg],[data-rep],[data-copy],[data-like],[data-open],[data-unfav],#osearch,#orel,#ftog,[data-letter],#more,#back,#clrh,#modes button,#clr"); if (!t) return;
    if (t.dataset.mhg) openMh(t.dataset.mhg, t.dataset.mhn);
    else if (t.dataset.rep !== undefined) report(cur, +t.dataset.rep);
    else if (t.dataset.copy !== undefined) { const s = cur.s[+t.dataset.copy]; copyText(`${cur.title}: ${s[1]}`); }
    else if (t.dataset.like !== undefined) { const k = cur.n + "#" + t.dataset.like; ST.likes = ST.likes.includes(k) ? ST.likes.filter(x => x !== k) : [...ST.likes, k]; save(); t.classList.toggle("on"); }
    else if (t.dataset.unfav) { ST.likes = ST.likes.filter(x => x !== t.dataset.unfav); save(); showFav(); }
    else if (t.dataset.open) { e.preventDefault(); const o = JSON.parse(t.dataset.open); call("reader.openBook", { id: o.id, bookId: o.bookId, type: o.type, index: o.index, searchQuery: o.q }); }
    else if (t.id === "osearch") call("reader.openSearchTab", { query: cur.title.replace(/[^\u05D0-\u05EA ]/g, ""), autoSearch: true });
    else if (t.id === "orel") related(cur);
    else if (t.id === "ftog") { fOpen = !fOpen; showAll(null, true); }
    else if (t.dataset.letter) { showAll(t.dataset.letter); }
    else if (t.id === "more") { allShown += PAGE; showAll(null, true); }
    else if (t.dataset.go) { $("#sug").classList.add("hid"); lookup(t.dataset.go); }
    else if (t.dataset.root) showRoot(t.dataset.root);
    else if (t.dataset.i) { const r = sugList[+t.dataset.i]; picked = Date.now(); $("#q").value = r.title; sugList = []; renderSug(); open(r); }
    else if (t.id === "back") { const n = stack.pop(); if (n) open(D.get(n), false); }
    else if (t.id === "clrh") { ST.hist = []; save(); showHist(); }
    else if (t.id === "clr") { $("#q").value = ""; sugList = []; renderSug(); $("#clr").classList.add("hid"); $("#q").focus(); }
    else if (t.closest("#modes")) { mode = t.dataset.m; tabs(); if (mode === "all") showAll(); else if (mode === "about") showAbout(); else if (mode === "hist") showHist(); else if (mode === "fav") showFav(); else if (mode === "set") showSet(); else if (mode === "root") $("#out").innerHTML = `<p class="hint">הקלידו שורש (למשל: שלמ) וראו את כל המילים מאותו שורש.</p>`; else if (cur) open(cur, false); }
  });
  $("#q").addEventListener("input", onType);
  $("#q").addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sugIdx = (sugIdx + (e.key === "ArrowDown" ? 1 : -1) + sugList.length) % (sugList.length || 1); renderSug(); }
    else if (e.key === "Enter") { picked = Date.now(); const r = sugList[sugIdx] || null; sugList = []; renderSug(); if (r) { $("#q").value = r.title; open(r); } else if (mode === "root") showRoot(KK.norm($("#q").value)); else lookup($("#q").value); }
    else if (e.key === "Escape") { sugList = []; renderSug(); }
  });

  /* זיהוי אוטומטי: בחירה, תפריט הקשר, לחיצה על הודעה, פתיחה עם פרמטר */
  function applySel(text) {
    const rs = D.resolve(text, ST.maxWords), list = rs.phrase ? [rs.phrase] : rs.words;
    if (!list.length) { const hh = MH.find(KK.norm(text).split(" "), D); if (hh.length) { $("#q").value = KK.norm(text); showMhOnly(text, hh); } return; }
    selCtx = { raw: text, words: KK.norm(text).split(" ") }; selWords = rs.phrase ? [] : list.map(x => x.title); $("#q").value = list[0].title; open(list[0]);
  }
  const fromSel = deb(async d => {
    let t = d && (d.text || d.selectedText); const g = await call("reader.getSelection"); let raw = t; if (g.success && g.data) { t = g.data.text || t; raw = g.data.sourceSelectedText || g.data.renderedSelectedText || t; }
    const n = KK.norm(t); if (n && n.split(" ").length <= ST.maxWords) { const r = D.find(n); if (!(cur && r && cur.n === r.n)) applySel(raw); }
  }, 300);
  function go(word, words, raw) { if (!word) return; selWords = Array.isArray(words) ? words : []; selCtx = { raw: raw || "", words: selWords.length ? selWords : [word] }; $("#q").value = word; lookup(word); }
  if (O) {
    O.on("plugin.boot", p => { if (p && p.theme) theme(p.theme); else call("app.getTheme").then(r => r && r.success && theme(r.data)); const prm = p && (p.param || p.params); if (prm && prm.word) go(prm.word, prm.words, prm.raw); });
    O.on("theme.changed", theme);
    O.on("reader.selection_changed", fromSel);
    O.on("reader.context_menu_item_clicked", d => { const t = (d && (d.selectedText || (d.selection && d.selection.text))) || ""; if (t) applySel(t); });
    O.on("ui.messageClicked", d => d && d.payload && go(d.payload.word, d.payload.words, d.payload.raw));
    O.on("plugin.page_opened", p => { const prm = p && (p.param || p.params); if (prm && prm.word) go(prm.word, prm.words, prm.raw); });
  }
  load().then(() => { fOpen = !!ST.fOpen; $("#q").focus(); });
})();
