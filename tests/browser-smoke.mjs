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
   if(bytes[0]===250)for(const slot of slots)emit([250,slot,bytes[3],1,0,0,0,0,0,1,0,bytes[3]===1&&slot===19?104:0]);
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
async function verifyKeyGeometry(stage){
 await settle();
 const g=await page.evaluate(()=>{
  const column=document.querySelector('.key-column').getBoundingClientRect(),keys=document.querySelector('#keys').getBoundingClientRect(),properties=document.querySelector('.properties').getBoundingClientRect();
  const buttons=[...document.querySelectorAll('#keys .key')].map(e=>{const r=e.getBoundingClientRect();return {width:r.width,left:r.left,top:r.top,right:r.right}});
  return {column:column.width,keys:keys.width,propertiesTop:properties.top,keysBottom:keys.bottom,buttons};
 });
 assert.ok(Math.abs(g.keys-g.column)<2,stage+' keys must fill the left column');
 assert.ok(g.propertiesTop>=g.keysBottom,stage+' properties must remain below keys');
 assert.equal(g.buttons.length,12);
 assert.ok(g.buttons.every(b=>b.width>=50),stage+' key widths collapsed');
 assert.ok(g.buttons.every(b=>Math.abs(b.width-g.buttons[0].width)<2),stage+' unequal widths');
 assert.ok(g.buttons.slice(0,4).every(b=>Math.abs(b.top-g.buttons[0].top)<2),stage+' four columns');
 assert.ok(g.buttons[4].top>g.buttons[0].top&&g.buttons[8].top>g.buttons[4].top,stage+' three rows');
}
async function verifySwitchGeometry(stage){
 await settle();
 const errors=await page.evaluate(()=>{
  const bad=[],rect=e=>e.getBoundingClientRect();
  for(const group of document.querySelectorAll('.knob-switches')){
   const buttons=[...group.querySelectorAll('.knob-switch')],a=rect(buttons[0]),b=rect(buttons[1]);
   if(!buttons[0].classList.contains('orbit-switch')||b.top<a.bottom-.5||Math.abs(a.left-b.left)>1)bad.push('orbit row must precede normal/held row');
   const face=group.parentElement.querySelector('.knob-face'),label=rect(face.querySelector('.knob-number')),dial=rect(face.querySelector('.dial'));
   if(label.left>=dial.left||Math.abs(label.top-dial.top)>1||a.top<dial.bottom)bad.push('knob number or orbit row mispositioned');
   const center=r=>r.left+r.width/2,axis=center(rect(group));
   if(Math.abs(center(dial)-axis)>.75)bad.push('dial axis not centered');
   for(const button of buttons){
    const track=rect(button.querySelector('.switch-track'));
    if(Math.abs(center(track)-axis)>.75)bad.push('switch track not centered '+button.getAttribute('aria-label'));
    const r=rect(button),parts=[...button.children].map(rect).filter(p=>p.width&&p.height);
    for(const p of parts)if(p.left<r.left-.5||p.right>r.right+.5||p.top<r.top-.5||p.bottom>r.bottom+.5)bad.push('switch content overflow '+button.getAttribute('aria-label'));
    for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
     const p=parts[i],q=parts[j];
     if(Math.min(p.right,q.right)-Math.max(p.left,q.left)>.5&&Math.min(p.bottom,q.bottom)-Math.max(p.top,q.top)>.5)bad.push('switch labels overlap');
    }
   }
  }
  return bad;
 });
 assert.deepEqual(errors,[],stage+' switch geometry');
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
 assert.equal(await page.evaluate(async()=>{
  const fonts=await document.fonts.load('14px "Pretendard Variable"','키보드 편집기');
  return fonts.length>0&&fonts.every(font=>font.status==='loaded')&&getComputedStyle(document.body).fontFamily.includes('Pretendard Variable');
 }),true,'Bundled Pretendard must load and be the default font');
 assert.equal(await page.locator('#keys .key').count(),12);
 assert.equal(await page.locator('.knob-action').count(),9);
 assert.equal(await page.locator('#keys .key img, #knobs .knob-action img').count(),0);
 assert.ok(await page.locator('#keys .key .name').first().innerText()==='');
 assert.equal(await page.locator('#connect').isEnabled(),true);
 assert.equal(await page.locator('#connectionIndicator').getAttribute('data-state'),'offline');
 assert.equal(await page.locator('.key-column .properties').count(),1);
 assert.equal(await page.locator('.key-column .message-box #pendingCount').count(),1);
 assert.equal(await page.locator('.orbit-switch').count(),3);
 assert.equal(await page.locator('.orbit-switch:disabled').count(),3);
 assert.equal(await page.locator('#desktopCheck').isVisible(),false);
 assert.equal(await page.locator('#orbitSettings').count(),0);
 await verifyKeyGeometry('Disconnected keyboard');
 await verifySwitchGeometry('1920 disconnected');
 assert.equal(await page.locator('#read').innerText(),'기기에서 읽기');
 assert.equal(await page.locator('#write').innerText(),'기기에 쓰기');
 await page.locator('#connect').click();await page.locator('#deviceStatus').filter({hasText:'연결됨 · 읽기 필요'}).waitFor();
 assert.equal(await page.locator('#connectionIndicator').getAttribute('data-state'),'online');
 assert.equal(await page.locator('#connect').isDisabled(),true);
 assert.equal(await page.locator('#read').isEnabled(),true);
 assert.equal(await page.locator('#keys .key img').count(),0);
 await page.locator('#read').click();await page.locator('#deviceStatus').filter({hasText:'63/63'}).waitFor();
 assert.equal(await page.locator('#keys .key img').count(),0);
 await verifyLabels('Korean initial');
 await verifyKeyGeometry('Read keyboard');
 await page.screenshot({path:'browser-preview/editor-ko.png'});
 await page.locator('#resetSearch').click();
 await verifyLabels('Korean all commands');
 await page.locator('#en').click();
 await verifyLabels('English all commands');
 await page.setViewportSize({width:1280,height:900});
 await verifyLabels('English 1280');
 await verifySwitchGeometry('1280');
 await page.setViewportSize({width:900,height:900});
 await verifySwitchGeometry('900');
 await page.setViewportSize({width:1280,height:900});
 await page.locator('#ko').click();await page.locator('#search').fill('구성요소');
 await verifyLabels('Korean search 1280');
 await page.locator('#resetSearch').click();
 await page.locator('[data-command-id="DrawPolyline"]').dragTo(page.locator('#keys .key').first());
 assert.ok((await page.locator('#keys .key').first().innerText()).includes('선'));
 assert.equal(await page.locator('#keys .key-cell').first().locator('.remove-command').isEnabled(),true);
 await verifyLabels('Assigned key');
 await verifyKeyGeometry('Assigned keyboard 1280');
 await page.locator('#layers button').nth(1).click();assert.ok(!(await page.locator('#keys .key').first().innerText()).includes('선'));
 await page.locator('#layers button').first().click();assert.ok((await page.locator('#keys .key').first().innerText()).includes('선'));
 await page.locator('#theme').click();
 await page.locator('#search').fill('DrawPolyline');
 await verifyLabels('Theme and search');
 await page.screenshot({path:'browser-preview/editor-assigned.png'});
 await page.locator('#camera').click();
 for(const [id,i] of [['__fms_orbit_left__',0],['__fms_orbit_right__',2]]){await page.locator('[data-command-id="'+id+'"]').dragTo(page.locator('#knobs .knob').first().locator('.knob-action').nth(i));}
 assert.equal(await page.locator('.orbit-switch').first().isEnabled(),true);
 assert.equal(await page.locator('.orbit-switch').nth(1).isDisabled(),true);
 await page.locator('.orbit-switch').first().click();
 assert.equal(await page.locator('.orbit-switch').first().getAttribute('aria-checked'),'true');
 await verifySwitchGeometry('free orbit');
 await page.locator('.knob-switch:not(.orbit-switch)').first().click();
 assert.equal(await page.locator('.orbit-switch').first().isDisabled(),true);
 assert.equal(await page.locator('.knob-switch:not(.orbit-switch)').first().getAttribute('aria-checked'),'true');
 await verifySwitchGeometry('held');
 assert.equal(await page.locator('.knob-switch:not(.orbit-switch)').nth(1).getAttribute('aria-checked'),'false');
 await page.locator('[data-command-id="__fms_orbit_up__"]').dragTo(page.locator('#knobs .knob').first().locator('.knob-action').first());
 await page.locator('[data-command-id="__fms_pan_down__"]').dragTo(page.locator('#knobs .knob').first().locator('.knob-action').last());
 assert.ok((await page.locator('#knobs .knob').first().innerText()).includes('위 오비트'));
 assert.ok((await page.locator('#knobs .knob').first().innerText()).includes('아래쪽 팬'));
 await page.locator('.knob-switch:not(.orbit-switch)').first().click();
 assert.ok((await page.locator('#knobs .knob').first().innerText()).includes('왼쪽 오비트'));
 assert.ok((await page.locator('#knobs .knob').first().innerText()).includes('오른쪽 오비트'));
 await page.locator('.knob-switch:not(.orbit-switch)').first().click();
 assert.ok((await page.locator('#knobs .knob').first().innerText()).includes('아래쪽 팬'));
 await page.locator('.knob-switch:not(.orbit-switch)').first().click();
 await page.locator('.knob-switch:not(.orbit-switch)').nth(1).click();
 await page.locator('#search').fill('DrawPolyline');
 page.once('dialog',d=>d.accept());
 await page.locator('[data-command-id="DrawPolyline"]').dragTo(page.locator('#knobs .knob').nth(1).locator('.knob-action').first());
 assert.ok((await page.locator('#knobs .knob').nth(1).innerText()).includes('선'));
 await page.locator('.knob-switch:not(.orbit-switch)').nth(1).click();
 assert.ok((await page.locator('#knobs .knob').nth(1).locator('.knob-action').first().innerText()).includes('미설정'));
 page.once('dialog',d=>d.accept());
 await page.locator('#clearLayer').click();
 assert.equal(await page.locator('#keys .key img').count(),0);
 assert.ok((await page.locator('#pendingCount').innerText()).includes('21개'));
 page.once('dialog',d=>d.accept());
 await page.locator('#clearAll').click();
 assert.ok((await page.locator('#pendingCount').innerText()).includes('63개'));
 await page.evaluate(()=>window.fakeDisconnect());
 assert.equal(await page.locator('#connectionIndicator').getAttribute('data-state'),'offline');
 assert.equal(await page.locator('#connect').isEnabled(),true);
 assert.equal(await page.locator('#read').isDisabled(),true);
 assert.equal(await page.locator('#keys .key img, #knobs .knob-action img').count(),0);
 assert.equal(await page.locator('#keys .key .name').first().innerText(),'');
 await page.goto(url+'icons.html');await page.locator('#gallery .command-card').first().waitFor();
 await verifyLabels('Icon gallery');
 await page.screenshot({path:'browser-preview/gallery.png'});
 assert.deepEqual(errors,[],'Uncaught browser errors');
}finally{await browser.close()}
