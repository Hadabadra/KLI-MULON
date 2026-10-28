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
  /* ===== 2. קרי וכתיב בפסוק. בנוסח המקרא שבאוצריא: (כתיב) [קרי]; [קרי] לבד — קרי ולא כתיב; (כתיב) לבד — כתיב ולא קרי.
     בדוק בקובצי המקרא: בראשית ח יז "(הוצא) [הַיְצֵ֣א]", בראשית ל יא "(בגד) [בָּ֣א] [גָ֑ד]", רות ג ה "[אֵלַ֖י]", רות ג יב "(אם)", רות ד ו "(לגאול־)[לִגְאָל־]" ===== */
  const NK = /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/;
  A.qkParse = raw => {
    const t = String(raw || ""), out = [];
    for (const m of t.matchAll(/\(([^()[\]]+)\)\s*((?:\[[^[\]]+\]\s*)*)|\[([^[\]]+)\]/g)) {
      if (m[1] !== undefined) out.push({ k: m[1].trim(), q: [...m[2].matchAll(/\[([^\]]+)\]/g)].map(x => x[1].trim()).join(" ") });
      else out.push({ k: "", q: m[3].trim() });
    }
    if (out.length || !NK.test(t)) return out;
    /* גיבוי לנוסח אחר: מילה בלי ניקוד (הכתיב) הצמודה למילה מנוקדת (הקרי) — משוער */
    const ws = t.replace(/[\u05C3:]\s*$/, "").split(/\s+/).filter(Boolean);
    for (let i = 0; i + 1 < ws.length; i++) { const w = ws[i].replace(/[־\u05BE]$/, ""), nx = ws[i + 1];
      if (/^[\u05D0-\u05EA]{2,}$/.test(w) && NK.test(nx) && /[\u05D0-\u05EA]/.test(nx)) out.push({ k: w, q: nx, guess: true }); }
    return out;
  };
  A.qk = raw => {
    const a = A.qkParse(raw); if (!a.length) return "";
    const row = x => !x.k ? `<li><b>קרי ולא כתיב:</b> ${esc(x.q)} <small class="note">— נקרא ואינו כתוב</small></li>` : !x.q ? `<li><b>כתיב ולא קרי:</b> ${esc(x.k)} <small class="note">— כתוב ואינו נקרא</small></li>`
      : `<li><b>כתיב:</b> ${esc(x.k)} / <b>קרי:</b> ${esc(x.q)}${x.guess ? ' <small class="note">(משוער)</small>' : ""}</li>`;
    return `<div class="row qk"><b>כתיב וקרי</b><ul>${a.map(row).join("")}</ul><span class="note">${a.some(x => x.guess) ? "זוהה לפי מילה בלי ניקוד הצמודה למילה מנוקדת — ייתכן שאינו קרי וכתיב. " : "בנוסח שבאוצריא הכתיב בסוגריים עגולים והקרי בסוגריים מרובעים. "}הכתיב — כפי שנכתב בספר התורה (בלי ניקוד); הקרי — כפי שקוראים, והניקוד שבפסוק שייך לו. <a href="#" class="blink" data-gsec="כתיב וקרי">כתיב וקרי — בספר הדקדוק</a></span></div>`;
  };
  /* ===== 3. טבלת נטייה אוטומטית — שלמים בלבד, 7 הבניינים. תבניות בכתב מקוצר:
     1 2 3 = אותיות השורש; a פתח, A קמץ, e סגול, E צירי, i חיריק, o חולם, u קובוץ, _ חטף פתח, ":" שווא נע, "0" שווא נח, "*" דגש חזק, "." דגש כתוב (וּ).
     דגש קל בבג"ד כפ"ת נקבע לבד: בראש מילה ואחרי שווא נח. נבדק מול טבלאות ספר הדקדוק (שמר, דבר, קדש) ===== */
  const VW = { a: "ַ", A: "ָ", e: "ֶ", E: "ֵ", i: "ִ", o: "ֹ", u: "ֻ", _: "ֲ", ":": "ְ", "0": "ְ", ".": "ּ" };
  const FIN = { כ: "ך", מ: "ם", נ: "ן", פ: "ף", צ: "ץ" };
  function conj(tpl, R) {
    const u = []; for (const c of tpl) { if (/[א-ת123]/.test(c)) u.push({ c, m: "" }); else if (u.length) u[u.length - 1].m += c; }
    return u.map((x, i) => { const r = /\d/.test(x.c) ? R[+x.c - 1] : { ch: x.c, dot: "" }, last = i === u.length - 1;
      const dag = /[*.]/.test(x.m) || ("בגדכפת".includes(r.ch) && (i === 0 || u[i - 1].m.includes("0")));
      return (last && FIN[r.ch] || r.ch) + r.dot + (dag ? "ּ" : "") + [...x.m].map(c => c === "." || c === "*" ? "" : VW[c] || "").join("") + (last && r.ch === "כ" && !x.m ? "ְ" : ""); }).join("").normalize("NFC");
  }
  const P = ["אני", "אתה", "את", "הוא", "היא", "אנחנו", "אתם", "אתן", "הם/הן"], PF = ["אני", "אתה", "את", "הוא", "היא", "אנחנו", "אתם", "אתן", "הם", "הן"];
  /* עבר: 9 גופים; עתיד: 10; ציווי: אתה, את, אתם, אתן; בינוני: זכר, נקבה, רבים, רבות; מקור: [שם, תבנית] */
  const pastOf = (h, s3, pl) => [h + "0תiי", h + "0תA", h + "0ת:", s3[0], s3[1], h + "0נו.", pl + "0תeם", pl + "0תeן", s3[2]];
  const futOf = (pre, f, fi, fu, fn) => [f, f, fi, f, f, f, fu, fn, fu, fn].map((x, i) => pre[i] + x);
  const pre = (p1, p) => [p1, "ת" + p, "ת" + p, "י" + p, "ת" + p, "נ" + p, "ת" + p, "ת" + p, "י" + p, "ת" + p];
  const CJ = {
    "קל": { past: pastOf("1A2a3", ["1A2a3", "1A2:3Aה", "1A2:3ו."], "1:2a3"), fut: futOf(pre("אe", "i"), "102o3", "102:3iי", "102:3ו.", "102o30נAה"),
      imp: ["1:2o3", "1i2:3iי", "1i2:3ו.", "1:2o30נAה"], ben: ["1וo2E3", "1וo2e3eת", "1וo2:3iים", "1וo2:3וoת"], ben2: ["בינוני פעול", "1A2ו.3"], mak: [["מקור", "1:2o3"], ["", "לi102o3"], ["מקור מוחלט", "1A2וo3"]],
      note: "בקל — נטיית פָּעַל / יִפְעֹל. פעלי מצב (גָּדַל ← יִגְדַּל, לָמַד ← יִלְמַד) נוטים בפתח בעתיד, והטבלה אינה מבחינה בהם." },
    "נפעל": { past: pastOf("נi102a3", ["נi102a3", "נi102:3Aה", "נi102:3ו."], "נi102a3"), fut: futOf(pre("אe", "i"), "1*A2E3", "1*A2:3iי", "1*A2:3ו.", "1*A2a30נAה"),
      imp: ["הi1*A2E3", "הi1*A2:3iי", "הi1*A2:3ו.", "הi1*A2a30נAה"], ben: ["נi102A3", "נi102e3eת", "נi102A3iים", "נi102A3וoת"], mak: [["מקור", "הi1*A2E3"], ["", "ל:הi1*A2E3"]] },
    "פיעל": { past: pastOf("1i2*a3", ["1i2*E3", "1i2*:3Aה", "1i2*:3ו."], "1i2*a3"), fut: futOf(pre("א_", ":"), "1a2*E3", "1a2*:3iי", "1a2*:3ו.", "1a2*E30נAה"),
      imp: ["1a2*E3", "1a2*:3iי", "1a2*:3ו.", "1a2*E30נAה"], ben: ["מ:1a2*E3", "מ:1a2*e3eת", "מ:1a2*:3iים", "מ:1a2*:3וoת"], mak: [["מקור", "1a2*E3"], ["", "ל:1a2*E3"]] },
    "פועל": { past: pastOf("1u2*a3", ["1u2*a3", "1u2*:3Aה", "1u2*:3ו."], "1u2*a3"), fut: futOf(pre("א_", ":"), "1u2*a3", "1u2*:3iי", "1u2*:3ו.", "1u2*a30נAה"),
      imp: null, ben: ["מ:1u2*A3", "מ:1u2*e3eת", "מ:1u2*A3iים", "מ:1u2*A3וoת"], mak: [] },
    "הפעיל": { past: pastOf("הi102a3", ["הi102iי3", "הi102iי3Aה", "הi102iי3ו."], "הi102a3"), fut: futOf(pre("אa", "a"), "102iי3", "102iי3iי", "102iי3ו.", "102E30נAה"),
      imp: ["הa102E3", "הa102iי3iי", "הa102iי3ו.", "הa102E30נAה"], ben: ["מa102iי3", "מa102e3eת", "מa102iי3iים", "מa102iי3וoת"], mak: [["מקור", "הa102iי3"], ["", "ל:הa102iי3"], ["מקור מוחלט", "הa102E3"]] },
    "הופעל": { past: pastOf("הu102a3", ["הu102a3", "הu102:3Aה", "הu102:3ו."], "הu102a3"), fut: futOf(pre("אu", "u"), "102a3", "102:3iי", "102:3ו.", "102a30נAה"),
      imp: null, ben: ["מu102A3", "מu102e3eת", "מu102A3iים", "מu102A3וoת"], mak: [] },
    "התפעל": { past: pastOf("הiת01a2*a3", ["הiת01a2*E3", "הiת01a2*:3Aה", "הiת01a2*:3ו."], "הiת01a2*a3"), fut: futOf(pre("אeת0", "iת0"), "1a2*E3", "1a2*:3iי", "1a2*:3ו.", "1a2*E30נAה"),
      imp: ["הiת01a2*E3", "הiת01a2*:3iי", "הiת01a2*:3ו.", "הiת01a2*E30נAה"], ben: ["מiת01a2*E3", "מiת01a2*e3eת", "מiת01a2*:3iים", "מiת01a2*:3וoת"], mak: [["מקור", "הiת01a2*E3"], ["", "ל:הiת01a2*E3"]] }
  };
  /* התפעל: ת' ההתפעל מתחלפת לפני שורקות (הִשְׁתַּמֵּר, הִצְטַדֵּק, הִזְדַּכֵּךְ) ונטמעת בדטת (הִטַּהֵר) — לפי ספר הדקדוק */
  const metath = (tpl, R) => { const c = R[0].ch; return "סש".includes(c) ? tpl.replace("ת01", "10ת") : c === "צ" ? tpl.replace("ת01", "10ט") : c === "ז" ? tpl.replace("ת01", "10ד") : "דטת".includes(c) ? tpl.replace("ת01", "1*") : tpl; };
  A.conjTable = (bin, R) => { const T = CJ[bin], f = t => conj(bin === "התפעל" ? metath(t, R) : t, R);
    const fut = T.fut.map(f), past = T.past.map(f), imp = T.imp ? T.imp.map(f) : null;
    return { past, fut, imp, ben: T.ben.map(f), ben2: T.ben2 ? [T.ben2[0], f(T.ben2[1])] : null, mak: T.mak.map(([l, t]) => [l, f(t)]), note: T.note || "" }; };
  /* אות ש' בשורש: שׁ או שׂ — לפי הניקוד במילון (לפחות שתי צורות מנוקדות, וכולן מסכימות); אחרת — לא ידוע */
  function shinDot(root) {
    const n = { "ׁ": 0, "ׂ": 0 };
    for (const x of [A.D.get(root), A.D.get(KK.refinal(root)), ...A.D.byRoot(root)].filter(Boolean)) for (const t of [x.title, ...x.s.map(s => s[0])])
      for (const m of String(t || "").normalize("NFC").matchAll(/ש[֑-׀׃-ׇ]*([ׁׂ])/g)) n[m[1]]++;
    return n["ׁ"] && n["ׂ"] ? null : n["ׁ"] >= 2 ? "ׁ" : n["ׂ"] >= 2 ? "ׂ" : null;
  }
  /* שלמים: בלי גרוניות, בלי אותיות חלשות, בלי ע"ע; ר' — לא בפ' ובע' (אינה מקבלת דגש); נ'/ת' בל' נטמעות לפני הסיומת */
  function strong(root) {
    const [a, b, c] = root;
    if (/[אהחע]/.test(root)) return "שורש עם אות גרונית";
    if ("יו".includes(a) || "יו".includes(b) || "יו".includes(c)) return "שורש עם אות חלשה (י' או ו')";
    if (a === "נ") return "חסרי פ\"נ";
    if (b === c) return "כפולים (ע\"ע)";
    if (a === "ר" || b === "ר") return "ר' בפ' או בע' הפועל (אינה מקבלת דגש)";
    if ("נת".includes(c)) return "נ' או ת' בל' הפועל (נטמעת לפני הסיומת)";
    return "";
  }
  const BINS = ["קל", "נפעל", "פיעל", "פועל", "הפעיל", "הופעל", "התפעל"];
  const binOf = b => /התפעל/.test(b) ? "התפעל" : /הופעל/.test(b) ? "הופעל" : /הפעיל/.test(b) ? "הפעיל" : /נפעל/.test(b) ? "נפעל" : /^פיעל/.test(b) ? "פיעל" : "קל";
  A.conjBtn = (r, an) => an && an.ok && an.root && an.root.length === 3 && !/^שם/.test(an.binyan || "") && !/[ '"]/.test(r.n) ? `<button class="chip" id="conjbtn" data-cjr="${esc(an.root)}" data-cjb="${esc(binOf(an.binyan || ""))}">📋 טבלת נטייה</button>` : "";
  function conjHtml(root, bin) {
    const why = strong(root), head = `<h4 class="gh">טבלת נטייה: שורש ${esc(KK.refinal(root))}</h4>`;
    if (why) return head + `<p class="hint">הטבלה האוטומטית תומכת כרגע רק בשלמים (${esc(why)}). <a href="#" class="blink" data-gsec="טבלאות נטייה של הגזרות">טבלאות הגזרות בספר הדקדוק</a></p>`;
    const dot = root.includes("ש") ? shinDot(root) : "";
    if (dot === null) return head + `<p class="hint">לא ידוע מהמילון אם הש' בשורש היא שׁ ימנית או שׂ שמאלית, ולכן הטבלה אינה מוצגת.</p>`;
    const R = [...root].map(ch => ({ ch, dot: ch === "ש" ? dot : "" })), T = A.conjTable(bin, R);
    return head + `<div class="chips">${BINS.map(b => `<button class="chip${b === bin ? " pri" : ""}" data-cjr="${esc(root)}" data-cjb="${b}">${b}</button>`).join("")}</div>` +
      `<p class="note"><b>⚠ נוצר אוטומטית — עלול לטעות.</b> הבניין שזוהה הוא הערכה; ייתכן שהפועל אינו בא בבניין הזה כלל. ${esc(T.note)}</p>` +
      `<div class="tblw"><table><tr><th>גוף</th><th>עבר</th><th>עתיד</th>${T.imp ? "<th>ציווי</th>" : ""}</tr>${P.map((p, i) => `<tr><td>${p}</td><td>${esc(T.past[i])}</td><td>${esc(i === 8 ? T.fut[8] + " / " + T.fut[9] : T.fut[i])}</td>${T.imp ? `<td>${esc({ 1: T.imp[0], 2: T.imp[1], 6: T.imp[2], 7: T.imp[3] }[i] || "")}</td>` : ""}</tr>`).join("")}</table></div>` +
      `<p><b>בינוני:</b> ${esc(T.ben.join(", "))}${T.ben2 ? ` · <b>${T.ben2[0]}:</b> ${esc(T.ben2[1])}` : ""}${T.mak.length ? ` · <b>מקור:</b> ${T.mak.map(([l, f]) => (l && l !== "מקור" ? l + ": " : "") + esc(f)).join(", ")}` : (T.imp ? "" : " · בבניין סביל אין ציווי")}</p>` +
      `<p class="note"><a href="#" class="blink" data-gsec="${bin === "קל" ? "טבלת נטייה מלאה: בניין קל" : "טבלאות נטייה מלאות: שאר הבניינים"}">הטבלאות בספר הדקדוק</a></p>`;
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-cjr]"); if (!b) return;
    let box = $("#conjbox"); if (!box) { box = document.createElement("div"); box.id = "conjbox"; box.className = "card conj"; b.closest(".row").after(box); }
    else if (b.id === "conjbtn") { box.remove(); return; }
    box.innerHTML = conjHtml(b.dataset.cjr, b.dataset.cjb); });
})();
