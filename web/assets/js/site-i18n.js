/* Local, complete language packs. No visitor text is sent to a translation service. */
(()=>{
'use strict';
const supported=['tr','en','de','fr','es','it','pt','nl','pl','ro','el','ru','ar','zh'];
const picker=document.querySelector('#site-language');if(!picker)return;
let current='tr',dictionary={},serial=0;
const texts=[],attributes=[];
const skip=el=>!el||el.closest('script,style,select,[data-no-translate],svg');
const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
while(walker.nextNode()){const node=walker.currentNode;if(!skip(node.parentElement)&&node.data.trim())texts.push([node,node.data]);}
document.querySelectorAll('[alt],[aria-label],[title],meta[name="description"],meta[property="og:title"],meta[property="og:description"]').forEach(el=>{
 if(el.closest('[data-no-translate]'))return;
 ['alt','aria-label','title',...(el.tagName==='META'?['content']:[])].forEach(attr=>{const text=el.getAttribute(attr);if(text)attributes.push([el,attr,text]);});
});
const lookup=text=>dictionary[text.trim()]||text.trim();
function decorateLinks(){document.querySelectorAll('a[href]').forEach(a=>{const raw=a.getAttribute('href');if(!raw||raw.startsWith('#')||/^(https?:|mailto:|tel:)/i.test(raw))return;const url=new URL(raw,location.href);if(url.origin===location.origin&&/\.(?:html)$/.test(url.pathname)){url.searchParams.set('lang',current);a.setAttribute('href',url.pathname.split('/').pop()+url.search+url.hash);}});}
async function useLanguage(lang,remember=true){
 if(!supported.includes(lang))lang='tr';const ticket=++serial;picker.disabled=true;
 try{
  let data={};if(lang!=='tr'){const res=await fetch('assets/locales/'+lang+'.json?v=253e23f45ab8');if(!res.ok)throw Error('language unavailable');const pack=await res.json();if(pack.locale!==lang||!pack.texts)throw Error('invalid language pack');data=pack.texts;}
  if(ticket!==serial)return;dictionary=data;current=lang;
  for(const [node,original] of texts){const trimmed=original.trim();node.data=original.replace(trimmed,()=>lookup(original));}
  for(const [el,attr,original] of attributes)el.setAttribute(attr,lookup(original));
  document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';picker.value=lang;
  document.querySelector('#language-status').textContent='';document.querySelector('#language-status').classList.remove('language-warning');
  if(remember){try{localStorage.setItem('mosbarcode_site_language',lang);}catch{/* privacy mode */}}
  const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);decorateLinks();
  document.dispatchEvent(new CustomEvent('site-language-changed',{detail:{locale:lang}}));
 }catch{
  const status=document.querySelector('#language-status');status.textContent='Dil yüklenemedi / Language could not be loaded. Please try again.';status.classList.add('language-warning');picker.value=current;
 }finally{if(ticket===serial)picker.disabled=false;}
}
window.mosSiteI18n={text:lookup,get locale(){return current;}};
picker.addEventListener('change',()=>void useLanguage(picker.value));
let saved;try{saved=localStorage.getItem('mosbarcode_site_language');}catch{/* privacy mode */}
const requested=new URL(location.href).searchParams.get('lang');const browser=(navigator.language||'tr').slice(0,2);
void useLanguage(supported.includes(requested)?requested:supported.includes(saved)?saved:supported.includes(browser)?browser:'tr',false);
})();
