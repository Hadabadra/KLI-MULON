"""ממיר את docs/ROADMAP.md ל-data/roadmap.js (window.KK_ROADMAP) להטמעה בלשונית אודות.
שימוש: python tools/build_roadmap.py docs/ROADMAP.md data/roadmap.js"""
import html, json, re, sys

def inline(t):
    t = html.escape(t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', t)
    return t

def convert(md):
    out, lst = [], False
    def close():
        nonlocal lst
        if lst: out.append('</ul>'); lst = False
    for line in md.splitlines():
        s = line.strip()
        if not s: close(); continue
        m = re.match(r'^(#{1,3}) (.*)', s)
        if m:
            close(); n = len(m.group(1)) + 2
            out.append(f'<h{n}>{inline(m.group(2))}</h{n}>'); continue
        m = re.match(r'^(?:[-*]|\d+\.) (.*)', s)
        if m:
            if not lst: out.append('<ul class="rm">'); lst = True
            t = m.group(1)
            t = re.sub(r'^\[x\] ', '✅ ', t); t = re.sub(r'^\[ \] ', '⬜ ', t)
            out.append(f'<li>{inline(t)}</li>'); continue
        close(); out.append(f'<p>{inline(s)}</p>')
    close()
    return '\n'.join(out)

if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    h = convert(open(src, encoding='utf-8').read())
    open(dst, 'w', encoding='utf-8').write('window.KK_ROADMAP=' + json.dumps(h, ensure_ascii=False) + ';\n')
