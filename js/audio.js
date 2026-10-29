/* 2.0: השמעת טעמי המקרא לפי שיטה — ההקלטות מעלה המשתמש (אין בתוסף הקלטות מובנות).
   נשמרות ב-IndexedDB של התוסף (מפתח "טעם|שיטה" → Blob), עם ייצוא וייבוא של כל הסט בקובץ אחד (JSON עם data URL) לגיבוי ולשיתוף. */
(function (g) {
  const TAAM = ["סוף פסוק (סילוק)", "אתנחתא", "סגולתא", "שלשלת", "זקף קטן", "זקף גדול", "טפחא", "רביע", "זרקא", "פשטא", "יתיב", "תביר", "פזר", "קרני פרה", "תלישא גדולה", "גרש", "גרשיים", "לגרמיה", "מונח", "מהפך", "מרכא", "מרכא כפולה", "דרגא", "קדמא", "אזלא", "תלישא קטנה", "ירח בן יומו", "מאיילא"];
  const TRAD = ["אשכנז", "ספרד וירושלים", "עדות המזרח", "תימן"];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((ok, no) => { const r = indexedDB.open("kk-audio", 1); r.onupgradeneeded = () => r.result.createObjectStore("rec"); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }));
  const tx = async (mode, f) => { const d = await db(); return new Promise((ok, no) => { const t = d.transaction("rec", mode), s = t.objectStore("rec"), r = f(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); }); };
  const put = (k, b) => tx("readwrite", s => s.put(b, k)), del = k => tx("readwrite", s => s.delete(k)), get = k => tx("readonly", s => s.get(k));
  const keys = () => tx("readonly", s => s.getAllKeys());
  const toUrl = b => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
  const fromUrl = u => fetch(u).then(r => r.blob());
  let player = null;
  async function show(out, msg) {
    let have = new Set(); try { have = new Set(await keys()); } catch (e) { out.innerHTML = `<h2>השמעת הטעמים</h2><p class="hint">אחסון ההקלטות אינו זמין בסביבה זו.</p>`; return; }
    const cell = (t, s) => { const k = t + "|" + s; return have.has(k) ? `<button class="chip pri" data-aplay="${esc(k)}" title="השמעה">▶</button><button class="ib" data-adel="${esc(k)}" title="מחיקת ההקלטה" aria-label="מחיקת ההקלטה">✕</button>` : `<label class="chip" title="הוספת הקלטה (קובץ שמע)">＋<input type="file" accept="audio/*" data-aadd="${esc(k)}" hidden></label>`; };
    out.innerHTML = `<h2>השמעת הטעמים</h2><p class="note">הקלטות שאתם מוסיפים — לכל טעם ולכל שיטה. ההקלטות נשמרות בתוסף במחשב זה; לגיבוי או לשיתוף — ייצוא ויבוא של כל הסט בקובץ אחד. שמות הטעמים ושיטות הקריאה — בספר הדקדוק, פרק "שמות הטעמים, צורתם ושמותיהם בעדות".</p>
      <div class="row"><div class="chips"><button class="chip" id="aexp">⬇ ייצוא ההקלטות</button><label class="chip">⬆ ייבוא קובץ הקלטות<input type="file" accept=".json,application/json" id="aimp" hidden></label></div></div>${msg ? `<p class="note">${esc(msg)}</p>` : ""}
      <div class="tblw"><table class="atbl"><thead><tr><th>טעם</th>${TRAD.map(s => `<th>${esc(s)}</th>`).join("")}</tr></thead><tbody>${TAAM.map(t => `<tr><th>${esc(t)}</th>${TRAD.map(s => `<td>${cell(t, s)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    out.onclick = async e => {
      const p = e.target.closest("[data-aplay]"), d = e.target.closest("[data-adel]");
      if (p) { const b = await get(p.dataset.aplay); if (!b) return; if (player) { player.pause(); URL.revokeObjectURL(player.src); } player = new Audio(URL.createObjectURL(b)); player.play().catch(() => {}); }
      else if (d && confirm("למחוק את ההקלטה?")) { await del(d.dataset.adel); show(out); }
      else if (e.target.id === "aexp") {
        const all = {}; for (const k of await keys()) all[k] = await toUrl(await get(k));
        if (!Object.keys(all).length) return show(out, "אין עדיין הקלטות לייצוא.");
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ kind: "kk-taamim-audio", v: 1, rec: all })], { type: "application/json" })); a.download = "הקלטות טעמים.json"; document.body.appendChild(a); a.click(); a.remove();
      }
    };
    out.onchange = async e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      if (e.target.dataset.aadd) { if (!/^audio\//.test(f.type)) return show(out, "הקובץ אינו קובץ שמע."); await put(e.target.dataset.aadd, f); return show(out, "ההקלטה נשמרה."); }
      if (e.target.id === "aimp") {
        try { const j = JSON.parse(await f.text()); if (j.kind !== "kk-taamim-audio") throw 0; let n = 0;
          for (const [k, u] of Object.entries(j.rec || {})) { const [t, s] = k.split("|"); if (TAAM.includes(t) && TRAD.includes(s) && /^data:audio\//.test(u)) { await put(k, await fromUrl(u)); n++; } }
          show(out, `יובאו ${n} הקלטות.`); } catch (x) { show(out, "הקובץ אינו קובץ הקלטות של התוסף."); }
      }
    };
  }
  /* 2.1.0: השמעה בתוך ספר הדקדוק — בסעיפי הטעמים, ליד הטעמים שנזכרים בסעיף */
  const base = t => t.replace(/\s*\(.*\)$/, "");
  async function inline(root) {
    const boxes = [...root.querySelectorAll(".ainl")]; if (!boxes.length) return;
    let have = []; try { have = await keys(); } catch (e) { return; }
    for (const bx of boxes) {
      const txt = bx.closest(".bsec") ? bx.closest(".bsec").textContent : "";
      const ts = TAAM.filter(t => txt.includes(base(t)) || (t.includes("(") && txt.includes(t.replace(/^.*\((.*)\)$/, "$1"))));
      const rec = ts.flatMap(t => TRAD.filter(s => have.includes(t + "|" + s)).map(s => [t, s]));
      bx.innerHTML = `<b><i class=ic ic-vol></i> השמעה</b>` + (rec.length ? rec.map(([t, s]) => `<button class="chip" data-aplay="${esc(t + "|" + s)}">▶ ${esc(base(t))} · ${esc(s)}</button>`).join("")
        : `<span class="note">${ts.length ? "לטעמים שבסעיף זה" : "לסעיף זה"} אין עדיין הקלטות.</span><button class="chip" data-m2="audio">הוספת הקלטות</button>`);
    }
    if (!root.__aplay) { root.__aplay = true; root.addEventListener("click", async e => { const p = e.target.closest(".ainl [data-aplay]"); if (!p) return; const b = await get(p.dataset.aplay); if (!b) return; if (player) { player.pause(); URL.revokeObjectURL(player.src); } player = new Audio(URL.createObjectURL(b)); player.play().catch(() => {}); }); }
  }
  g.KKAudio = { show, inline, TAAM, TRAD };
})(window);
