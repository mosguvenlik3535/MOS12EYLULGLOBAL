import json, re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'assets/locales'
source=set(json.loads((root/'source.json').read_text()))
for lang in ['tr','en','de','fr','es','it','pt','nl','pl','ro','el','ru','ar','zh']:
 p=root/f'{lang}.json'
 data=json.loads(p.read_text())
 assert data['locale']==lang and set(data['texts'])==source,lang
 assert all(isinstance(v,str) and v.strip() for v in data['texts'].values()),lang
 for original,translated in data['texts'].items():
  if 'MOS BARCODE' in original: assert 'MOS BARCODE' in translated,(lang,'brand changed')
  if '0000' in original: assert '0000' in translated,(lang,'PIN changed')
  normalized=re.sub(r'(?<=\d)[.,\s](?=\d)','',translated)
  if '4.999' in original: assert '4999' in normalized,(lang,'price changed')
  if '1.000' in original: assert '1000' in normalized,(lang,'demo limit changed')
print('PASS: 14 complete language packs,',len(source),'keys each')
