// Simulated transport only: never opens a real HID device.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Keypad,VID,PID,SLOTS,packet,trigger,blank,reports,completeRead,parseBackup,sameBinding} from './protocol.js';

class FakeDevice {
 constructor(){
  this.vendorId=VID;this.productId=PID;this.opened=false;
  const report={reportId:3,items:[{reportSize:8,reportCount:64}]};
  this.collections=[{usagePage:0xff00,usage:1,inputReports:[report],outputReports:[report]}];
  this.records=Array.from({length:3},(_,l)=>new Map(SLOTS.map(s=>[s,packet([250,s,l+1,1,0,0,0,0,0,1,0,0])])));
  this.listeners=new Set();this.frames=[];this.commits=0;this.stage=null;this.phase=0;this.beforeCommit=null;
 }
 async open(){this.opened=true} async close(){this.opened=false}
 addEventListener(type,fn){assert.equal(type,'inputreport');this.listeners.add(fn)}
 removeEventListener(type,fn){this.listeners.delete(fn)}
 emit(a){const data=new DataView(a.buffer,a.byteOffset,a.byteLength);for(const fn of this.listeners)fn({reportId:3,data})}
 async sendReport(id,bytes){
  assert.equal(id,3);assert.equal(bytes.length,64);assert.ok(this.opened);
  const a=Uint8Array.from(bytes);this.frames.push(a);
  if(a[0]===0)return;
  if(a[0]===251){assert.deepEqual([...a.slice(0,3)],[251,251,251]);this.emit(packet([251,12,3]));return}
  if(a[0]===250){assert.deepEqual([...a.slice(1,3)],[12,3]);const m=this.records[a[3]-1];assert.ok(m);for(const raw of [...m.values()].reverse())this.emit(raw);return}
  if(a[0]===254){assert.equal(this.phase,0);assert.ok(SLOTS.includes(a[1]));assert.ok(a[2]>=1&&a[2]<=3);assert.ok([1,2,3].includes(a[3]));this.stage=a;this.phase=1;return}
  if(a[0]===170&&a[1]===170){if(this.phase===1)this.phase=2;else{assert.equal(this.phase,3);this.phase=0}return}
  if(a[0]===253){assert.equal(this.phase,2);assert.deepEqual([...a.slice(0,3)],[253,254,255]);this.beforeCommit?.();const raw=this.stage.slice();raw[0]=250;if(raw[3]===3&&raw[9]===3)raw[9]=4;this.records[raw[2]-1].set(raw[1],raw);this.stage=null;this.commits++;this.phase=3;return}
  assert.fail('Unexpected HID opcode '+a[0]);
 }
}
function backupJSON(layers){return {format:'fusion-macro-studio-device-backup-v1',layers:layers.map(m=>[...m].map(([slot,raw])=>({slot,raw:[...raw]})))}}
test('simulated HID connect, all 63 reads, changed-only writes, no-op, cancel and restore',async()=>{
 const dev=new FakeDevice(),oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),oldConfirm=Object.getOwnPropertyDescriptor(globalThis,'confirm');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{hid:{requestDevice:async({filters})=>{assert.deepEqual(filters,[{vendorId:VID,productId:PID}]);return [dev]}}}});
 Object.defineProperty(globalThis,'confirm',{configurable:true,value:()=>true});
 try{
  const keypad=new Keypad(()=>{});await keypad.connect();assert.ok(keypad.verified);
  const original=await keypad.read();assert.ok(completeRead(original));const originalFile=backupJSON(original);
  const changes=[{layer:0,slot:1,binding:trigger(0,1)},{layer:2,slot:24,binding:{type:'mouse',action:3,mods:0,buttons:0,dx:0,dy:0,wheel:255,delay:0}}];
  let backed=false;dev.beforeCommit=()=>assert.ok(backed,'backup must precede every commit');
  const result=await keypad.write(changes,async b=>{assert.deepEqual(backupJSON(b),originalFile);backed=true});
  assert.deepEqual(result,{changed:2,failed:[],unexpected:[],complete:true});assert.equal(dev.commits,2);
  assert.equal((await keypad.write(changes,async()=>assert.fail('no-op backup'))).changed,0);assert.equal(dev.commits,2);
  Object.defineProperty(globalThis,'confirm',{configurable:true,value:()=>false});
  assert.equal(await keypad.write(parseBackup(originalFile).changes,async()=>{}),null);assert.equal(dev.commits,2);
  Object.defineProperty(globalThis,'confirm',{configurable:true,value:()=>true});
  const restore=parseBackup(originalFile);assert.equal(restore.changes.length,63);assert.equal(restore.skipped.length,0);
  const restored=await keypad.write(restore.changes,async b=>assert.ok(completeRead(b)));
  assert.deepEqual(restored,{changed:2,failed:[],unexpected:[],complete:true});assert.equal(dev.commits,4);
  assert.deepEqual(backupJSON(await keypad.read()),originalFile);
  // Disconnect must fail without a write.
  await dev.close();await assert.rejects(keypad.write(changes,async()=>{}),/장치 연결 해제/);assert.equal(dev.commits,4);
 }finally{
  if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;
  if(oldConfirm)Object.defineProperty(globalThis,'confirm',oldConfirm);else delete globalThis.confirm;
 }
});
test('all 63 actual JavaScript triggers load in the Python add-in and match slot identity',()=>{
 const profile=blank(),expected=[];
 for(let l=0;l<3;l++)for(const s of SLOTS){const b=trigger(l,s),id='fixture_'+l+'_'+s;profile.layers[l].bindings[s]=b;profile.layers[l].fusion[s]={id,name:id};expected.push([b.steps[0].mods,b.steps[0].code+20,id,s<=12])}
 const script=`import importlib.util,json,sys
spec=importlib.util.spec_from_file_location("mapping",sys.argv[1])
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
p=json.load(sys.stdin)
print(json.dumps([[mods,vk,cmd,is_key] for (mods,vk),(cmd,is_key) in m.load_mapping(p).items()]))
`;
 const result=spawnSync(process.env.PYTHON||'python3',['-c',script,fileURLToPath(new URL('../addin/FusionMacroStudio/mapping.py',import.meta.url))],{input:JSON.stringify(profile),encoding:'utf8'});
 assert.ifError(result.error);assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),expected);
});
