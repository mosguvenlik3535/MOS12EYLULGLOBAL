'use strict';
const sectionLinks=[...document.querySelectorAll('.guide-nav a')];
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;sectionLinks.forEach(a=>{if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}},{rootMargin:'-110px 0px -55% 0px'});
 document.querySelectorAll('.module-detail').forEach(section=>observer.observe(section));
}

// Links continue to open the original image if dialog support or JavaScript is unavailable.
(()=>{
 const viewer=document.querySelector('#screen-viewer');
 if(!viewer||typeof viewer.showModal!=='function')return;
 const links=[...document.querySelectorAll('.screenshot-open')];
 const image=viewer.querySelector('#screen-viewer-image');
 const title=viewer.querySelector('#screen-viewer-title');
 const original=viewer.querySelector('#screen-viewer-original');
 const details=viewer.querySelector('#screen-viewer-details');
 let index=0,opener=null;
 function render(){
  const link=links[index];
  const heading=link.closest('.module-detail').querySelector('h2').textContent;
  image.src=link.href;image.alt=heading;title.textContent=heading;original.href=link.dataset.original||link.href;
  details.replaceChildren();
  for(const block of link.closest('.module-detail').querySelectorAll(':scope > .module-highlight,:scope > .module-breakdown,:scope > .module-note,:scope > .integration-fee')){
   const copy=block.cloneNode(true);copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));details.append(copy);
  }
  viewer.scrollTop=0;
 }
 function move(delta){index=(index+delta+links.length)%links.length;render();}
 for(const [i,link] of links.entries())link.addEventListener('click',event=>{
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();index=i;opener=link;render();viewer.showModal();document.documentElement.classList.add('screen-viewer-open');
 });
 viewer.querySelector('.screen-viewer-close').addEventListener('click',()=>viewer.close());
 viewer.querySelector('.screen-viewer-prev').addEventListener('click',()=>move(-1));
 viewer.querySelector('.screen-viewer-next').addEventListener('click',()=>move(1));
 viewer.addEventListener('keydown',event=>{
  if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
   event.preventDefault();const rtl=document.documentElement.dir==='rtl';move((event.key==='ArrowRight'?1:-1)*(rtl?-1:1));
  }
 });
 viewer.addEventListener('click',event=>{
  if(event.target!==viewer)return;
  const r=viewer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)viewer.close();
 });
 viewer.addEventListener('close',()=>{document.documentElement.classList.remove('screen-viewer-open');opener?.focus({preventScroll:true});});
 document.addEventListener('site-language-changed',()=>{if(viewer.open)render();});
})();
