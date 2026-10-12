"""Check generated pages, local links, fragments and CSS resources (stdlib only)."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re

root = Path(__file__).resolve().parent.parent / 'dist'
errors = []
checks = 0

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.refs, self.ids, self.lang = [], set(), None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'html':
            self.lang = attrs.get('lang')
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        for key in ('href', 'src', 'poster'):
            if attrs.get(key):
                self.refs.append(attrs[key])
        if attrs.get('srcset'):
            self.refs.extend(item.strip().split()[0] for item in attrs['srcset'].split(','))

pages = {p: Page(p.read_text()) for p in root.rglob('*.html')}

def check(source, ref):
    global checks
    url = urlsplit(ref)
    if url.scheme or url.netloc:
        return
    checks += 1
    if url.path.startswith('/'):
        errors.append(f'{source.relative_to(root)}: root-relative URL breaks project Pages: {ref}')
        return
    target = (source.parent / unquote(url.path)).resolve() if url.path else source
    if target.is_dir():
        target /= 'index.html'
    if not target.is_relative_to(root) or not target.is_file():
        errors.append(f'{source.relative_to(root)}: missing target {ref}')
    elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
        errors.append(f'{source.relative_to(root)}: missing fragment {ref}')

for source, page in pages.items():
    if '{{' in source.read_text():
        errors.append(f'{source}: unresolved template token')
    for ref in page.refs:
        check(source, ref)

for source in root.rglob('*.css'):
    for ref in re.findall(r'url\(\s*[\"\']?([^\"\')]+)', source.read_text()):
        check(source, ref.strip())

for lang in ('es', 'en', 'fr'):
    for name in ('index.html', 'products/index.html'):
        path = root / lang / name
        if path not in pages or pages[path].lang != lang:
            errors.append(f'Wrong or missing language: {lang}/{name}')

if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} pages; {checks} local links/resources; ES/EN/FR Home and Products.')
