/* הנקדן המקומי (אופציונלי): תוסף אוצריא נפרד ("הנקדן", באדיבות יוסף שלום בן שטרית) שמנקד טקסט על המחשב.
   כשהוא פועל, הבחירה מנוקדת לפני דירוג הפירושים, וכך נבחר הפירוש לפי ההקשר. הפרוטוקול הועתק מ"עינים למקרא"
   (shell/nikud-engine.js): GET /api/status ו-POST /api/nikud {text} ב-127.0.0.1:5000–5010, דרך network.fetchStream. */
(function (g) {
  const PORTS = [5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 5010];
  const FORUM = "https://otzaria.org/forum/post/31275";
  let port = null, lastScan = 0;
  const VOW = /[֑-ׇ]/;
  async function req(url, opts) {
    const O = g.Otzaria; opts = opts || {};
    if (O && O.call) {
      let ch = O.call("network.fetchStream", { url, method: opts.method || "GET", headers: opts.headers, body: opts.body, timeoutMs: opts.timeoutMs || 15000 });
      if (ch && typeof ch.then === "function" && !ch[Symbol.asyncIterator]) ch = await ch;
      if (ch && ch.data && ch.data[Symbol.asyncIterator]) ch = ch.data;
      if (!ch || !ch[Symbol.asyncIterator]) throw new Error("no stream");
      let ok = false, body = "";
      for await (const c of ch) { if (!c) continue; if (c.type === "response") ok = !!c.ok; else if (c.type === "data" && typeof c.body === "string") body += c.body; }
      return { ok, body };
    }
    const r = await fetch(url, { method: opts.method || "GET", headers: opts.headers, body: opts.body }); return { ok: r.ok, body: await r.text() };
  }
  async function scan(force) {
    if (port !== null && !force) return port;
    if (!force && Date.now() - lastScan < 60000) return null;   // לא סורקים שוב ושוב כשהנקדן לא מותקן
    lastScan = Date.now();
    for (const p of PORTS) { try { const r = await req(`http://127.0.0.1:${p}/api/status`, { timeoutMs: 400 }); if (r.ok) return (port = p); } catch (e) {} }
    return (port = null);
  }
  /* 3.1.0 (#86): ההגדרות הראו "מחובר" אבל ניקוד נכשל — כשל אחד איפס את החיבור ל-60 שניות. עכשיו: סריקה מחדש וניסיון נוסף, וזמן המתנה לפי אורך הטקסט */
  async function post(text) {
    const r = await req(`http://127.0.0.1:${port}/api/nikud`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }), timeoutMs: Math.min(60000, 8000 + text.length * 20) });
    if (!r.ok) throw new Error("nikud http"); const d = JSON.parse(r.body); return typeof d.vocalized === "string" ? d.vocalized : null;
  }
  async function vocalize(text) {
    if (!text || !text.trim()) return null;
    if (!(await scan()) && !(await scan(true))) return null;
    try { return await post(text); }
    catch (e) { port = null; if (!(await scan(true))) return null; try { return await post(text); } catch (e2) { return null; } }
  }
  /* מחזיר את הטקסט מנוקד כשאין בו ניקוד והנקדן מחובר; אחרת את המקור כמות שהוא */
  async function voc(raw, enabled) { if (enabled === false || !raw || VOW.test(raw)) return raw; return (await vocalize(raw)) || raw; }
  g.KKNakdan = { voc, scan, FORUM, connected: () => port !== null };
})(typeof window !== "undefined" ? window : globalThis);
