"""Refresh marketing asset URLs after CSS, JS or static language packs change."""
from pathlib import Path
import hashlib,re
root=Path(__file__).resolve().parents[1]
p=root/'assets/js/site-i18n.js'
digest=hashlib.sha256(b''.join(x.read_bytes() for x in sorted((root/'assets/locales').glob('*.json')))).hexdigest()[:12]
p.write_text(re.sub(r'\.json\?v=[a-f0-9]+','.json?v='+digest,p.read_text()))
for name in ['index.html','ozellikler.html']:
    p=root/name
    def replacement(m):
        digest=hashlib.sha256((root/m[2]).read_bytes()).hexdigest()[:12]
        return m[1]+m[2]+'?v='+digest+m[3]
    p.write_text(re.sub(r'((?:href|src)=")(assets/(?:css|js)/[^"?]+\.(?:css|js))(?:\?v=[a-f0-9]+)?(")',replacement,p.read_text()).rstrip()+'\n')
print('Updated stylesheet, script and locale revisions')
