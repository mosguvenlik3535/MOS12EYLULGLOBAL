/** Usage: SITE_TEST_DEPS=/path/to/npm/project SITE_TEST_URL=http://localhost:8080/ node web/scripts/browser-check.mjs
 * Dependencies: playwright. Optional SITE_SERVERLESS_CHROMIUM=1 uses @sparticuz/chromium.
 * Start the site's static HTTP server separately. All tests use isolated browser storage.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(process.env.SITE_TEST_DEPS?resolve(process.env.SITE_TEST_DEPS,'package.json'):import.meta.url);
const {chromium}=require('playwright');
let launch={headless:true};
if(process.env.SITE_SERVERLESS_CHROMIUM==='1'){
 const {default:binary}=await import(require.resolve('@sparticuz/chromium'));
 launch={...launch,executablePath:await binary.executablePath(),args:binary.args};
}
const browser=await chromium.launch(launch);
const page=await browser.newPage();
const base=process.env.SITE_TEST_URL||'http://localhost:8080/';
const errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>requests.push(r.url()));
const langs=['tr','en','de','fr','es','it','pt','nl','pl','ro','el','ru','ar','zh'];
async function visit(file,lang){
 await page.goto(new URL(`${file}?lang=${lang}`,base).href);
 await page.waitForFunction(l=>document.documentElement.lang===l&&!document.querySelector('#site-language').disabled,lang);
 await page.evaluate(()=>document.fonts.ready);
}
let cases=0;
try{
 for(const file of ['index.html','ozellikler.html'])for(const lang of langs){
  await visit(file,lang);
  for(const width of [320,375,768,1024,1440]){
   await page.setViewportSize({width,height:900});
   const layout=await page.evaluate(()=>{
    const selectors='.hero-copy h1,.hero-copy>p,.hero-buttons>a,.features-heading h1,.features-hero-copy>p,.nav-row .brand,.nav-row select,.nav-row .menu-toggle,.campaign-announcement,.campaign-heading,.previous-price,.pro-price,.pro-card .purchase-link';
    const clipped=[...document.querySelectorAll(selectors)].filter(e=>{
     const box=e.getBoundingClientRect();if(!box.width||!box.height)return false;
     const range=document.createRange();range.selectNodeContents(e);
     return [...range.getClientRects()].some(r=>r.width>1&&(r.left< -1||r.right>innerWidth+1));
    }).map(e=>e.tagName+'.'+e.className);
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,clipped};
   });
   assert.deepEqual(layout,{overflow:false,clipped:[]},`${file} ${lang} ${width}: text clipped even if overflow is hidden`);cases++;
  }
 }
 for(const lang of langs){
  await page.setViewportSize({width:375,height:850});await visit('index.html',lang);
  assert.equal((await page.locator('.previous-price del').innerText()).trim(),'4.999 TL');
  assert.equal((await page.locator('.pro-price [data-no-translate]').innerText()).trim(),'1.499 TL');
  assert.ok((await page.locator('.discount-badge').innerText()).includes('70'));
  assert.ok((await page.locator('.previous-price del').evaluate(e=>getComputedStyle(e).textDecorationLine)).includes('line-through'));
  assert.ok(decodeURIComponent(await page.locator('.purchase-link').getAttribute('href')).includes('1.499 TL + KDV'));
  const menu=page.locator('.menu-toggle');
  await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');
  await page.locator('#navigation a').first().focus();await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.equal(await menu.evaluate(e=>e===document.activeElement),true);
  await menu.click();const navBox=await page.locator('#navigation').boundingBox();await page.mouse.click(8,navBox.y+navBox.height+20);assert.equal(await menu.getAttribute('aria-expanded'),'false');
  await menu.click();await page.locator('.hero-buttons a').first().focus();assert.equal(await menu.getAttribute('aria-expanded'),'false');
  const tabs=page.locator('[data-screen]');await tabs.first().focus();await page.keyboard.press('ArrowRight');
  assert.equal(await tabs.nth(lang==='ar'?2:1).getAttribute('aria-selected'),'true');
  await page.keyboard.press('Home');assert.equal(await tabs.first().getAttribute('aria-selected'),'true');
  const faq=page.locator('.faq-list details').nth(1);await faq.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await faq.evaluate(e=>e.open),true);
  // Use an actual navigation link to verify language survives page changes, not just direct URLs.
  await menu.click();await page.locator('#navigation a').first().click();await page.waitForURL(/ozellikler\.html/);
  await page.waitForFunction(l=>document.documentElement.lang===l&&!document.querySelector('#site-language').disabled,lang);
  assert.equal(new URL(page.url()).searchParams.get('lang'),lang);
  const first=page.locator('.screenshot-open').first();await first.click();
  assert.equal(await page.locator('#screen-viewer').evaluate(e=>e.open),true);
  const before=await page.locator('#screen-viewer-image').getAttribute('src');
  await page.keyboard.press('ArrowRight');assert.notEqual(await page.locator('#screen-viewer-image').getAttribute('src'),before);
  assert.ok((await page.locator('#screen-viewer-details').innerText()).length>100);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#screen-viewer').evaluate(e=>e.open),false);
  assert.equal(await first.evaluate(e=>e===document.activeElement),true);
 }
 await visit('ozellikler.html','tr');
 const screenshots=page.locator('.screenshot-open');assert.equal(await screenshots.count(),11);
 for(let i=0;i<11;i++){
  await screenshots.nth(i).click();await page.waitForFunction(()=>{const i=document.querySelector('#screen-viewer-image');return i.complete&&i.naturalWidth>0;});
  const expected=await screenshots.nth(i).evaluate(e=>e.closest('.module-detail').querySelector('h2').textContent);
  assert.equal(await page.locator('#screen-viewer-title').textContent(),expected);
  assert.ok(await page.locator('#screen-viewer-details .feature-explanation').count()>0);
  await page.locator('.screen-viewer-close').click();
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
 assert.deepEqual(errors,[],'browser JavaScript errors');
 assert.ok(requests.every(url=>!url.includes('fonts.googleapis.com')&&!url.includes('fonts.gstatic.com')),'external font request');
 console.log(`PASS: ${cases} layouts (2 pages × 14 languages × 5 widths); 14-language menu/focus/RTL tabs/FAQ/navigation/gallery; 11 full-size screenshots; reduced motion; no JS errors or Google font requests`);
}finally{await browser.close();}
