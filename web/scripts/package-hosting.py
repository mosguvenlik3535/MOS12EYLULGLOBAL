#!/usr/bin/env python3
"""Build a public_html-ready site with verified release demos (no secrets).
Requires Python 3 and authenticated gh. Large output stays outside Git.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
VERSION = json.loads((ROOT / 'mosbarkod/package.json').read_text())['version']
REPO = 'mosguvenlik3535/MOS12EYLULGLOBAL'
OUT = Path.home() / '.cache' / 'mospos-hosting'
STAGE = OUT / 'public_html'
FILES = [f'MOSBARKODYAZILIM-Demo-Setup-{VERSION}.exe',
         f'MOSBARKODYAZILIM-Demo-Portable-{VERSION}.exe', 'app-debug-demo.apk']
subprocess.run(['python3',str(ROOT/'web/scripts/check-locales.py')],check=True)
OUT.mkdir(parents=True, exist_ok=True)
STAGE.mkdir(exist_ok=True)
# Never include repository internals or developer documentation in the public site.
for name in ['index.html', 'ozellikler.html']:
    shutil.copy2(ROOT / 'web' / name, STAGE / name)
shutil.copytree(ROOT / 'web' / 'assets', STAGE / 'assets', dirs_exist_ok=True)
(STAGE / 'assets/js/i18n.js').unlink(missing_ok=True)  # obsolete, not loaded by the site
shutil.copy2(ROOT / 'mosbarkod/public/gizlilik-politikasi.html', STAGE / 'gizlilik-politikasi.html')
for name in ['index.html', 'ozellikler.html']:
    path = STAGE / name
    text = path.read_text()
    for filename in FILES:
        old = f'https://github.com/{REPO}/releases/download/v{VERSION}/{filename}'
        text = text.replace(old, f'indir/v{VERSION}/{filename}')
    text = text.replace(f'https://github.com/{REPO}/releases/tag/v{VERSION}',
                        'https://wa.me/905554066143?text=Mac%20veya%20Linux%20kurulum%20paketi%20hakkinda%20bilgi%20almak%20istiyorum.')
    text = text.replace('macOS & Linux paketleri <span>', 'macOS & Linux için bize yazın <span>')
    text = text.replace(f'https://mosguvenlik3535.github.io/MOS12EYLULGLOBAL/gizlilik-politikasi.html', 'gizlilik-politikasi.html')
    text = text.replace('İndirilebilir paketler:', 'Doğrudan sitemizden indirilen demo paketleri:')
    text = text.replace('Bu bağlantılar demo paketi değildir; lisans gerekebilir. Mac paketleri notarize değildir.',
                        'Mac/Linux kurulumları için iletişime geçin. iPhone/PWA harici uygulama adresinde açılır; demo paketi değildir ve lisans gerekebilir. Mac paketleri notarize değildir.')
    path.write_text(text)

# Download the exact public release artifacts and check against GitHub metadata.
release = json.loads(subprocess.check_output(['gh','api',f'repos/{REPO}/releases/tags/v{VERSION}']))
assets = {a['name']:a for a in release['assets']}
dest = STAGE / 'indir' / f'v{VERSION}'
dest.mkdir(parents=True,exist_ok=True)
checksums=[]
for filename in FILES:
    asset=assets[filename]
    file=dest/filename
    def verified():
        if not file.exists() or file.stat().st_size!=asset['size']: return False
        digest=asset.get('digest')
        with file.open('rb') as handle: actual=hashlib.file_digest(handle,'sha256').hexdigest()
        return not digest or digest=='sha256:'+actual
    if not verified():
        result=subprocess.run(['gh','release','download',f'v{VERSION}','--repo',REPO,'--pattern',filename,'--dir',str(dest),'--clobber'],capture_output=True)
        if result.returncode: raise RuntimeError('Release download failed (network/access): '+filename)
    if not verified(): raise RuntimeError('Release verification failed: '+filename)
    with file.open('rb') as handle: digest=hashlib.file_digest(handle,'sha256').hexdigest()
    checksums.append(f'{digest}  {filename}')
    print('Verified:',filename, file.stat().st_size)
assert all(f'indir/v{VERSION}/{n}' in (STAGE/'index.html').read_text() for n in FILES)
assert 'github.com/' not in (STAGE/'index.html').read_text()
(dest/'SHA256SUMS.txt').write_text('\n'.join(checksums)+'\n')
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
archive=OUT/'MOSBARKOD-public_html.zip'
with zipfile.ZipFile(archive,'w',allowZip64=True) as z:
    for file in sorted(STAGE.rglob('*')):
        if file.is_file():
            compression=zipfile.ZIP_STORED if file.suffix in ['.exe','.apk'] else zipfile.ZIP_DEFLATED
            z.write(file,file.relative_to(STAGE),compress_type=compression)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert 'index.html' in z.namelist() and all(f'indir/v{VERSION}/{n}' in z.namelist() for n in FILES)
print('Ready:',archive, f'({archive.stat().st_size/1024/1024:.1f} MiB)')
