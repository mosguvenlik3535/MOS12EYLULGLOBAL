"""Offline checks for marketing links, assets and pinned platform downloads.
Run with Python + beautifulsoup4; installers/PWA are verified in check-hosting.py.
"""
import json, re
from pathlib import Path
from urllib.parse import urlsplit, unquote
from bs4 import BeautifulSoup

root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'scripts/downloads.json').read_text())
pages={name:BeautifulSoup((root/name).read_text(),'html.parser') for name in ['index.html','ozellikler.html','gizlilik-politikasi.html']}
for name,soup in pages.items():
    ids=[el['id'] for el in soup.select('[id]')]
    assert len(ids)==len(set(ids)),(name,'duplicate IDs')
    assert len(soup.select('h1'))==1,(name,'one main heading required')
    for el in soup.select('[src],link[href],a[href]'):
        raw=el.get('src',el.get('href',''))
        url=urlsplit(raw)
        if url.scheme or url.netloc or raw.startswith('data:'):continue
        target=unquote(url.path)
        if target=='uygulama/':continue # Generated licensed build; tested in hosting ZIP.
        path=root/(target or name)
        assert path.is_file(),(name,'missing local target',raw)
        if url.fragment and path.suffix=='.html':
            destination=pages.get(path.name) or BeautifulSoup(path.read_text(),'html.parser')
            assert destination.find(id=unquote(url.fragment)),(name,'missing anchor',raw)
    for img in soup.select('img'):
        assert img.has_attr('alt'),(name,'image missing alt')
    if name!='gizlilik-politikasi.html':
        assert len(soup.select('#site-language option'))==14
        assert soup.select_one('a[href="gizlilik-politikasi.html"]')
for platform,item in manifest.items():
    link=pages['index.html'].select_one(f'a[data-download="{platform}"]')
    expected=f"https://github.com/mosguvenlik3535/MOS12EYLULGLOBAL/releases/download/v{item['version']}/{item['file']}"
    assert link and link['href']==expected,(platform,'manifest does not match download URL')
for path in (root/'assets/css').glob('*.css'):
    css=path.read_text()
    assert 'fonts.googleapis.com' not in css
    for target in re.findall(r'url\([\'"]?([^\s)\'"]+)',css):
        if target.startswith(('data:','http','#')):continue
        assert (path.parent/target).is_file(),('missing CSS asset',target)
assert (root/'gizlilik-politikasi.html').read_bytes()==(root.parent/'mosbarkod/public/gizlilik-politikasi.html').read_bytes()
home=pages['index.html']
assert home.select_one('.previous-price del').get_text(strip=True)=='4.999 TL'
assert home.select_one('.pro-price [data-no-translate]').get_text(strip=True)=='1.499 TL'
assert home.select_one('.discount-badge').get_text(strip=True)=='%70 İNDİRİM'
assert home.select_one('.pro-price .vat-label').get_text(strip=True)=='+ KDV'
message=unquote(home.select_one('.purchase-link')['href'])
assert '1.499 TL + KDV' in message and '4.999' not in message
assert '4.999' not in home.select_one('.faq-list').get_text()
assert '4.999' not in pages['ozellikler.html'].get_text()
assert '1.499 TL' in pages['ozellikler.html'].get_text()
assert '0000' in pages['index.html'].get_text()
print('PASS: local links/anchors, unique headings/IDs, 14-language pickers, platform download manifest, local fonts and privacy page')
