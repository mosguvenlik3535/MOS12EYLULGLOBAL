#!/usr/bin/env python3
"""Build-time translations of public marketing copy; no runtime translation service.
Generate source catalog locally (--catalog); CI translates batches into static JSON.
Requires beautifulsoup4. All translated output is used as text, never HTML.
"""
import argparse, hashlib, json, re, time, urllib.request, urllib.parse
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[2]
DIR=ROOT/'web/assets/locales'
LANGS=['tr','en','de','fr','es','it','pt','nl','pl','ro','el','ru','ar','zh']
EXTRA=['Menüyü aç','Menüyü kapat','Mobil hızlı satış ekranı','Ürün ve stok yönetimi ekranı','Gün sonu raporu ekranı']
def catalog():
 keys=set(EXTRA)
 version=json.loads((ROOT/'mosbarkod/package.json').read_text())['version']
 keys.update([f'Doğrudan sitemizden indirilen demo paketleri: v{version}', 'macOS & Linux için bize yazın', 'Mac/Linux kurulumları için iletişime geçin. iPhone/PWA harici uygulama adresinde açılır; demo paketi değildir ve lisans gerekebilir. Mac paketleri notarize değildir.'])
 for name in ['index.html','ozellikler.html']:
  soup=BeautifulSoup((ROOT/'web'/name).read_text(),'html.parser')
  for node in soup.find_all(string=True):
   if any(p.name in ['script','style','select','svg'] or p.has_attr('data-no-translate') for p in node.parents):continue
   text=str(node).strip()
   if text and re.search(r'[^\W\d_]',text,re.UNICODE) and text not in ['html','MOS','BARCODE','M','PORTABLE','FULL PRO','MOSBARKOD.COM.TR']:
    keys.add(text)
  for el in soup.select('[alt],[aria-label],[title],meta[name="description"],meta[property="og:title"],meta[property="og:description"]'):
   if el.has_attr('data-no-translate') or el.find_parent(attrs={'data-no-translate':True}):continue
   for attr in ['alt','aria-label','title']+(['content'] if el.name=='meta' else []):
    if el.get(attr):keys.add(el[attr].strip())
 DIR.mkdir(parents=True,exist_ok=True)
 source=sorted(keys)
 (DIR/'source.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
 print('Catalog:',len(source),'strings;',sum(map(len,source)),'characters')

def translate_batch(items,lang):
 # Numbered delimiters retain paragraph boundaries across translation.
 query='\n\n'.join(f'[{i:04d}]\n{text.replace("MOS BARCODE", "https://mosbarcode.invalid")}' for i,text in enumerate(items))
 url='https://translate.googleapis.com/translate_a/single?'+urllib.parse.urlencode({'client':'gtx','sl':'tr','tl':lang,'dt':'t','q':query})
 for retry in range(5):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
   data=json.loads(urllib.request.urlopen(req,timeout=45).read())
   translated=''.join(x[0] for x in data[0] if x and x[0])
   found=list(re.finditer(r'\[\s*(\d{4})\s*\]',translated))
   if len(found)!=len(items):raise ValueError('translation lost delimiters')
   result=[]
   for i,m in enumerate(found):
    if int(m[1])!=i:raise ValueError('translation reordered keys')
    text=translated[m.end():found[i+1].start() if i+1<len(found) else len(translated)].strip()
    if not text:raise ValueError('empty translation')
    # Preserve proper names and stable amount spellings across packs.
    text=text.replace('https://mosbarcode.invalid','MOS BARCODE')
    text=re.sub(r'MOS\s*BARCODE','MOS BARCODE',text,flags=re.I)
    result.append(text)
   return result
  except Exception as error:
   if retry==4:raise RuntimeError(f'{lang}: translation failed: {type(error).__name__}') from None
   time.sleep(3*(retry+1))

def run():
 source=json.loads((DIR/'source.json').read_text())
 digest=hashlib.sha256(json.dumps(source,ensure_ascii=False).encode()).hexdigest()
 for lang in LANGS:
  path=DIR/f'{lang}.json'
  existing=json.loads(path.read_text()) if path.exists() else {}
  texts=existing.get('texts',{})
  overrides=ROOT/'web/scripts/site-overrides.json'
  if overrides.exists(): texts.update(json.loads(overrides.read_text()).get(lang,{}))
  pending=[s for s in source if s not in texts]
  if lang=='tr':texts={s:s for s in source};pending=[]
  batches=[];batch=[];length=0
  for text in pending:
   if batch and length+len(text)>2600:batches.append(batch);batch=[];length=0
   batch.append(text);length+=len(text)+12
  if batch:batches.append(batch)
  for n,batch in enumerate(batches,1):
   out=translate_batch(batch,lang)
   texts.update(zip(batch,out))
   # Save progress atomically; do not mark a pack complete until every key exists.
   payload={'locale':lang,'sourceHash':digest,'translation':'build-time automatic; review commercial wording','texts':{k:texts[k] for k in source if k in texts}}
   path.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
   print(lang,n,'/',len(batches),flush=True);time.sleep(.4)
  assert set(source)<=set(texts)
  path.write_text(json.dumps({'locale':lang,'sourceHash':digest,'translation':'Original' if lang=='tr' else 'Build-time automatic translation','texts':{k:texts[k] for k in source}},ensure_ascii=False,indent=2)+'\n')
 print('All 14 packs complete')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--catalog',action='store_true');args=parser.parse_args()
 if args.catalog:catalog()
 else:run()
