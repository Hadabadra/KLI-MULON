/* 2.0 — רעיונות (א): התפלגות שורש בתנ"ך, קרי וכתיב, טבלת נטייה אוטומטית, הכנה לפרק. נקודות החיבור ב-app.js: KKA / IA(...) */
(function () {
  const A = window.KKA; if (!A) return;
  const $ = s => document.querySelector(s), esc = A.esc;
  document.head.insertAdjacentHTML("beforeend", `<style>
    .cchart{margin:.4em 0 .8em}.cchart svg{width:100%;height:auto;max-height:200px;display:block;overflow:visible;direction:ltr}
    .cchart .bar{fill:var(--color-primary);opacity:.85;cursor:pointer}.cchart .bar:hover{opacity:1}.cchart .bar.dim{opacity:.3}
    .cchart .hit{fill:transparent;cursor:pointer}.cchart text{fill:var(--color-on-surface-variant);font:10px var(--font-ui)}
    .cchart .ax{stroke:var(--color-outline-variant);stroke-width:1}.cchart .sep{stroke:var(--color-outline-variant);stroke-dasharray:2 3}
  </style>`);

  /* ===== 1. התפלגות השורש לפי ספרי התנ"ך (מתוך המופעים שכבר נאספו בקונקורדנציה) ===== */
  const TNK = A.TNK.filter(t => t !== "תהילים"), BYLEN = [...A.TNK].sort((a, b) => b.length - a.length);
  const sec = b => { const i = TNK.indexOf(b); return i < 5 ? 0 : i < TNK.indexOf("תהלים") ? 1 : 2; }; /* תורה / נביאים / כתובים — קו מפריד ביניהם */
  const ABBR = { "שמואל א": "ש\"א", "שמואל ב": "ש\"ב", "מלכים א": "מ\"א", "מלכים ב": "מ\"ב", "דברי הימים א": "דה\"א", "דברי הימים ב": "דה\"ב", "שיר השירים": "שה\"ש" };
  const bookName = x => { let b = A.bookOf(x); if (!A.TNK.includes(b)) { const ref = A.plain(x.reference || x.bookId || "").replace(/^ספר /, "").trim(); b = BYLEN.find(t => ref === t || ref.startsWith(t + " ")) || ""; } return b === "תהילים" ? "תהלים" : b; };
  let cc = { src: null, book: "" };
  A.concChart = (shown, redraw) => {
    const el = $("#cchart"); if (!el) return null;
    if (cc.src !== el) cc = { src: el, book: "" }; /* קונקורדנציה חדשה — מאפסים את הסינון */
    const n = {}; for (const x of shown) for (const y of x.res) { const b = bookName(y); if (b) n[b] = (n[b] || 0) + 1; }
    const bks = TNK.filter(b => n[b]); if (!bks.length) { el.innerHTML = ""; return null; }
    const W = 26, H = 110, top = 14, max = Math.max(...bks.map(b => n[b])), w = bks.length * W;
    /* מימין לשמאל: הספר הראשון בצד ימין */
    const bars = bks.map((b, i) => { const x = w - (i + 1) * W, h = Math.max(2, Math.round(n[b] / max * (H - top))), y = H - h, sel = cc.book === b;
      return `${i && sec(b) !== sec(bks[i - 1]) ? `<line class="sep" x1="${x + W}" x2="${x + W}" y1="0" y2="${H + 60}"/>` : ""}<g data-cbk="${esc(b)}"><title>${esc(b)}: ${n[b]} מופעים</title><rect class="hit" x="${x}" y="0" width="${W}" height="${H + 60}"/>` +
        `<path class="bar${cc.book && !sel ? " dim" : ""}" d="M${x + 3},${H} V${y + 4} q0,-4 4,-4 H${x + W - 7} q4,0 4,4 V${H} Z"/>` +
        `<text x="${x + W / 2}" y="${y - 3}" text-anchor="middle">${n[b]}</text><text transform="translate(${x + W / 2 + 3},${H + 5}) rotate(-90)" text-anchor="end">${esc(ABBR[b] || b)}</text></g>`; }).join("");
    el.className = "cchart";
    el.innerHTML = `<svg viewBox="0 -2 ${w} ${H + 62}" role="img" aria-label="מספר המופעים לפי ספרי התנ&quot;ך">${bars}<line class="ax" x1="0" x2="${w}" y1="${H}" y2="${H}"/></svg>` +
      `<p class="note">מופעים לפי ספר, בסדר ספרי התנ"ך (מתוך התוצאות שנאספו). לחיצה על עמודה מסננת לספר.${cc.book ? ` <button class="chip pri" data-cbk="">${esc(cc.book)} ✕ הצג הכל</button>` : ""}</p>`;
    el.onclick = e => { const g = e.target.closest("[data-cbk]"); if (!g) return; cc.book = cc.book === g.dataset.cbk ? "" : g.dataset.cbk; redraw(); };
    return cc.book ? (y => bookName(y) === cc.book) : null;
  };
})();
