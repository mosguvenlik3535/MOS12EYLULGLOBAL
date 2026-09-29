import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'assets/locales'
source=set(json.loads((root/'source.json').read_text()))
for lang in ['tr','en','de','fr','es','it','pt','nl','pl','ro','el','ru','ar','zh']:
 p=root/f'{lang}.json'
 data=json.loads(p.read_text())
 assert data['locale']==lang and set(data['texts'])==source,lang
 assert all(isinstance(v,str) and v.strip() for v in data['texts'].values()),lang
print('PASS: 14 complete language packs,',len(source),'keys each')
