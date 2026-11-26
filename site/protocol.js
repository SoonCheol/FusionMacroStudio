// Target-specific subset adapted from Macropad Rebind, MIT; see licenses.
// No firmware, reset, identity rewrite or LED commands.
import {directIndex,directBinding} from './direct-codes.js';
export const SLOTS=[1,2,3,4,5,6,7,8,9,10,11,12,16,17,18,19,20,21,22,23,24];
export const VID=0x514c, PID=0x8842;
export const packet=bytes=>{if(bytes.length>64)throw Error("HID packet overflow");const out=new Uint8Array(64);out.set(bytes);return out};
export function trigger(layer,slot){const i=layer*21+SLOTS.indexOf(slot);if(!Number.isInteger(layer)||layer<0||layer>2||!SLOTS.includes(slot))throw Error("slot");return {type:"key",steps:[{mods:[0,3,5,6,7,2][Math.floor(i/12)],code:104+i%12}],delay:0}}
export function sameKey(raw,b){return !!raw&&b?.type==='key'&&b.steps?.length===1&&raw[3]===1&&raw[9]===1&&raw[10]===b.steps[0].mods&&raw[11]===b.steps[0].code}
export function slotOrder(orientation){const order=Array.from({length:12},(_,i)=>i+1);if(orientation==='flip')return order.reverse();if(orientation==='column')return [3,6,9,12,2,5,8,11,1,4,7,10];return order}
export function pendingKey(layer,slot){return layer+':'+slot}
export function completeRead(layers){return Array.isArray(layers)&&layers.length===3&&layers.every((m,l)=>m instanceof Map&&m.size===SLOTS.length&&SLOTS.every(s=>{const a=m.get(s);return a instanceof Uint8Array&&a.length===64&&a[0]===250&&a[1]===s&&a[2]===l+1}))}
export function planChanges(before,changes){if(!completeRead(before))throw Error('전체 슬롯 읽기 실패 — 쓰기 중단');const seen=new Set(),actual=[];for(const c of changes){const key=pendingKey(c.layer,c.slot);if(seen.has(key))throw Error('중복 슬롯');seen.add(key);const packets=reports(c.layer,c.slot,c.binding);const raw=before[c.layer].get(c.slot);if(!raw||raw[0]!==250||raw[1]!==c.slot||raw[2]!==c.layer+1)throw Error('읽기 응답 불일치 — 쓰기 중단');if(!sameBinding(raw,c.binding))actual.push({...c,packets})}return actual}

const byte=v=>Number.isInteger(v)&&v>=0&&v<=255;
export function reports(layer,slot,b){
 if(!SLOTS.includes(slot)||!Number.isInteger(layer)||layer<0||layer>2||!b||b.delay!==0)throw Error("지원하지 않는 설정");
 const head=[254,slot,layer+1];let record;
 if(b.type==='key'){
   if(!Array.isArray(b.steps)||b.steps.length<1||b.steps.length>18||b.steps.some(s=>!s||!byte(s.mods)||!byte(s.code)||s.code>231||(s.code>0&&s.code<4)))throw Error("잘못된 키 레코드");
   if(b.steps.some(s=>s.code===0)&&b.steps.length!==1)throw Error("복합 키의 빈 입력/수식키 단독은 복원 불가");
   const count=b.steps.length===1&&b.steps[0].code===0&&b.steps[0].mods!==0?0:b.steps.length;
   record=[...head,1,0,0,0,0,0,count,...b.steps.flatMap(s=>[s.mods,s.code])];
 }else if(b.type==='media'){
   if(!Number.isInteger(b.usage)||b.usage<1||b.usage>65535)throw Error("잘못된 미디어 설정");
   record=[...head,2,0,0,0,0,0,0,b.usage&255,b.usage>>8];
 }else if(b.type==='mouse'){
   if(![1,3,5].includes(b.action)||![b.mods,b.buttons,b.dx,b.dy,b.wheel].every(byte)||b.buttons>31)throw Error("잘못된 마우스 설정");
   record=[...head,3,0,0,0,0,0,b.action,b.mods,b.buttons,b.dx,b.dy,b.wheel];
 }else throw Error("복원할 수 없는 레코드 유형");
 return [record,[170,170],[253,254,255],[170,170]].map(packet)
}
// Decode only the documented ch57x-1 binding payloads. Never replay arbitrary raw bytes.
export function restorable(raw){
 if(!(raw instanceof Uint8Array)||raw.length!==64||raw[0]!==250||!SLOTS.includes(raw[1])||raw[2]<1||raw[2]>3||raw.slice(4,9).some(Boolean))return null;
 let b;
 if(raw[3]===1){
   const n=raw[9];if(n>18||(!n&&(!raw[10]||raw[11])))return null;
   b={type:'key',steps:Array.from({length:n||1},(_,i)=>({mods:raw[10+2*i],code:raw[11+2*i]})),delay:0};
 }else if(raw[3]===2&&raw[9]===0)b={type:'media',usage:raw[10]+256*raw[11],delay:0};
 else if(raw[3]===3)b={type:'mouse',action:raw[9]===4?3:raw[9],mods:raw[10],buttons:raw[11],dx:raw[12],dy:raw[13],wheel:raw[14],delay:0};
 else return null;
 try{reports(raw[2]-1,raw[1],b);return b}catch{return null}
}
export function sameBinding(raw,b){
 const actual=restorable(raw);if(!actual||!b)return false;
 try{const a=reports(raw[2]-1,raw[1],actual)[0],wanted=reports(raw[2]-1,raw[1],b)[0];return a.every((v,i)=>v===wanted[i])}catch{return false}
}
export function parseBackup(value){
 if(value?.format!=='fusion-macro-studio-device-backup-v1'||!Array.isArray(value.layers)||value.layers.length!==3)throw Error('지원되는 장치 백업 파일이 아닙니다');
 const layers=value.layers.map((items,l)=>{
   if(!Array.isArray(items)||items.length!==21)throw Error('백업 슬롯 수 불일치');
   const m=new Map();
   for(const e of items){if(!e||!SLOTS.includes(e.slot)||m.has(e.slot)||!Array.isArray(e.raw)||e.raw.length!==64||!e.raw.every(byte))throw Error('백업 레코드 오류');
     m.set(e.slot,Uint8Array.from(e.raw))}
   return m
 });
 if(!completeRead(layers))throw Error('백업의 슬롯/레이어 주소 불일치');
 const changes=[],skipped=[];
 for(let layer=0;layer<3;layer++)for(const slot of SLOTS){const raw=layers[layer].get(slot),binding=restorable(raw);if(binding)changes.push({layer,slot,binding});else skipped.push({layer,slot,type:raw[3]})}
 return {changes,skipped};
}
export function profileChanges(profile,codes=[]){
 const changes=[],skipped=[];
 for(let layer=0;layer<3;layer++){const l=profile.layers[layer];for(const slot of SLOTS){
   const f=l.fusion[slot],b=l.bindings[slot];if(!f&&!b)continue;
   const index=directIndex(b,codes);
   if(index!==null&&(!codes[index]||(f&&f.id!==codes[index]))){skipped.push({layer,slot});continue}
   let binding=index!==null?{type:'key',steps:b.steps.map(s=>({...s})),delay:0}:f?trigger(layer,slot):b;
   if(!f&&Array.isArray(b._raw)) {
     // Raw read records carry authoritative type/count; reject mismatched addresses.
     const raw=b._raw;
     binding=raw.length===64&&raw.every(byte)&&raw[1]===slot&&raw[2]===layer+1?restorable(Uint8Array.from(raw)):null;
   }
   try{reports(layer,slot,binding);changes.push({layer,slot,binding})}catch{skipped.push({layer,slot})}
 }}
 return {changes,skipped};
}
export function reportBytes(r){return Math.ceil((r.items||[]).reduce((n,i)=>n+i.reportSize*i.reportCount,0)/8)}
export function supported(d){return d.vendorId===VID&&d.productId===PID&&d.collections?.some(c=>c.usagePage===0xff00&&c.usage===1&&c.outputReports?.some(r=>r.reportId===3&&reportBytes(r)===64)&&c.inputReports?.some(r=>r.reportId===3&&reportBytes(r)===64))}
export function blank(){return {format:"fusion-macro-studio-v1",knobBase:16,layers:Array.from({length:3},()=>({bindings:{},fusion:{}})),longPress:{key:"Escape",ms:700}}}
export function readBinding(raw){const a=Array.from(raw);if(a[3]===0)return null;if(a[3]===1){const steps=[];for(let i=0;i<Math.min(a[9]||1,18);i++){let mods=a[10+i*2],code=a[11+i*2];if(mods||code)steps.push({mods,code})}if(steps.length)return {type:"key",steps,delay:0,_raw:a};if(a[9]===1&&a[10]===0&&a[11]===0)return {type:'key',steps:[{mods:0,code:0}],delay:0,_raw:a}}return {type:"raw",raw:a,_raw:a}}
export function validProfile(p){if(!p||p.knobBase!==16||!Array.isArray(p.layers)||p.layers.length!==3)throw Error("12키·3노브 프로필이 아닙니다");const out=blank();for(let i=0;i<3;i++){let l=p.layers[i];if(!l||!l.bindings||typeof l.bindings!=="object")throw Error("잘못된 레이어");for(const [k,b] of Object.entries(l.bindings)){if(!SLOTS.includes(Number(k))||!b||typeof b!=="object")continue;if(b.type==="key"&&(!Array.isArray(b.steps)||b.steps.length>18||!b.steps.length||b.steps.some(s=>!s||!Number.isInteger(s.mods)||s.mods<0||s.mods>255||!Number.isInteger(s.code)||s.code<0||s.code>255)))throw Error("잘못된 키 레코드");out.layers[i].bindings[k]=b}for(const [k,v] of Object.entries(l.fusion||{})){if(SLOTS.includes(Number(k))&&typeof v?.id==="string"&&v.id.length<=256&&typeof v.name==="string")out.layers[i].fusion[k]={id:v.id,name:v.name.slice(0,160)}}}return out}
// Compare all untouched raw records, not just the slots being written.
export function verifyWrite(before,after,actual){
 const failed=actual.filter(c=>!sameBinding(after?.[c.layer]?.get(c.slot),c.binding));
 const intended=new Set(actual.map(c=>pendingKey(c.layer,c.slot))),unexpected=[];
 for(let l=0;l<3;l++)for(const s of SLOTS){
   if(intended.has(pendingKey(l,s)))continue;
   const a=before[l].get(s),b=after?.[l]?.get(s);
   if(!b||a.length!==b.length||a.some((v,i)=>v!==b[i]))unexpected.push({layer:l,slot:s});
 }
 return {changed:actual.length,failed,unexpected,complete:completeRead(after)};
}
export class Keypad{
 constructor(log){this.log=log;this.dev=null;this.busy=false;this.verified=false;this.sink=null;this.input=e=>{if(e.reportId!==3)return;const a=new Uint8Array(e.data.buffer,e.data.byteOffset,e.data.byteLength).slice();this.sink?.(a)}}
 async send(a){if(!this.dev?.opened)throw Error("장치 연결 해제");await this.dev.sendReport(3,a);await new Promise(r=>setTimeout(r,8))}
 async collect(bytes,accept,count,ms){let found=new Map();this.sink=a=>{const key=accept(a);if(key!==null)found.set(key,a)};try{await this.send(packet(bytes));let until=Date.now()+ms;while(found.size<count&&Date.now()<until)await new Promise(r=>setTimeout(r,20));return found}finally{this.sink=null}}
 async connect(){if(!navigator.hid)throw Error("Chrome 또는 Edge의 HTTPS 페이지에서 실행하세요");if(this.dev){this.dev.removeEventListener('inputreport',this.input);if(this.dev.opened)await this.dev.close();}this.verified=false;this.dev=null;const list=await navigator.hid.requestDevice({filters:[{vendorId:VID,productId:PID}]});const dev=list.find(supported);if(!dev)throw Error("514C:8842 공급업체 HID 인터페이스를 찾지 못했습니다");await dev.open();this.dev=dev;dev.addEventListener("inputreport",this.input);try{await this.send(packet([]));const id=await this.collect([251,251,251],a=>a.length===64&&a[0]===251?0:null,1,1000);let v=id.get(0);if(!v||v[1]!==12||v[2]!==3)throw Error("12키·3노브 장치 확인 실패");this.verified=true;this.log("514C:8842 · 12키 3노브 확인")}catch(e){await dev.close();this.dev=null;throw e}}
 async read(){if(!this.verified)throw Error("장치 식별 필요");let layers=[];for(let i=0;i<3;i++){const m=await this.collect([250,12,3,i+1],a=>a.length===64&&a[0]===250&&a[2]===i+1&&SLOTS.includes(a[1])?a[1]:null,21,2500);this.log("레이어 "+(i+1)+": "+m.size+"/21 응답");layers.push(m)}return layers}
 async write(changes,backup){if(!this.verified)throw Error("장치 식별 필요");const before=await this.read();const actual=planChanges(before,changes);if(!actual.length)return {changed:0,failed:[],unexpected:[],complete:true};await backup(before);if(!confirm(actual.length+"개 슬롯만 키보드에 쓸까요?"))return null;for(const c of actual){for(const p of c.packets)await this.send(p)}const after=await this.read();return verifyWrite(before,after,actual)}
}