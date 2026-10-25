// בדיקת דיוק שורשים ובניינים: node tests/run-roots.js
const fs = require("fs"), path = require("path"), root = path.join(__dirname, "..");
global.window = global; eval(fs.readFileSync(path.join(root, "data/dict.js"), "utf8"));
const K = require(path.join(root, "js/core.js")), D = new K.Dict(window.KK_DICT);
const un = s => s.replace(/[ךםןףץ]/g, c => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" }[c]));
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "roots.json"), "utf8"));
let ok = 0, bOk = 0, bTot = 0; const fails = [];
for (const c of cases) {
  const a = D.analyze(c.word), good = un(a.root) === un(c.root); if (good) ok++; else fails.push(`${c.word}: קיבלתי ${a.root} (${a.binyan}), ציפיתי ${c.root}`);
  if (c.binyan) { bTot++; if (a.binyan.includes(c.binyan)) bOk++; }
}
console.log(`שורשים: ${ok}/${cases.length} (${(100 * ok / cases.length).toFixed(1)}%) | בניינים: ${bOk}/${bTot} (${bTot ? (100 * bOk / bTot).toFixed(1) : 0}%)`);
if (process.argv.includes("-v")) console.log(fails.join("\n"));
if (ok / cases.length < 0.9) process.exitCode = 1;
