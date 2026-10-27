/* רקע: מזהה אוטומטית מילה מסומנת בזמן לימוד ומציג הודעה לחיצה עם ההסבר */
(function () {
  const O = window.Otzaria; if (!O) return;
  const D = new KK.Dict(window.KK_DICT), MH = new KK.MhIndex(window.MH_INDEX);
  const DEF = { auto: true, mode: "toast", maxWords: 8, tLen: "normal", nakdan: true };
  let S = { ...DEF }, last = "", lastAt = 0, timer = null;
  const call = async (m, p) => { try { return await O.call(m, p || {}); } catch (e) { return { success: false }; } };
  async function loadSettings() {
    const r = await call("storage.get", { key: "settings" });
    if (r && r.success && r.data && typeof r.data === "object") S = { ...DEF, ...r.data };
  }
  function short(r, ctx) {
    const rk = KK.rank(r, ctx); if (S.noAcr) { rk.items = rk.items.filter(x => x.kind !== "acr"); rk.best = (rk.best || []).filter(x => x.kind !== "acr"); if (!rk.items.length) return null; } const order = ["lex", "enc", "laaz", "acr"];
    let pick = rk.confident ? rk.best.slice(0, 2) : order.map(k => rk.items.find(x => x.kind === k)).filter(Boolean).slice(0, 2);
    const d = pick.map(x => r.s[x.i][1]).filter(Boolean).join(" | ");
    const mx = S.tLen === "short" ? 60 : 150;
    return `${r.title}: ${d.length > mx ? d.slice(0, mx - 3) + "…" : d}` + (S.tLen === "short" ? "" : " — לחצו לפרטים");
  }
  function onSel(data) {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      await loadSettings();
      if (!S.auto || S.mode === "off") return;
      let txt = (data && (data.text || data.selectedText)) || "";
      const g = await call("reader.getSelection");          // טקסט הבחירה המלא והסופי
      let rawTxt = txt;
      if (g && g.success && g.data) { txt = g.data.text || txt; rawTxt = g.data.sourceSelectedText || g.data.renderedSelectedText || txt; }
      const t = KK.norm(txt);
      if (!t || t.split(" ").length > S.maxWords || t.length > 90) return;
      if (t === last && Date.now() - lastAt < 4000) return;
      const rs = D.resolve(t, S.maxWords), list = rs.phrase ? [rs.phrase] : [...rs.phrases, ...rs.words.filter(w => !rs.phrases.some(p => p.n.split(" ").includes(w.n)))];
      if (!list.length) {
        const hh = MH.find(t.split(" "), D); if (!hh.length) return;
        last = t; lastAt = Date.now();
        const mhp = { word: t, words: [], raw: rawTxt };
        if (S.mode === "panel") return void call("plugin.openSelf", { param: mhp });
        return void call("ui.showMessage", { message: `${hh[0].name}: אין במילון, אבל יש כרטסת בעינים למקרא (${KK.MH_LABEL[hh[0].g]}) — לחצו לפרטים`, tapPayload: mhp, tapOpenPlugin: true });
      }
      last = t; lastAt = Date.now();
      rawTxt = await KKNakdan.voc(rawTxt, S.nakdan);          // ניקוד מהנקדן המקומי, אם מותקן
      const ctx = { raw: rawTxt, words: t.split(" ") };
      const param = { word: list[0].title, words: rs.phrase ? [] : list.map(x => x.title), raw: rawTxt, phrases: rs.phrases.length };
      if (S.mode === "panel") return void call("plugin.openSelf", { param });
      const msg = short(list[0], ctx); if (!msg) return;
      const more = list.length > 1 ? ` (+${list.length - 1} מילים בבחירה)` : "";
      call("ui.showMessage", { message: msg + (list.length > 1 ? " · לחיצה: דף משולב" : "") + more, tapPayload: param, tapOpenPlugin: true });
    }, 300);
  }
  O.on("plugin.boot", loadSettings);
  O.on("reader.selection_changed", onSel);
})();
