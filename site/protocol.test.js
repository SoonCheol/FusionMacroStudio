import test from 'node:test';import assert from 'node:assert/strict';import {SLOTS,trigger,reports,readBinding,validProfile,blank,sameKey,slotOrder,planChanges,completeRead,verifyWrite,restorable,sameBinding,parseBackup,profileChanges} from './protocol.js';
test('63 unique triggers',()=>{let a=[];for(let l=0;l<3;l++)for(let s of SLOTS)a.push(JSON.stringify(trigger(l,s)));assert.equal(new Set(a).size,63)});
test('four standard reports',()=>{let b=trigger(0,1),r=reports(0,1,b);assert.deepEqual([...r[0].slice(0,12)],[254,1,1,1,0,0,0,0,0,1,0,104]);assert.deepEqual(r.map(p=>p.length),[64,64,64,64]);assert.deepEqual([...r[2].slice(0,3)],[253,254,255]);let raw=r[0].slice();raw[0]=250;assert.ok(sameKey(raw,b));assert.equal(readBinding(raw).steps[0].code,104)});
test('invalid profile and slot',()=>{assert.throws(()=>validProfile({}));assert.throws(()=>reports(0,13,trigger(0,1)));assert.equal(validProfile(blank()).layers.length,3)});

test('malformed key profile is rejected',()=>{const p=blank();p.layers[0].bindings[1]={type:'key',steps:[null]};assert.throws(()=>validProfile(p))});

test('default physical numbering follows the right-knob vendor layout',()=>{assert.deepEqual(slotOrder('normal'),Array.from({length:12},(_,i)=>i+1));assert.equal(slotOrder('flip')[0],12);assert.equal(new Set(slotOrder('column')).size,12)});
function deviceRecords(){return Array.from({length:3},(_,l)=>new Map(SLOTS.map(s=>{let a=reports(l,s,trigger(l,s))[0];a[0]=250;return [s,a]})))}
test('write plan only includes actual changes, blocks incomplete reads and duplicates',()=>{let before=deviceRecords();let same={layer:0,slot:1,binding:trigger(0,1)};let diff={layer:1,slot:24,binding:{type:'key',steps:[{mods:0,code:41}],delay:0}};assert.deepEqual(planChanges(before,[same,diff]).map(x=>[x.layer,x.slot]),[[1,24]]);assert.throws(()=>planChanges(before,[same,same]));before[0].delete(1);assert.throws(()=>planChanges(before,[diff]))});

test('reject malformed addresses and fractional layers before writes',()=>{const before=deviceRecords();before[2].get(24)[2]=1;assert.equal(completeRead(before),false);assert.throws(()=>planChanges(before,[{layer:0,slot:1,binding:trigger(0,1)}]));assert.throws(()=>reports(.5,1,trigger(0,1)))});
test('verify full readback detects collateral changes and missing records',()=>{const before=deviceRecords(),after=deviceRecords();const c={layer:0,slot:1,binding:{type:'key',steps:[{mods:0,code:41}],delay:0}};let raw=reports(0,1,c.binding)[0];raw[0]=250;after[0].set(1,raw);let r=verifyWrite(before,after,[c]);assert.equal(r.complete,true);assert.deepEqual(r.failed,[]);assert.deepEqual(r.unexpected,[]);after[2].get(24)[11]=4;r=verifyWrite(before,after,[c]);assert.deepEqual(r.unexpected,[{layer:2,slot:24}]);after[1].delete(2);assert.equal(verifyWrite(before,after,[c]).complete,false);after[0].delete(1);assert.equal(verifyWrite(before,after,[c]).failed.length,1)});

test('documented restore types and wheel read/write normalization',()=>{
 const values=[{type:'key',steps:[{mods:1,code:4},{mods:0,code:5}],delay:0},{type:'key',steps:[{mods:0,code:0}],delay:0},{type:'key',steps:[{mods:2,code:0}],delay:0},{type:'media',usage:0xe9,delay:0},{type:'mouse',action:3,mods:0,buttons:0,dx:0,dy:0,wheel:255,delay:0}];
 for(const b of values){let raw=reports(0,1,b)[0];raw[0]=250;if(b.type==='mouse')raw[9]=4;assert.deepEqual(restorable(raw),b);assert.ok(sameBinding(raw,b))}
 assert.throws(()=>reports(0,1,{type:'raw',raw:[239],delay:0}));assert.throws(()=>reports(0,1,{type:'key',steps:[{mods:0,code:3}],delay:0}));
});
test('backup validates all 63 addresses and excludes unsupported types',()=>{
 const raw=deviceRecords();raw[0].get(1)[3]=8;const file={format:'fusion-macro-studio-device-backup-v1',layers:raw.map(m=>[...m].map(([slot,a])=>({slot,raw:[...a]})))};
 const result=parseBackup(file);assert.equal(result.changes.length,62);assert.deepEqual(result.skipped,[{layer:0,slot:1,type:8}]);file.layers[0][0].raw[1]=13;assert.throws(()=>parseBackup(file));file.layers[0][0].raw[1]=1;file.layers[2][0].raw[10]=256;assert.throws(()=>parseBackup(file));
});
test('profile import restores read single and multiple key records without clearing missing slots',()=>{const p=blank();const raw=reports(0,1,trigger(0,1))[0];raw[0]=250;p.layers[0].bindings[1]=readBinding(raw);p.layers[0].bindings[2]={type:'key',steps:[{mods:0,code:4},{mods:0,code:5}],delay:0};p.layers[0].bindings[3]={type:'raw',_raw:Array(64).fill(0)};const r=profileChanges(p);assert.equal(r.changes.length,2);assert.equal(r.skipped.length,1)});
