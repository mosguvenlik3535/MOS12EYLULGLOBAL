'use strict';
const sectionLinks=[...document.querySelectorAll('.guide-nav a')];
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;sectionLinks.forEach(a=>{if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}},{rootMargin:'-110px 0px -55% 0px'});
 document.querySelectorAll('.module-detail').forEach(section=>observer.observe(section));
}
