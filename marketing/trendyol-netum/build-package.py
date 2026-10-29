"""Validate this second product independently; never modify the software-only kit."""
import hashlib
import json
from pathlib import Path
import re
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = Path.home() / '.cache/mos-trendyol'
OUT.mkdir(parents=True, exist_ok=True)
expected = [f'{n:02d}-MOS-BARCODE-NETUM-USB.jpg' for n in range(1, 6)]
images = sorted((ROOT / 'gorseller').glob('*.jpg'))
assert [p.name for p in images] == expected
records = json.loads((ROOT / 'kaynak/ocr.json').read_text())
assert len(records) == 5
ocr = {r['file']: r for r in records}
assert set(ocr) == set(expected)
for p in images:
    with Image.open(p) as im:
        assert im.size == (1200, 1800) and im.mode == 'RGB'
        assert im.info.get('dpi') == (96, 96)
        im.verify()
    audit = ocr[p.name]
    assert hashlib.sha256(p.read_bytes()).hexdigest() == audit['sha256']
    assert audit['matches'] == []
    assert not re.search(r'\b(en|çok|satılan|satan)\b', audit['text'], re.I)
assert len((ROOT / 'URUN-BASLIGI.txt').read_text().strip()) <= 100
source = (ROOT / 'kaynak/kapaklar.html').read_text()
assert source.count('class="scanner-card"') == 5
assert 'Donanım dahil değildir' not in source
assert 'POS entegrasyonu yıllık ek ücretlidir.' in source
archive = OUT / 'MOS-BARCODE-NETUM-USB-Trendyol-Gorseller.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in images:
        z.write(p, p.name)
    for name in ['OKU-ONCE.txt', 'URUN-BASLIGI.txt', 'URUN-ACIKLAMASI.txt']:
        z.write(ROOT / name, name)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None and len(z.namelist()) == 8
print(f'Validated: 5 JPG, RGB 1200x1800, 96 DPI, OCR + SHA256. {archive} ({archive.stat().st_size} bytes)')
