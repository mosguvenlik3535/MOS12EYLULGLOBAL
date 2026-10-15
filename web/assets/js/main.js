'use strict';
const siteText=text=>window.mosSiteI18n?.text(text)||text;
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
function closeMenu(returnFocus=false){
 if(!nav||!menu)return;
 const wasOpen=menu.getAttribute('aria-expanded')==='true';
 nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label',siteText('Menüyü aç'));
 if(returnFocus&&wasOpen)menu.focus();
}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',siteText(open?'Menüyü kapat':'Menüyü aç'));});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>closeMenu()));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu(true);});
document.addEventListener('click',e=>{if(!nav?.contains(e.target)&&!menu?.contains(e.target))closeMenu();});
document.addEventListener('focusin',e=>{if(!nav?.contains(e.target)&&!menu?.contains(e.target))closeMenu();});
matchMedia('(max-width:800px)').addEventListener('change',()=>closeMenu());
const screens={sale:['01-hizli-satis.jpg','Mobil hızlı satış ekranı'],stock:['02-urun-stok-paneli.jpg','Ürün ve stok yönetimi ekranı'],report:['04-gun-sonu-raporu.jpg','Gün sonu raporu ekranı']};
const tabs=[...document.querySelectorAll('[data-screen]')];
function selectTab(tab){tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;});const [file,alt]=screens[tab.dataset.screen];const image=document.querySelector('#screen-image');image.src='assets/img/'+file;image.alt=siteText(alt);document.querySelector('#screen-panel').setAttribute('aria-labelledby',tab.id);document.querySelector('#screen-panel').scrollTop=0;}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const direction=(e.key==='ArrowRight'?1:-1)*(document.documentElement.dir==='rtl'?-1:1);next=(i+direction+tabs.length)%tabs.length;}else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();selectTab(tabs[next]);tabs[next].focus();});});
document.querySelector('#year').textContent=new Date().getFullYear();

document.addEventListener('site-language-changed',()=>{closeMenu();if(tabs.length){const selected=tabs.find(t=>t.getAttribute('aria-selected')==='true');if(selected)selectTab(selected);}});
