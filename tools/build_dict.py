# שימוש: python build_dict.py milon-klei-kodesh.zim dict.json   (דורש: pip install libzim)
import sys, re, json, html
from libzim.reader import Archive
a = Archive(sys.argv[1]); out = {}
sense = re.compile(r"<div class='sense'>(?:<span class='nk'>(.*?)</span>)?<span>(.*?)</span>(?:<div class='src'>מקור: (.*?)</div>)?</div>", re.S)
link = re.compile(r"<li><span class='kind'>(.*?)</span>: (.*?)</li>", re.S)
tag = re.compile(r"<[^>]+>")
cl = lambda s: html.unescape(tag.sub("", s)).strip()
for i in range(a.entry_count):
    e = a._get_entry_by_id(i)
    if e.is_redirect or e.path == "index": continue
    h = bytes(e.get_item().content).decode("utf-8", "ignore")
    h = h[h.find("</style>"):]
    s = [[cl(n), cl(d), cl(r or "")] for n, d, r in sense.findall(h)]
    if not s: continue
    out[html.unescape(e.title)] = {"s": s, "l": [[cl(k), cl(t)] for k, t in link.findall(h)]}
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "entries")
