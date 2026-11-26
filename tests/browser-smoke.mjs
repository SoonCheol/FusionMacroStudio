import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.FMS_PLAYWRIGHT);
const browser=await chromium.launch({headless:true});
await mkdir('browser-preview',{recursive:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},locale:'ko-KR'});
await page.addInitScript(()=>{
 const slots=[...Array.from({length:12},(_,i)=>i+1),...Array.from({length:9},(_,i)=>i+16)];
 const r={reportId:3,items:[{reportSize:8,reportCount:64}]};
 const listeners=new Set(),disconnect=new Set();
 const device={vendorId:0x514c,productId:0x8842,opened:false,collections:[{usagePage:0xff00,usage:1,inputReports:[r],outputReports:[r]}],
  async open(){this.opened=true},async close(){this.opened=false},
  addEventListener(t,fn){listeners.add(fn)},removeEventListener(t,fn){listeners.delete(fn)},
  async sendReport(id,bytes){
   const emit=values=>{const a=new Uint8Array(64);a.set(values);for(const fn of listeners)fn({reportId:3,data:new DataView(a.buffer)})};
   if(bytes[0]===251)emit([251,12,3]);
   if(bytes[0]===250)for(const slot of slots)emit([250,slot,bytes[3],1,0,0,0,0,0,1,0,0]);
  }};
 Object.defineProperty(navigator,'hid',{configurable:true,value:{requestDevice:async()=>[device],addEventListener(t,fn){disconnect.add(fn)}}});
 window.fakeDisconnect=()=>{for(const fn of disconnect)fn({device})};
 const profile={format:'fusion-macro-studio-v1',knobBase:16,layers:Array.from({length:3},()=>({fusion:{},bindings:{}}))};
 profile.layers[0].fusion[1]={id:'DrawPolyline',name:'선'};
 profile.layers[0].bindings[1]={type:'key',steps:[{mods:0,code:104}],delay:0};
 localStorage.setItem('fusion-macro-studio.v1',JSON.stringify(profile));
});
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
 assert.equal(await page.locator('#keys .key img, #knobs .knob-action img').count(),0);
 assert.ok(await page.locator('#keys .key .name').first().innerText()==='');
 assert.equal(await page.locator('#connect').isEnabled(),true);
 await page.locator('#connect').click();await page.locator('#deviceStatus').filter({hasText:'연결됨 · 읽기 필요'}).waitFor();
 assert.equal(await page.locator('#connect').isDisabled(),true);
 assert.equal(await page.locator('#read').isEnabled(),true);
 assert.equal(await page.locator('#keys .key img').count(),0);
 await page.locator('#read').click();await page.locator('#deviceStatus').filter({hasText:'63/63'}).waitFor();
 assert.equal(await page.locator('#keys .key img').count(),0);
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
 page.once('dialog',d=>d.accept());
 await page.locator('[data-command-id="DrawPolyline"]').dragTo(page.locator('#keys .key').first());
 assert.ok((await page.locator('#keys .key').first().innerText()).includes('선'));
 await verifyLabels('Assigned key');
 await page.locator('#layers button').nth(1).click();assert.ok(!(await page.locator('#keys .key').first().innerText()).includes('선'));
 await page.locator('#layers button').first().click();assert.ok((await page.locator('#keys .key').first().innerText()).includes('선'));
 await page.locator('#theme').click();
 await page.locator('#search').fill('DrawPolyline');
 await verifyLabels('Theme and search');
 await page.screenshot({path:'browser-preview/editor-assigned.png'});
 await page.locator('#camera').click();
 for(const [id,i] of [['__fms_orbit_left__',0],['__fms_orbit_right__',2]]){page.once('dialog',d=>d.accept());await page.locator('[data-command-id="'+id+'"]').dragTo(page.locator('#knobs .knob').first().locator('.knob-action').nth(i));}
 await page.locator('.knob-switch').first().click();
 assert.equal(await page.locator('.knob-switch').first().getAttribute('aria-checked'),'true');
 assert.equal(await page.locator('.knob-switch').nth(1).getAttribute('aria-checked'),'false');
 page.once('dialog',d=>d.accept());
 await page.locator('.knob-hold-mode').selectOption('__fms_hold_vertical__');
 assert.ok((await page.locator('#knobs .knob').first().innerText()).includes('위 오비트'));
 assert.ok((await page.locator('#knobs .knob').first().innerText()).includes('아래 오비트'));
 await page.locator('.knob-switch').first().click();
 assert.ok((await page.locator('#knobs .knob').first().innerText()).includes('왼쪽 오비트'));
 page.once('dialog',d=>d.accept());
 await page.locator('#clearLayer').click();
 assert.equal(await page.locator('#keys .key img').count(),0);
 assert.ok((await page.locator('#pendingCount').innerText()).includes('21개'));
 page.once('dialog',d=>d.accept());
 await page.locator('#clearAll').click();
 assert.ok((await page.locator('#pendingCount').innerText()).includes('63개'));
 await page.evaluate(()=>window.fakeDisconnect());
 assert.equal(await page.locator('#connect').isEnabled(),true);
 assert.equal(await page.locator('#read').isDisabled(),true);
 assert.equal(await page.locator('#keys .key img, #knobs .knob-action img').count(),0);
 assert.equal(await page.locator('#keys .key .name').first().innerText(),'');
 await page.goto(url+'icons.html');await page.locator('#gallery .command-card').first().waitFor();
 await verifyLabels('Icon gallery');
 await page.screenshot({path:'browser-preview/gallery.png'});
 assert.deepEqual(errors,[],'Uncaught browser errors');
}finally{await browser.close()}
