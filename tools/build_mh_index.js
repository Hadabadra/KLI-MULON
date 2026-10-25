// בונה את data/mh-index.js: שמות הערכים (ושמות נרדפים בלבד) של התוסף "עינים למקרא".
// שימוש:  node tools/build_mh_index.js <נתיב-לשכפול-של-madaei-hatanach> data/mh-index.js
const fs = require("fs"), vm = require("vm"), path = require("path");
const [repo, outFile] = [process.argv[2], process.argv[3] || "data/mh-index.js"];
const ids = ["people","places","animal","flora","domem","amoraim","beithamikdash","mumim","chullin","sukkah","archaeology"];
const out = {};
for (const id of ids) {
  const dir = path.join(repo, "guides", id, "data"), loader = path.join(dir, "_loader.html");
  if (!fs.existsSync(loader)) continue;
  const ctx = {}; vm.createContext(ctx);
  for (const m of fs.readFileSync(loader, "utf8").matchAll(/<script src="([^"]+)"/g)) {
    if (/images/.test(m[1])) continue;
    vm.runInContext(fs.readFileSync(path.join(dir, m[1]), "utf8").replace(/\b(const|let)\b/g, "var"), ctx, { timeout: 20000 });
  }
  out[id] = (ctx.DATA || []).map(e => [e.name, ...(Array.isArray(e.aliases) ? e.aliases.filter(a => typeof a === "string") : [])]).filter(a => a[0]);
}
fs.writeFileSync(outFile, '/* אינדקס שמות הערכים של התוסף "עינים למקרא", לקישור בלבד. נוצר ע"י tools/build_mh_index.js */\nwindow.MH_INDEX=' + JSON.stringify(out) + ";\n");
console.log(Object.entries(out).map(([k, v]) => k + ":" + v.length).join(" "));
