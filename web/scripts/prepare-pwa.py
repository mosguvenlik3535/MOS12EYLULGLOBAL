"""Copy the production, licensed build to a subfolder with a scoped offline cache."""
import hashlib, json, shutil, sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
src=root/'mosbarkod/dist'
dest=Path(sys.argv[1])
assert (src/'index.html').is_file(), 'Build the production PWA first'
if dest.exists(): shutil.rmtree(dest)
shutil.copytree(src,dest)
manifest=json.loads((dest/'manifest.webmanifest').read_text())
manifest.update(start_url='./',scope='./',id='./')
(dest/'manifest.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
revision=hashlib.sha256((dest/'index.html').read_bytes()).hexdigest()[:16]
(dest/'sw.js').write_text('''// Only this application folder is cached. Never cache the marketing site.
const PREFIX='mosbarcode-hosted-pwa-';
const CACHE=PREFIX+''' +json.dumps(revision)+''';
const ROOT=new URL('./',self.location.href);
self.addEventListener('install',event=>event.waitUntil(
 caches.open(CACHE).then(cache=>cache.addAll(['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'])).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
 caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
 event.respondWith(fetch(req).then(res=>{
  if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)));}
  return res;
 }).catch(async()=> (await caches.match(req)) || (req.mode==='navigate' ? await caches.match(new URL('index.html',ROOT).href) : null) || Response.error()));
});
''')
(dest/'.htaccess').write_text('''<IfModule mod_mime.c>
AddType application/manifest+json .webmanifest
</IfModule>
<IfModule mod_headers.c>
<FilesMatch "^(index\\.html|sw\\.js|manifest\\.webmanifest)$">
Header set Cache-Control "no-cache"
</FilesMatch>
</IfModule>
''')
print('Prepared scoped production PWA:',dest)
