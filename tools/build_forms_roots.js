/* 2.1.0: שורש לכל צורה בתנ"ך (שדה חמישי ב-data/forms.js) — לקונקורדנציה לפי שורש בכל הנטיות.
   השורש נקבע מערך הבסיס הדקדוקי (Hspell, גם אחרי הסרת אותיות שימוש) ומניתוח השורש של התוסף. node tools/build_forms_roots.js */
const fs = require("fs"); global.window = global;
for (const f of ["dict", "forms", "hspell"]) require("../data/" + f + ".js");
const KK = require("../js/core.js");
const D = new KK.Dict(window.KK_DICT).useLex(new KK.Lex({ hs: window.KK_HS }));
const rows = window.KK_FORMS.split("|").map(l => l.split("~").slice(0, 4));
const out = rows.map(([n, v, c, ref]) => {
  let root = "";
  const bs = D.bases(n).filter(b => b.how !== "~").sort((a, b) => b.r.n.length - a.r.n.length);
  if (bs.length) { const a = D.analyze(bs[0].r.n); if (a.ok) root = a.root; }
  if (!root) root = D.analyze(n).root;
  return [n, v, c, ref, root].join("~");
});
fs.writeFileSync("data/forms.js", "/* כל צורות המילים בתנ\"ך (מספריית אוצריא) — tools/build_forms.py + tools/build_forms_roots.js */\nwindow.KK_FORMS=" + JSON.stringify(out.join("|")) + ";\n");
console.log(out.length, "צורות עם שורש");
