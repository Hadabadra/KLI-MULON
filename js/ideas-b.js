/* 2.0 (רעיונות ב): כרטיסיות שינון בחזרה במרווחים. נטען אחרי app.js ומשתמש בממשק window.KKAPP */
(function () {
  const A = window.KKAPP; if (!A) return;
  const $ = s => document.querySelector(s), esc = A.esc, D = A.D, ST = () => A.st();
  const css = document.createElement("style");
  css.textContent = `.prbar{margin:.2em 0 .6em}.srs .back{margin:.6em 0;line-height:1.7}.srs .back small{display:block}`;
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
  const prBar = cur => `<div class="chips prbar">${[["root", "שורש ובניין"], ["srs", `כרטיסיות שינון (${due().length})`]].map(([k, t]) => `<button class="chip${k === cur ? " pri" : ""}" data-prm="${k}">${t}</button>`).join("")}</div>`;
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

  /* ניתוב התרגול: נקרא מתחילת showPractice; מחזיר true כשהתצוגה כאן */
  const pr = () => { const m = ST().prSub; if (m === "srs") { showSrs(); return true; } return false; };
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-prm],[data-srs],[data-srsadd],[data-srsok],[data-srsdel]"); if (!t) return;
    if (t.dataset.prm) { ST().prSub = t.dataset.prm; A.save(); A.showPractice(); }
    else if (t.dataset.srs) { const c = srs(), k = t.dataset.srs; if (c[k]) delete c[k]; else c[k] = { b: 0, d: Date.now() }; A.save(); t.textContent = c[k] ? "✓ בשינון" : "＋ לשינון"; }
    else if (t.dataset.srsadd) { const s = ST(), n = addSrs(t.dataset.srsadd === "fav" ? (s.likes || []).map(x => String(x).split("#")[0]) : (s.hist || []).slice(0, 20));
      A.call("ui.showMessage", { message: n ? `נוספו ${n} כרטיסיות` : "אין מילים חדשות להוספה" }); showSrs(); }
    else if (t.dataset.srsok) rate(t.dataset.srsok === "1");
    else if (t.dataset.srsdel) { delete srs()[t.dataset.srsdel]; A.save(); showSrs(); }
  });

  window.KKB = { hero: r => srsBtn(r), pr, prBar };
})();
