from pathlib import Path
from PIL import Image
import hashlib,json,zipfile
root=Path(__file__).resolve().parent
images=sorted((root/'gorseller').glob('*-R2.jpg'))
assert len(images)==5
assert len(list((root/'gorseller').glob('*.jpg')))==5,'Do not ship previous covers'
audit=json.loads((root/'kaynak/ocr-R2.json').read_text())
for entry in audit['images']:
 assert not entry['matches']
 assert hashlib.sha256((root/'gorseller'/entry['file']).read_bytes()).hexdigest()==entry['sha256']
for p in images:
 with Image.open(p) as im:
  assert im.size==(1200,1800),(p,im.size)
  assert im.mode=='RGB',(p,im.mode)
  assert tuple(round(x) for x in im.info.get('dpi',()))==(96,96),(p,im.info)
 assert p.stat().st_size<5_000_000
assert len((root/'belgeler/01-URUN-BASLIGI.txt').read_text().strip())<=100
copy=(root/'belgeler/02-URUN-ACIKLAMASI.html').read_text()
for banned in ['http://','https://','wa.me','555 406','%70','1.499']:
 assert banned not in copy,banned
assert '1 bilgisayar' in copy and 'İlk uzaktan kurulum' in copy
pdf=root/'belgeler/03-LISTELEME-VE-SATIS-PLANI.pdf'
assert pdf.read_bytes().startswith(b'%PDF-')
files=images+sorted((root/'belgeler').glob('*'))+[root/'OKU-ONCE.txt',root/'REVIZYON-R2-OKU.txt']
checksums='\n'.join(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(root)}" for p in files)+'\n'
out=Path.home()/'.cache/mos-trendyol';out.mkdir(parents=True,exist_ok=True)
archive=out/'MOS-BARCODE-Trendyol-Satis-Paketi.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,p.relative_to(root))
 z.writestr('SHA256SUMS.txt',checksums)
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print('PASS: 5 RGB JPEGs, 1200×1800 / 96 DPI; title; copy; PDF; ZIP CRC')
print(archive,archive.stat().st_size)

revised=out/'MOS-BARCODE-Trendyol-Gorseller-REVIZE-R2.zip'
with zipfile.ZipFile(revised,'w',compression=zipfile.ZIP_DEFLATED) as z:
 for p in images:z.write(p,p.name)
 z.write(root/'REVIZYON-R2-OKU.txt','REVIZYON-R2-OKU.txt')
with zipfile.ZipFile(revised) as z:
 assert z.testzip() is None
 assert len([n for n in z.namelist() if n.endswith('.jpg')])==5
 assert all(n.endswith('-R2.jpg') for n in z.namelist() if n.endswith('.jpg'))
print('PASS: R2 OCR evidence matches final image hashes; revised image-only ZIP',revised,revised.stat().st_size)
