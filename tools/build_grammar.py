"""בונה data/grammar.js מ-docs/grammar.md; שומר title/note/figs מהקובץ הקיים."""
import json, re, sys
src, out = (sys.argv[1:3] if len(sys.argv) > 2 else ("docs/grammar.md", "data/grammar.js"))
old = open(out, encoding="utf8").read()
obj = json.loads(old[old.index("{"):old.rstrip().rstrip(";").rindex("}") + 1])
obj["text"] = open(src, encoding="utf8").read()
head = old[:old.index("window.KK_GRAMMAR")]
open(out, "w", encoding="utf8").write(head + "window.KK_GRAMMAR = " + json.dumps(obj, ensure_ascii=False) + ";\n")
print("ok", len(obj["text"]))
