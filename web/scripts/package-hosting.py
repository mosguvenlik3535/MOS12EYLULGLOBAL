#!/usr/bin/env python3
"""Build a public_html-ready site with verified release demos (no secrets).
Requires Python 3 and authenticated gh. Large output stays outside Git.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import time
import zipfile

ROOT = Path(__file__).resolve().parents[2]
REPO = 'mosguvenlik3535/MOS12EYLULGLOBAL'
OUT = Path.home() / '.cache' / 'mospos-hosting'
STAGE = OUT / 'public_html'
DOWNLOADS = list(json.loads((ROOT / 'web/scripts/downloads.json').read_text()).values())
def hosted_path(item):
    return f"indir/v{item['version']}/{item['file']}"
subprocess.run(['python3',str(ROOT/'web/scripts/check-locales.py')],check=True)
OUT.mkdir(parents=True, exist_ok=True)
if STAGE.exists(): shutil.rmtree(STAGE)
STAGE.mkdir()
# Never include repository internals or developer documentation in the public site.
for name in ['index.html', 'ozellikler.html']:
    shutil.copy2(ROOT / 'web' / name, STAGE / name)
shutil.copytree(ROOT / 'web' / 'assets', STAGE / 'assets', dirs_exist_ok=True)
(STAGE / 'assets/js/i18n.js').unlink(missing_ok=True)  # obsolete, not loaded by the site
shutil.copy2(ROOT / 'mosbarkod/public/gizlilik-politikasi.html', STAGE / 'gizlilik-politikasi.html')
for name in ['index.html', 'ozellikler.html']:
    path = STAGE / name
    text = path.read_text()
    for item in DOWNLOADS:
        old = f"https://github.com/{REPO}/releases/download/v{item['version']}/{item['file']}"
        text = text.replace(old, hosted_path(item))
    path.write_text(text)

# Include the licensed PWA; never enable the demo build flag here.
subprocess.run(['python3',str(ROOT/'web/scripts/prepare-pwa.py'),str(STAGE/'uygulama')],check=True)
# Pin each platform independently: Android-only releases do not contain Windows installers.
# Never silently fall back to a full/licensed build when a demo artifact is missing.
releases={}
for version in sorted({item['version'] for item in DOWNLOADS}):
    response=subprocess.run(['gh','api',f'repos/{REPO}/releases/tags/v{version}'],capture_output=True,check=True)
    releases[version]={asset['name']:asset for asset in json.loads(response.stdout)['assets']}
checksums={}
for item in DOWNLOADS:
    version,filename=item['version'],item['file']
    asset=releases[version].get(filename)
    if not asset: raise RuntimeError(f'Missing verified demo: v{version}/{filename}')
    dest=STAGE/'indir'/f'v{version}'
    dest.mkdir(parents=True,exist_ok=True)
    file=dest/filename
    def verified():
        if not file.exists() or file.stat().st_size!=asset['size']: return False
        digest=asset.get('digest')
        with file.open('rb') as handle: actual=hashlib.file_digest(handle,'sha256').hexdigest()
        return not digest or digest=='sha256:'+actual
    for download_attempt in range(3):
        if verified(): break
        try:
            subprocess.run(['gh','release','download',f'v{version}','--repo',REPO,'--pattern',filename,'--dir',str(dest),'--clobber'],capture_output=True,timeout=180)
        except subprocess.TimeoutExpired:
            pass
        if verified(): break
        print(f'Retrying verified installer download: {filename} ({download_attempt+1}/3)',flush=True)
        time.sleep(3*(download_attempt+1))
    if not verified(): raise RuntimeError('Release download/verification failed after retries: '+filename)
    with file.open('rb') as handle: digest=hashlib.file_digest(handle,'sha256').hexdigest()
    checksums.setdefault(dest,[]).append(f'{digest}  {filename}')
    print('Verified:',filename, file.stat().st_size)
assert all(hosted_path(item) in (STAGE/'index.html').read_text() for item in DOWNLOADS)
assert 'github.com/' not in (STAGE/'index.html').read_text()
for dest,lines in checksums.items():
    (dest/'SHA256SUMS.txt').write_text('\n'.join(lines)+'\n')
    (dest/'.htaccess').write_text('''<IfModule mod_mime.c>
AddType application/octet-stream .exe
AddType application/vnd.android.package-archive .apk
</IfModule>
<IfModule mod_headers.c>
<FilesMatch "\\.(exe|apk)$">
Header set Content-Disposition "attachment"
</FilesMatch>
</IfModule>
''')
(STAGE/'GUNCELLEME-OKU.txt').write_text('''MOS BARCODE — TAM public_html PAKETİ
Bu ZIP siteyi, 14 dili, gerçek ekran görsellerini, yazı tiplerini, demo kurulumlarını ve lisanslı iPhone/PWA uygulamasını içerir.
Önce mevcut public_html dosyalarınızı ve uygulamadaki işletme verilerinizi yedekleyin.
ZIP içeriğini doğrudan public_html içine çıkarın; index.html public_html kökünde olmalıdır.
Aynı adlı site dosyalarını değiştirin. Mevcut indir/ klasörünü ve başka sitelerin dosyalarını silmeyin.
Windows Setup / Portable: v1.15.20; Android doğrudan demo APK: v1.15.22.
Bu APK, Play Console AAB dosyası değildir. Demo ilk kurulum Admin PIN'i: 0000.
iPhone/PWA: https://www.mosbarcode.com.tr/uygulama/ — Safari > Paylaş > Ana Ekrana Ekle.
PWA lisanslıdır; sınırsız ücretsiz demo değildir. HTTPS gereklidir.
Farklı adresler (GitHub / kendi domaininiz veya www / www olmayan adres) veri paylaşmaz.
Adres değiştirirken tam ZIP yedek alıp yeni adreste geri yükleyin; doğrulamadan eski verileri silmeyin.
''')
archive=OUT/'MOSBARKOD-public_html.zip'
with zipfile.ZipFile(archive,'w',allowZip64=True) as z:
    for file in sorted(STAGE.rglob('*')):
        if file.is_file():
            compression=zipfile.ZIP_STORED if file.suffix in ['.exe','.apk'] else zipfile.ZIP_DEFLATED
            z.write(file,file.relative_to(STAGE),compress_type=compression)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert 'index.html' in z.namelist() and all(hosted_path(item) in z.namelist() for item in DOWNLOADS)
print('Ready:',archive, f'({archive.stat().st_size/1024/1024:.1f} MiB)')
