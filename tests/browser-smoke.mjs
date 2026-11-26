import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.FMS_PLAYWRIGHT);
const browser=await chromium.launch({headless:true});
await mkdir('browser-preview',{recursive:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},locale:'ko-KR'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const url='http://127.0.0.1:8765/';
async function settle(){
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))))});
}
async function verifyLabels(stage){
 await settle();
 const result=await page.evaluate(()=>{
  const bad=[];let total=0;
  for(const el of document.querySelectorAll('.word-label')){
   const box=el.getBoundingClientRect();if(!box.width||!box.height)continue;
   total++;const expected=el.title.trim().split(/\s+/u).filter(Boolean);
   const children=[...el.children];
   if(JSON.stringify(children.map(w=>w.textContent))!==JSON.stringify(expected))bad.push({type:'token',label:el.title});
   for(const w of children){const r=w.getBoundingClientRect();if(getComputedStyle(w).whiteSpace!=='nowrap'||r.left<box.left-1.5||r.right>box.right+1.5||r.bottom>box.bottom+1.5)bad.push({type:'overflow',label:el.title,word:w.textContent,width:box.width,wordWidth:r.width});}
  }
  const list=document.querySelector('.command-cards'),s=getComputedStyle(list);
  return {bad,total,innerScroll:s.overflowY==='auto'||s.overflowY==='scroll'};
 });
 assert.ok(result.total>10,stage+' missing labels');
 assert.equal(result.innerScroll,false,stage+' internal command scrolling');
 assert.deepEqual(result.bad,[],stage+' clipped or split words');
 console.log(stage+': '+result.total+' labels verified');
}
try{
 await page.goto(url);await page.locator('#commands .command-card').first().waitFor();
 assert.equal(await page.locator('#keys .key').count(),12);
 assert.equal(await page.locator('.knob-action').count(),9);
 await verifyLabels('Korean initial');
 await page.screenshot({path:'browser-preview/editor-ko.png'});
 await page.locator('#resetSearch').click();
 await verifyLabels('Korean all commands');
 await page.locator('#en').click();
 await verifyLabels('English all commands');
 await page.setViewportSize({width:1280,height:900});
 await verifyLabels('English 1280');
 await page.locator('#ko').click();await page.locator('#search').fill('구성요소');
 await verifyLabels('Korean search 1280');
 await page.locator('#resetSearch').click();
 await page.locator('[data-command-id="DrawPolyline"]').dragTo(page.locator('#keys .key').first());
 assert.ok((await page.locator('#keys .key').first().innerText()).includes('선'));
 await verifyLabels('Assigned key');
 await page.locator('#layers button').nth(1).click();assert.ok(!(await page.locator('#keys .key').first().innerText()).includes('선'));
 await page.locator('#layers button').first().click();assert.ok((await page.locator('#keys .key').first().innerText()).includes('선'));
 await page.locator('#theme').click();
 await page.locator('#search').fill('DrawPolyline');
 await verifyLabels('Theme and search');
 await page.screenshot({path:'browser-preview/editor-assigned.png'});
 await page.goto(url+'icons.html');await page.locator('#gallery .command-card').first().waitFor();
 await verifyLabels('Icon gallery');
 await page.screenshot({path:'browser-preview/gallery.png'});
 assert.deepEqual(errors,[],'Uncaught browser errors');
}finally{await browser.close()}
