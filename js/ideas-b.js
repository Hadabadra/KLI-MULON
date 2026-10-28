/* 2.0 (רעיונות ב): כרטיסיות שינון בחזרה במרווחים. נטען אחרי app.js ומשתמש בממשק window.KKAPP */
(function () {
  const A = window.KKAPP; if (!A) return;
  const $ = s => document.querySelector(s), esc = A.esc, D = A.D, ST = () => A.st();
  const shuf = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  const css = document.createElement("style");
  css.textContent = `.prbar{margin:.2em 0 .6em}.srs .back{margin:.6em 0;line-height:1.7}.srs .back small{display:block}.nkt{color:var(--color-primary);text-decoration:underline dotted}.nko,.nkw{font-family:var(--font-main);font-size:1.25em}`;
  document.head.appendChild(css);

  /* ===== 1. כרטיסיות שינון — לייטנר, 5 תאים: 1, 2, 4, 8, 16 ימים. נשמר ב-ST.srs = { מפתח: { b: תא 0–4, d: מועד חזרה } } ===== */
  const DAY = 864e5, INT = [1, 2, 4, 8, 16];
  const srs = () => { const s = ST(); if (!s.srs || typeof s.srs !== "object" || Array.isArray(s.srs)) s.srs = {}; return s.srs; };
  const due = () => Object.entries(srs()).filter(([k, c]) => c && c.d <= Date.now() && D.get(k)).sort((a, b) => a[1].d - b[1].d);
  function addSrs(list) {
    const c = srs(); let n = 0;
    for (const t of list) { const r = D.get(KK.norm(t)) || D.find(t); if (r && !c[r.n]) { c[r.n] = { b: 0, d: Date.now() }; n++; } }
    A.save(); return n;
  }
  const srsBtn = r => ST().practice ? `<button class="chip" data-srs="${esc(r.n)}" title="כרטיסיות שינון בלשונית התרגול">${srs()[r.n] ? "✓ בשינון" : "＋ לשינון"}</button>` : "";
  const prBar = cur => `<div class="chips prbar">${[["root", "שורש ובניין"], ["nikud", "ניקוד"], ["srs", `כרטיסיות שינון (${due().length})`]].map(([k, t]) => `<button class="chip${k === cur ? " pri" : ""}" data-prm="${k}">${t}</button>`).join("")}</div>`;
  function showSrs(flip) {
    const c = srs(), d = due(), tot = Object.keys(c).length, [k, cd] = d[0] || [], r = k && D.get(k);
    let body;
    if (!r) { const nx = Object.values(c).map(x => x.d).sort((a, b) => a - b)[0];
      body = `<p class="hint">${tot ? "אין כרטיסיות לחזרה כרגע. החזרה הבאה: " + new Date(nx).toLocaleDateString("he") : "אין עדיין כרטיסיות. הוסיפו מהמועדפים, מההיסטוריה, או בכפתור \"＋ לשינון\" שבערך."}</p>`; }
    else {
      const lex = r.s.filter(x => KK.kindOf(x[2]) === "lex"), defs = (lex.length ? lex : r.s).slice(0, 2);
      const an = /["'״׳ ]/.test(r.title) ? null : D.analyze(r.n);
      body = `<section class="card pr srs"><p class="prw">${esc(r.title)}</p><small class="note">תא ${cd.b + 1} מתוך 5</small>` + (flip
        ? `<div class="back">${defs.map(x => `${x[0] ? `<b>${esc(x[0])}</b> ` : ""}${esc(x[1])}${x[2] ? ` <small class="note">מקור: ${esc(x[2])}</small>` : ""}`).join("")}${an && an.root ? `<small>שורש ${esc(KK.refinal(an.root))}${an.ok ? "" : " (משוער)"}</small>` : ""}</div>
           <div class="chips"><button class="chip pri" data-srsok="1">✓ ידעתי</button><button class="chip" data-srsok="0">✗ לא ידעתי</button><button class="chip" data-go="${esc(r.title)}">פתיחת הערך</button><button class="chip" data-srsdel="${esc(k)}">הסרה מהשינון</button></div>`
        : `<div class="chips"><button class="chip pri" id="srsflip">הצג פירוש ושורש</button></div>`) + `</section>`;
    }
    $("#out").innerHTML = `<h2>תרגול</h2>${prBar("srs")}<p class="note">כרטיסיות שינון בחזרה במרווחים (שיטת לייטנר, 5 תאים: 1, 2, 4, 8 ו-16 ימים). "ידעתי" מעביר לתא הבא, "לא ידעתי" מחזיר לתא הראשון. ${tot} כרטיסיות · ${d.length} לחזרה עכשיו.</p>
      <div class="chips"><button class="chip" data-srsadd="fav">＋ מהמועדפים</button><button class="chip" data-srsadd="hist">＋ מההיסטוריה (20 אחרונות)</button></div>${body}`;
    if ($("#srsflip")) $("#srsflip").onclick = () => showSrs(true);
    showSrs.k = k;
  }
  function rate(ok) {
    const c = srs()[showSrs.k]; if (!c) return showSrs();
    c.b = ok ? Math.min(4, c.b + 1) : 0; c.d = Date.now() + INT[c.b] * DAY; A.save(); showSrs();
  }

  /* ===== 2. ארמית בדף המשולב — טבלה סטטית קטנה (רק תרגומים ודאיים), כינויים, ובניינים לפי דפוס. הכל "זיהוי משוער" ===== */
  const AR_W = { "דהא": "שהרי", "מיהו": "מכל מקום; אבל", "מאי": "מה", "היכי": "איך", "היכא": "איפה", "אמאי": "מדוע, למה", "הכא": "כאן", "התם": "שם", "השתא": "עכשיו",
    "נמי": "גם", "איכא": "יש", "ליכא": "אין", "איתא": "ישנו, יש", "ליתא": "איננו, אין", "תנן": "שנינו (במשנה)", "תניא": "שנויה (בברייתא)", "הכי": "כך", "דילמא": "שמא", "טפי": "יותר",
    "בהדי": "עם", "גבי": "אצל", "קמי": "לפני", "בתר": "אחרי", "אכתי": "עדיין", "ותו": "ועוד", "אטו": "וכי", "הני": "אלה", "האי": "זה", "אידך": "האחר", "כולהו": "כולם",
    "אנן": "אנחנו", "איהו": "הוא", "אינהו": "הם", "ניהו": "הוא", "מנא": "מנין", "אלא": "אלא, אבל", "הוה": "היה", "אי": "אם", "לאו": "לא" };
  const AR_P = { "ליה": "לו", "להו": "להם", "לן": "לנו", "ביה": "בו", "בהו": "בהם", "מיניה": "ממנו", "מינה": "ממנה", "מינייהו": "מהם", "דידיה": "שלו", "דידה": "שלה",
    "דידהו": "שלהם", "דידי": "שלי", "דידך": "שלך", "דידן": "שלנו", "גביה": "אצלו", "קמיה": "לפניו", "בהדיה": "עמו" };
  const AR_NOPFX = new Set(["דמאי"]);
  const AR_AMB = new Set(["אלא", "הוה", "אי", "לאו"]); /* שכיחות גם בעברית — לבדן אינן מעידות על ארמית */
  /* מילה בטבלה, גם עם ו־ / ד־ בראשה */
  function arTab(w) {
    for (const [p, pn] of [["", ""], ["ו", "ו־"], ["ד", "ד־ (ש־)"], ["וד", "וד־ (וש־)"]]) { if (p && (!w.startsWith(p) || AR_NOPFX.has(w) || (D.get(w) && !arDict(w)))) continue; const b = w.slice(p.length); /* דמאי — ערך בפני עצמו, לא ד־ + מאי */
      if (AR_P[b]) return { b, pn, tr: AR_P[b], k: "כינוי" }; if (AR_W[b]) return { b, pn, tr: AR_W[b], k: "מילת יחס / קישור", amb: AR_AMB.has(b) }; }
    return null;
  }
  /* ערך שכל הגדרותיו המילוניות מ"מילון ארמי עברי" */
  const arDict = w => { const r = D.find(w); if (!r) return null; const src = r.s.map(x => x[2]), ok = src.includes("מילון ארמי עברי") && !src.some(x => x === "מילון עברי" || /רד"ק/.test(x));
    return ok ? { r, tr: r.s.filter(x => x[2] === "מילון ארמי עברי").slice(0, 2).map(x => x[1]).join("; ") } : null; };
  /* בניין לפי הניקוד (פעל עבר נסתר) או לפי התחילית; משוער תמיד */
  const N = "[\u05B0-\u05BC\u05C1\u05C2]*", C = "[א-ת]" + "[\u05C1\u05C2]?";
  const AR_BIN = [["אִתַּפְעַל", new RegExp("^א\u05B4י?ת\u05BC\u05B7")], ["אִתְפַּעַל", new RegExp("^א\u05B4י?ת\u05B0" + C + "\u05BC?\u05B7" + C + "\u05BC")], ["אִתְפְּעֵל", new RegExp("^א\u05B4י?ת\u05B0" + C + "\u05BC?\u05B0" + C + "\u05B5")],
    ["אַפְעֵל", new RegExp("^א\u05B7(" + C + "\u05B0" + C + "|" + C + "\u05BC)\u05B5י?" + C + N + "$")], ["פַּעֵל", new RegExp("^" + C + "\u05BC?\u05B7" + C + "\u05BC\u05B5י?" + C + N + "$")], ["פְּעַל", new RegExp("^" + C + "\u05BC?[\u05B0\u05B2]" + C + "\u05B7" + C + N + "$")]];
  /* סדר אחיד של הסימנים בכל אות: נקודת שי"ן, דגש, תנועה (בלי טעמים ומתג) */
  const mk = c => /[\u05C1\u05C2]/.test(c) ? 0 : c === "\u05BC" ? 1 : 2;
  const canon = s => String(s || "").replace(/[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3-\u05C6]/g, "").replace(/([א-ת])([\u05B0-\u05BC\u05C1\u05C2\u05C7]+)/g, (m, l, k) => l + [...k].sort((a, b) => mk(a) - mk(b)).join(""));
  function arBin(w, raw) {
    const v = canon(raw);
    if (/[\u05B0-\u05BB]/.test(v)) for (const [b, re] of AR_BIN) if (re.test(v)) return b;
    if (w.length >= 5 && /^(אית|את)/.test(w)) return "אִתְפְּעֵל / אִתְפַּעַל / אִתַּפְעַל";
    if (w.length >= 5 && /^(מית|מת)/.test(w)) return "בינוני של אִתְפְּעֵל / אִתְפַּעַל / אִתַּפְעַל";
    return "";
  }
  const AR_SUF = [["ינן", "אנחנו (כמו אמרינן)"], ["ין", "רבים (כמו אמרין)"], ["נא", "אולי גוף ראשון: אני (כמו אמינא)"], ["יה", "אולי כינוי נסתר: ־ו (שלו / אותו)"], ["ת", "אולי עבר: אתה / היא / אני (כמו אמרת)"]];
  const arSuf = w => { if (w.length < 4) return ""; const s = AR_SUF.find(([x]) => w.endsWith(x)); return s ? "סיומת ־" + s[0] + ": " + s[1] : ""; };
  function aram(words, raw) {
    const rw = String(raw || "").replace(/[\u05C3:]\s*$/, "").split(/\s+/).filter(Boolean), rawOf = t => rw.find(x => KK.norm(x).split(" ").includes(t)) || "";
    const tab = words.map(w => [w, arTab(w)]);
    if (!tab.some(([, x]) => x && !x.amb)) return ""; /* רק כשיש בבחירה מילה ארמית מובהקת מהטבלה */
    const rows = tab.map(([w, t]) => {
      const dct = t ? null : arDict(w), bin = t ? "" : arBin(w, rawOf(w)), suf = t || !(dct || bin) ? "" : arSuf(w);
      if (!t && !dct && !bin) return "";
      return `<div class="sense"><b>${esc(w)}</b><div class="sbody">${t ? `${t.pn ? esc(t.pn) + " + " : ""}${esc(t.b)} = <b>${esc(t.tr)}</b> <small class="note">(${t.k}; טבלה מובנית)</small>` : ""}${dct ? `${esc(dct.tr)} <small class="note">(מקור: מילון ארמי עברי)</small>` : ""}${bin ? `<br><small>בניין: ${esc(bin)}?</small>` : ""}${suf ? `<br><small>${esc(suf)}</small>` : ""}</div></div>`;
    }).join("");
    return `<section class="aram"><h3>ארמית — זיהוי משוער</h3><p class="note">מילות יחס, קישור וכינויים שכיחים מטבלה קטנה מובנית; פירוש מילים אחרות מ"מילון ארמי עברי" שבמאגר; הבניין (פְּעַל, פַּעֵל, אַפְעֵל, אִתְפְּעֵל, אִתְפַּעַל, אִתַּפְעַל) והסיומת — לפי הניקוד והתחילית בלבד, ועלולים לטעות.</p><div class="senses">${rows}</div></section>`;
  }

  /* ===== 3. תרגול ניקוד — מילה מנוקדת מהמילון (רק ערכים בניקוד מלא), סימן תנועה אחד מוסתר באות אחת, 4 אפשרויות ===== */
  const NK_V = { "\u05B0": "שווא", "\u05B1": "חטף סגול", "\u05B2": "חטף פתח", "\u05B3": "חטף קמץ", "\u05B4": "חיריק", "\u05B5": "צירה", "\u05B6": "סגול", "\u05B7": "פתח", "\u05B8": "קמץ", "\u05B9": "חולם", "\u05BB": "קובוץ" };
  /* [אות, סימנים] לכל אות — רק כשהניקוד מלא: כל אות מנוקדת, חוץ מהאחרונה, מאותיות אהו"י, ומאות שאחריה ו' בחולם או בשורוק */
  function nkParse(nk, n) {
    const v = canon(nk); if (/[^א-ת\u05B0-\u05BC\u05C1\u05C2]/.test(v)) return null;
    const L = [...v.matchAll(/([א-ת])([\u05B0-\u05BC\u05C1\u05C2]*)/g)].map(m => [m[1], m[2]]);
    if (L.map(x => x[0]).join("") !== n || L.length < 3 || L.length > 9) return null;
    const vow = x => /[\u05B0-\u05BB]/.test(x[1]) || (x[0] === "ו" && /\u05BC/.test(x[1]));
    for (let i = 0; i < L.length - 1; i++) if (!vow(L[i]) && !/[אהוי]/.test(L[i][0]) && !(L[i + 1][0] === "ו" && vow(L[i + 1]))) return null;
    return L;
  }
  function nkItem() {
    for (let k = 0; k < 4000; k++) {
      const r = D.get(D.keys[Math.floor(Math.random() * D.keys.length)]); if (!r) continue;
      for (const sn of r.s) { if (!sn[0] || KK.kindOf(sn[2]) === "acr") continue; const L = nkParse(sn[0], r.n); if (!L) continue;
        const ix = L.map((x, i) => i).filter(i => i < L.length - 1 && L[i][0] !== "ו" && (L[i][1].match(/[\u05B0-\u05BB]/g) || []).length === 1);
        if (ix.length) { const i = ix[Math.floor(Math.random() * ix.length)]; return { r, sn, L, i, v: L[i][1].match(/[\u05B0-\u05BB]/)[0] }; } }
    }
    return null;
  }
  function showNk() {
    const it = nkItem(), s = ST(), sc = s.nkScore || { ok: 0, n: 0 };
    const head = `<h2>תרגול</h2>${prBar("nikud")}<p class="note">מילה מנוקדת מהמילון (רק ערכים בניקוד מלא). באות המסומנת הוסתר סימן ניקוד אחד — איזה?</p>`;
    if (!it) { $("#out").innerHTML = head + '<p class="hint">לא נמצאה מילה לתרגול. נסו שוב.</p>'; return; }
    const { L, i, v } = it, base = L[i][1].replace(v, ""), gut = /[אהחע]/.test(L[i][0]);
    const pool = Object.keys(NK_V).filter(x => x !== v && (gut || !/[\u05B1-\u05B3]/.test(x)));
    const opts = shuf([v, ...shuf(pool).slice(0, 3)]);
    const word = L.map((x, j) => j === i ? `<span class="nkt">${x[0]}${base}</span>` : x[0] + x[1]).join("");
    $("#out").innerHTML = head + `<section class="card pr"><p class="prw">${word}</p><div class="chips" id="nka">${opts.map(o => `<button class="chip" data-nk="${o}"><span class="nko">${L[i][0]}${base}${o}</span> ${NK_V[o]}</button>`).join("")}</div><div id="nkr"></div></section>
      <p class="note" id="nks">ציון: ${sc.ok} מתוך ${sc.n} <a href="#" id="nkz">איפוס</a></p>`;
    $("#nka").onclick = e => { const b = e.target.closest("[data-nk]"); if (!b || $("#nka").dataset.done) return; $("#nka").dataset.done = 1; const ok = b.dataset.nk === v;
      s.nkScore = { ok: sc.ok + (ok ? 1 : 0), n: sc.n + 1 }; A.save();
      $("#nka").querySelectorAll("button").forEach(x => { x.disabled = true; x.classList.toggle("pri", x.dataset.nk === v); x.classList.toggle("bad", x === b && !ok); });
      $("#nkr").innerHTML = `<p>${ok ? "✓ נכון" : "✗ התשובה: " + NK_V[v]} · <span class="nkw">${esc(it.sn[0])}</span> — ${esc(it.sn[1])} <small class="note">(מקור: ${esc(it.sn[2])})</small></p><div class="chips"><button class="chip pri" id="nkn">שאלה הבאה ←</button><button class="chip" data-go="${esc(it.r.title)}">פתיחת הערך</button></div>`;
      $("#nks").firstChild.textContent = `ציון: ${s.nkScore.ok} מתוך ${s.nkScore.n} `; $("#nkn").onclick = showNk; };
    $("#nkz").onclick = e => { e.preventDefault(); s.nkScore = { ok: 0, n: 0 }; A.save(); showNk(); };
  }

  /* ניתוב התרגול: נקרא מתחילת showPractice; מחזיר true כשהתצוגה כאן */
  const pr = () => { const m = ST().prSub; if (m === "srs") { showSrs(); return true; } if (m === "nikud") { showNk(); return true; } return false; };
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-prm],[data-srs],[data-srsadd],[data-srsok],[data-srsdel]"); if (!t) return;
    if (t.dataset.prm) { ST().prSub = t.dataset.prm; A.save(); A.showPractice(); }
    else if (t.dataset.srs) { const c = srs(), k = t.dataset.srs; if (c[k]) delete c[k]; else c[k] = { b: 0, d: Date.now() }; A.save(); t.textContent = c[k] ? "✓ בשינון" : "＋ לשינון"; }
    else if (t.dataset.srsadd) { const s = ST(), n = addSrs(t.dataset.srsadd === "fav" ? (s.likes || []).map(x => String(x).split("#")[0]) : (s.hist || []).slice(0, 20));
      A.call("ui.showMessage", { message: n ? `נוספו ${n} כרטיסיות` : "אין מילים חדשות להוספה" }); showSrs(); }
    else if (t.dataset.srsok) rate(t.dataset.srsok === "1");
    else if (t.dataset.srsdel) { delete srs()[t.dataset.srsdel]; A.save(); showSrs(); }
  });

  window.KKB = { hero: r => srsBtn(r), pr, prBar, aram };
})();
