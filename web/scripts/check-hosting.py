"""Check the small overlay ZIP without downloading or changing existing installers."""
import hashlib,json,re,zipfile,struct
from pathlib import Path
archive=Path.home()/'.cache/mospos-hosting/MOSBARCODE-dil-PWA-guncelleme.zip'
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    names=set(z.namelist())
    assert {'index.html','ozellikler.html','uygulama/index.html','uygulama/sw.js','uygulama/manifest.webmanifest','GUNCELLEME-OKU.txt'}<=names
    assert not any(n.startswith('indir/') or n.endswith(('.exe','.apk','.map')) for n in names)
    home=z.read('index.html').decode()
    assert 'href="uygulama/"' in home and 'https://mosguvenlik3535.github.io/MOS12EYLULGLOBAL/"' not in home
    assert len(re.findall(r'href="indir/v1.15.20/[^\"]+"',home))==3
    for page in ['index.html','ozellikler.html']:
        for asset,digest in re.findall(r'(assets/(?:css|js)/[^"?]+)\?v=([a-f0-9]+)',z.read(page).decode()):
            assert hashlib.sha256(z.read(asset)).hexdigest().startswith(digest),asset
    assert 'id="global-coverage-title"' in home
    assert '14 dilde kullanım. 14 ülke için vergi hesaplama.' in home
    features=z.read('ozellikler.html').decode()
    assert 'class="global-coverage-note"' in features
    for module in ['sales','delivery','imkart','pos-integration','stock','purchase','credit','expense','staff','cash','settings']:
        assert f'assets/img/screens-pro/{module}.webp' in names
        assert f'assets/img/screens-pro/{module}-preview.webp' in names
        assert f'href="assets/img/screens-pro/{module}.webp"' in features
        png=f'assets/img/screens-pro/{module}.png'
        assert png in names
        assert struct.unpack('>II',z.read(png)[16:24])==(3200,2100),png
    assert features.count('class="module-screenshot"')==11
    assert features.count('class="module-highlight"')==11
    assert features.count('class="feature-explanation"')==53
    assert 'id="screen-viewer-details"' in features
    assert 'id="screen-viewer"' in features
    assert 'POS entegrasyonu ayrıca yıllık ücrete tabidir.' in features
    manifest=json.loads(z.read('uygulama/manifest.webmanifest'))
    assert manifest['scope']==manifest['start_url']=='./'
    sw=z.read('uygulama/sw.js').decode()
    assert 'key.startsWith(PREFIX)' in sw and 'url.pathname.startsWith(ROOT.pathname)' in sw
    en=json.loads(z.read('assets/locales/en.json'))['texts']
    assert en['Sal']=='Tue' and en['Cum']=='Fri'
    assert en['Fiş ve çevre birimleri']=='Receipts and peripherals'
    assert en['Kasada güçlü. Mobilde pratik.']=='Powerful at checkout. Convenient on mobile.'
print('PASS: small overlay ZIP, no installers, same-host PWA, scoped cache, asset revisions, translation regressions')
