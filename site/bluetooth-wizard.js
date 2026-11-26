import {SLOTS,completeRead,sameBinding,restorable,reports,supported} from './protocol.js';
import {inputSignature,probeBinding} from './input-comparison.js';
const KEY='fusion-macro-studio.bt-wizard-recovery-v1';
export const empty={type:'key',delay:0,steps:[{mods:0,code:0}]};
export const combined={type:'key',delay:0,steps:[...probeBinding(1234,'extended-plain').steps,...probeBinding(1234,'function-digits').steps]};
export const fullAlphabet={type:'key',delay:0,steps:[58,59,60,61,62,63,39,30,31,32,33,34,35,36,37,38].map(code=>({mods:7,code}))};
const bindingFor=kind=>kind==='alphabet'?fullAlphabet:combined;
const modifier=e=>/^(Control|Shift|Alt|Meta)(Left|Right)$/.test(e.code);
const keyCode=code=>code>=104?'F'+(code-91):code>=58?'F'+(code-57):'Digit'+(code===39?0:code-29);
export function summarizeCapture(events,kind='combined'){
 const non=events.filter(e=>!modifier(e));
 function group(steps){
  const expected=steps.map(s=>({code:keyCode(s.code),mods:s.mods}));
  const keys=new Set(expected.map(x=>x.code)),actual=non.filter(e=>keys.has(e.code));
  const matched=expected.filter(({code,mods})=>actual.some(e=>e.edge==='down'&&e.code===code&&e.mods===mods&&!e.repeat)&&actual.some(e=>e.edge==='up'&&e.code===code)).length;
  const ok=actual.length===expected.length*2&&expected.every(({code,mods},i)=>actual[2*i].code===code&&actual[2*i].edge==='down'&&actual[2*i].mods===mods&&!actual[2*i].repeat&&actual[2*i+1].code===code&&actual[2*i+1].edge==='up');
  return {matched,total:expected.length,ok};
 }
 return kind==='alphabet'?{functions:group(fullAlphabet.steps.slice(0,6)),digits:group(fullAlphabet.steps.slice(6)),events:non.length}:{extended:group(combined.steps.slice(0,12)),alternate:group(combined.steps.slice(12)),events:non.length};
}
export function snapshot(raw){if(!completeRead(raw))throw Error('전체 키 읽기 실패');return raw.map(m=>SLOTS.map(slot=>Array.from(m.get(slot))))}
export function chooseTarget(raw,preferred,profile){
 if(!completeRead(raw))throw Error('전체 키 읽기 실패');
 for(const layer of [preferred,...[0,1,2].filter(i=>i!==preferred)])for(let slot=1;slot<=12;slot++){
  if(profile?.layers?.[layer]?.fusion?.[slot])continue;
  const r=raw[layer].get(slot);
  if(sameBinding(r,empty))return {layer,slot};
 }
 throw Error('복원 가능한 빈 키가 없습니다. 빈 키 하나를 만들고 기기에 쓴 뒤 다시 시작하세요.');
}
export function validateJournal(j){
 if(!j||![undefined,'combined','alphabet'].includes(j.kind)||!Number.isInteger(j.layer)||j.layer<0||j.layer>2||!Number.isInteger(j.slot)||j.slot<1||j.slot>12||!Array.isArray(j.before)||j.before.length!==3)throw Error('시험 복원 기록 오류');
 const raw=j.before.map((a,l)=>{
  if(!Array.isArray(a)||a.length!==21)throw Error('시험 복원 기록 오류');
  return new Map(a.map((r,i)=>{if(!Array.isArray(r)||r.length!==64||r.some(x=>!Number.isInteger(x)||x<0||x>255))throw Error('시험 복원 기록 오류');return [SLOTS[i],Uint8Array.from(r)]}));
 });
 if(!completeRead(raw)||!sameBinding(raw[j.layer].get(j.slot),empty))throw Error('시험 원본 기록 오류');
 return j;
}
export function verifyTarget(raw,j){
 validateJournal(j);const now=snapshot(raw);
 for(let l=0;l<3;l++)for(let i=0;i<21;i++)if(l!==j.layer||SLOTS[i]!==j.slot){
  if(now[l][i].some((v,k)=>v!==j.before[l][i][k]))throw Error('다른 키 설정이 달라졌습니다. 원래 키보드를 연결하세요. 자동 복원 중단.');
 }
 const r=raw[j.layer].get(j.slot);
 if(sameBinding(r,empty))return 'empty';
 if(sameBinding(r,bindingFor(j.kind)))return 'test';
 throw Error('시험 키의 내용이 달라졌습니다. 자동 덮어쓰기 중단.');
}
export function setupBluetoothWizard({device,ready,layer,profile,onChange,log,kind='combined'}){
 const $=id=>document.getElementById(id),dialog=$('bluetoothWizard'),message=$('wizardMessage'),next=$('wizardNext'),close=$('wizardClose'),cancel=$('wizardCancel'),area=$('wizardCapture'),result=$('wizardResult');
 let journal=null,stage='idle',working=false,events=[],usb=[],bt=[],timer=null,idle=null,reading=false,usbRemoved=false;
 const say=s=>message.textContent=s;
 const target=()=>journal?'레이어 '+(journal.layer+1)+' · K'+journal.slot:'';
 const load=()=>{const raw=localStorage.getItem(KEY);return raw?validateJournal(JSON.parse(raw)):null};
 function save(j){const value=JSON.stringify(j);localStorage.setItem(KEY,value);if(localStorage.getItem(KEY)!==value)throw Error('복원 기록 저장 실패');journal=j}
 function clear(){localStorage.removeItem(KEY);journal=null}
 function ui(s,label,msg){
  stage=s;dialog.dataset.stage=s;say(msg);next.textContent=label;next.disabled=working||s==='usb'||s==='bt'||((s==='switch'||s==='retry-bt')&&!usbRemoved);next.hidden=s==='done';close.hidden=!!journal||working;cancel.hidden=!journal||working||s==='restore';cancel.disabled=working;
  area.hidden=!(s==='usb'||s==='bt');
 }
 function stopCapture(){reading=false;clearTimeout(timer);clearTimeout(idle);timer=idle=null}
 function showResults(){
  const a=summarizeCapture(usb,journal.kind),b=summarizeCapture(bt,journal.kind),line=(name,r)=>name+': '+r.matched+'/'+r.total+' · '+(r.ok?'정상':'불일치');
  result.hidden=false;if(journal.kind==='alphabet'){result.textContent=['USB',line('F1~F6',a.functions),line('숫자 0~9',a.digits),'','블루투스',line('F1~F6',b.functions),line('숫자 0~9',b.digits),'',a.functions.ok&&a.digits.ok&&b.functions.ok&&b.digits.ok?'공통 명령 코드용 전체 키 수신 정상':'일부 키 불일치 · 추가 확인 필요'].join('\n');return}result.textContent=['USB',line('F13~F24',a.extended),line('F1~F3 + 숫자',a.alternate),'','블루투스',line('F13~F24',b.extended),line('F1~F3 + 숫자',b.alternate),'',a.extended.ok&&b.extended.ok?'F13~F24 수신 확인 (기존 Ctrl 조합은 별도 확인 필요)':a.extended.ok&&!b.extended.ok&&a.alternate.ok&&b.alternate.ok?'블루투스에서 대체 코드 수신 확인':'수신 결과 추가 확인 필요'].join('\n');
 }
 function captureDone(){
  if(!reading)return;stopCapture();const prior=stage;
  if(prior==='usb'){usb=events.slice();const baseline=summarizeCapture(usb,journal.kind);if(journal.kind==='alphabet'?(!baseline.functions.matched&&!baseline.digits.matched):(!baseline.extended.matched&&!baseline.alternate.matched)){ui('retry-usb','다시 기록',target()+'\n시험 키의 입력을 받지 못했습니다. 실제 레이어를 맞추고 다시 눌러 주세요.');return}ui('switch','블루투스 연결 완료','2단계 · 블루투스 시험\nUSB 케이블을 반드시 뽑으세요.\n블루투스로 연결한 다음 아래 버튼을 누르세요.')}
  else{bt=events.slice();showResults();ui('restore','USB 연결 및 복원','시험 완료. USB 케이블을 다시 연결한 후 아래 버튼을 누르면 시험 키를 복원합니다.')}
 }
 function capture(s){
  stopCapture();events=[];ui(s,'입력 대기 중',(s==='usb'?'1단계 · USB 시험\nUSB 케이블을 연결한 상태로 유지하세요.':'2단계 · 블루투스 시험\nUSB 케이블을 뽑은 상태에서 시험하세요.')+'\n'+target()+' 버튼을 한 번 누르세요.');area.textContent='입력 대기 중 · 한 번만 누르세요';area.focus();reading=true;timer=setTimeout(captureDone,15000);
 }
 for(const type of ['keydown','keyup'])area.addEventListener(type,e=>{
  if(!reading)return;e.preventDefault();e.stopPropagation();
  if(events.length>=128){captureDone();return}
  const record=inputSignature(e);events.push(record);clearTimeout(idle);
  if(events.some(x=>!modifier(x)))idle=setTimeout(captureDone,900);
 });
 function pause(){if(!reading)return;stopCapture();const s=stage;ui(s==='usb'?'retry-usb':'retry-bt','다시 기록','기록 영역에서 벗어났습니다. 아래 버튼을 누르고 '+target()+' 키를 누르세요.')}
 area.addEventListener('blur',pause);window.addEventListener('blur',pause);
 async function connect(){if(!device.verified||!device.dev?.opened)await device.connect();usbRemoved=false}
 navigator.hid?.addEventListener('disconnect',e=>{if(e.device!==device.dev)return;usbRemoved=true;device.verified=false;if(stage==='switch'||stage==='retry-bt'){if(journal?.kind==='alphabet'&&!working){capture('bt')}else{next.disabled=working;say('2단계 · 블루투스 시험\nUSB 분리 확인. 아래 버튼을 누르세요.')}}});
 navigator.hid?.addEventListener('connect',e=>{if(!supported(e.device))return;usbRemoved=false;if(stage==='bt')stopCapture();if(['switch','retry-bt','bt'].includes(stage))ui('switch','블루투스 연결 완료','USB가 다시 연결되었습니다.\nUSB 케이블을 뽑고 블루투스로 연결하세요.')});
 function checked(r){if(!r||!r.complete||r.failed.length||r.unexpected.length)throw Error('키 쓰기 또는 재읽기 검증 실패')}
 async function start(){
  if(!ready())throw Error('다른 미전송 변경 또는 통신을 먼저 완료하세요.');
  await connect();const raw=await device.read(),t=chooseTarget(raw,layer(),profile());
  const j={...t,kind,before:snapshot(raw)};save(j);onChange();
  checked(await device.write([{...t,binding:bindingFor(kind)}],async before=>{if(verifyTarget(before,j)!=='empty')throw Error('시험 키가 비어 있지 않습니다')},()=>true));
  capture('usb');
 }
 async function restore(){
  stopCapture();await connect();const raw=await device.read(),j=journal;
  const kind=verifyTarget(raw,j);
  if(kind==='test')checked(await device.write([{layer:j.layer,slot:j.slot,binding:empty}],async before=>{if(verifyTarget(before,j)!=='test')throw Error('시험 키 변경 감지')},()=>true));
  const after=await device.read();if(verifyTarget(after,j)!=='empty')throw Error('빈 키 복원 확인 실패');
  clear();onChange();ui('done','완료','시험에 사용한 키를 원래 빈 상태로 복원했습니다.');
 }
 async function action(){
  if(working)return;working=true;next.disabled=true;close.hidden=true;cancel.hidden=true;
  try{
   if(stage==='idle'){say('USB 장치 확인 및 빈 키에 시험 코드 기록 중');await start()}
   else if(stage==='switch'||stage==='retry-bt'){if(!usbRemoved)ui('switch','블루투스 연결 완료','USB 케이블을 반드시 뽑으세요.\n분리 확인 후 블루투스 시험을 시작할 수 있습니다.');else capture('bt');}
   else if(stage==='retry-usb')capture('usb');
   else if(stage==='restore'){say('USB 연결 및 시험 키 복원 중');await restore()}
  }catch(e){log('블루투스 시험: '+e.message);stopCapture();if(journal)ui('restore','USB 연결 및 복원',e.message+'\n시험 복원 기록은 보존됩니다.');else ui('idle','테스트 시작',e.message)}
  finally{working=false;next.disabled=stage==='usb'||stage==='bt'||((stage==='switch'||stage==='retry-bt')&&!usbRemoved);close.hidden=!!journal;cancel.hidden=!journal||stage==='restore';cancel.disabled=false}
 }
 $('bluetoothWizardOpen').onclick=()=>{
  try{journal=load();result.hidden=true;usb=[];bt=[];dialog.showModal();
   if(journal)ui('restore','USB 연결 및 복원','이전 시험이 끝나지 않았습니다. 먼저 '+target()+' 키를 복원하세요.');
   else ui('idle','테스트 시작',(kind==='alphabet'?'공통 코드 추가 시험: Ctrl+Alt+Shift + F1~F6, 숫자 0~9.\n':'')+'USB로 키보드를 연결하세요. 빈 키 하나를 자동 선택하여 시험하고, 종료 시 원상 복원합니다.');
  }catch(e){alert(e.message)}
 };
 next.onclick=action;cancel.onclick=()=>{stopCapture();ui('restore','USB 연결 및 복원','시험 중단 · USB 연결 후 시험 키를 복원하세요.')};
 close.onclick=()=>{if(!journal&&!working)dialog.close()};
 dialog.addEventListener('cancel',e=>{if(journal||working)e.preventDefault()});
 window.addEventListener('beforeunload',e=>{if(journal){e.preventDefault();e.returnValue=''}});
 // Recovery remains available after restart; do not silently write a reconnected device.
 try{journal=load();if(journal){dialog.showModal();ui('restore','USB 연결 및 복원','이전 시험이 끝나지 않았습니다. 먼저 '+target()+' 키를 복원하세요.')}}catch(e){log(e.message)}
}
