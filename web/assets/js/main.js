'use strict';
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Menüyü aç');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Menüyü kapat':'Menüyü aç');});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
const screens={sale:['01-hizli-satis.jpg','Mobil hızlı satış ekranı'],stock:['02-urun-stok-paneli.jpg','Ürün ve stok yönetimi ekranı'],report:['04-gun-sonu-raporu.jpg','Gün sonu raporu ekranı']};
const tabs=[...document.querySelectorAll('[data-screen]')];
function selectTab(tab){tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;});const [file,alt]=screens[tab.dataset.screen];const image=document.querySelector('#screen-image');image.src='assets/img/'+file;image.alt=alt;document.querySelector('#screen-panel').setAttribute('aria-labelledby',tab.id);document.querySelector('#screen-panel').scrollTop=0;}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();selectTab(tabs[next]);tabs[next].focus();});});
document.querySelector('#year').textContent=new Date().getFullYear();
