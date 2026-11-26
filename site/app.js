import {Keypad,SLOTS,blank,trigger,validProfile,readBinding,sameKey,reports,slotOrder,completeRead,parseBackup,profileChanges} from './protocol.js';
import {commandBinding,directIndex,validateCodes,HOLD_MARKERS,FAST_CAMERA,KNOB_MARKERS,pairInfo,pairBinding,pairEligible,orbitBase,orbitMode,orbitVariant} from './direct-codes.js';
import {putAsset,loadAssets} from './assets.js';
import {iconUrl,iconKind,referenceIcons} from './command-icons.js';
import {setWordLabel,fitLabels,watchLabels} from './word-labels.js';
import {setupInputComparison,probeBinding} from './input-comparison.js';
const $=id=>document.getElementById(id), store='fusion-macro-studio.v1';let profile=blank(),layer=0,selected=null,chosen=null,language='ko',area='',panel='',commands=[],tree=[],overlay=null,orientation='normal',pending=new Map(),busy=false,readReady=false,viewReady=false,restoreStaged=false;const desktopMode=!!window.fmsDesktop;const localMode=desktopMode||location.origin==='http://127.0.0.1:18472';let syncDirty=false,revision='',localReady=!localMode;const icons=new Map();let catalog;let codeIds=[],codeMap=new Map(),codeReady=false;let imported=[],allMode=false,visibleLimit=400;
const cameraCommands=[['fit','전체 보기','Fit view'],['zoom_in','확대','Zoom in'],['zoom_out','축소','Zoom out'],['orbit_left','왼쪽 오비트','Orbit left'],['orbit_right','오른쪽 오비트','Orbit right'],['orbit_up','위 오비트','Orbit up'],['orbit_down','아래 오비트','Orbit down'],['pan_left','왼쪽 팬','Pan left'],['pan_right','오른쪽 팬','Pan right'],['pan_up','위쪽 팬','Pan up'],['pan_down','아래쪽 팬','Pan down'],['pivot_auto','회전 중심 자동','Pivot auto'],['pivot_body','선택 바디 중심','Selected body pivot'],['pivot_origin','원점 중심','Origin pivot'],['pivot_camera','카메라 중심','Camera pivot'],['pivot_point','선택 위치 중심','Pick pivot'],['hold_pan','누른 채 회전: 팬','Hold to pan'],['hold_vertical','누른 채 회전: 상하','Hold vertical orbit']].map(([id,name,en])=>({id:'__fms_'+id+'__',name,en,description:'Fusion Macro Studio camera action'}));let cameraOnly=false;const knobViews=Array.from({length:3},()=>[false,false,false]);let selectedHeld=false,legacyOrbitMode="constrained";
try{let p=JSON.parse(localStorage.getItem(store)||'null');if(p)profile=validProfile(p);for(const c of JSON.parse(localStorage.getItem(store+'.pending')||'[]')){try{reports(c.layer,c.slot,c.binding);if(JSON.stringify(profile.layers[c.layer].bindings[c.slot])===JSON.stringify(c.binding))pending.set(c.layer+':'+c.slot,c)}catch{}}syncDirty=localMode&&localStorage.getItem(store+'.syncDirty')==='1';revision=localStorage.getItem(store+'.revision')||'';orientation=localStorage.getItem(store+'.orientation')||'normal'}catch{}
function persist(){try{localStorage.setItem(store,JSON.stringify(profile));localStorage.setItem(store+'.pending',JSON.stringify([...pending.values()]));if(localMode){localStorage.setItem(store+'.syncDirty',syncDirty?'1':'0');localStorage.setItem(store+'.revision',revision)}}catch(e){log('브라우저 저장 실패: '+e.message)}}
function log(s){$('log').textContent+=new Date().toLocaleTimeString()+' '+s+'\n';$('log').scrollTop=$('log').scrollHeight}
const device=new Keypad(log);let connecting=false;
function updateConnection(){const status=device.verified?'online':connecting?'connecting':'offline';$('connectionIndicator').dataset.state=status;$('connectionLabel').textContent=status==='online'?'연결됨':status==='connecting'?'연결 중':'미연결'}
function state(s){$('deviceStatus').textContent=s;$('deviceStatus').hidden=!s;updateConnection()}
function probeEmpty(l,slot){return !l.fusion[slot]&&bindingName(l.bindings[slot])==='미설정'}
function probeBlock(slot){
 if(busy)return '장치 통신 중';
 if(!device.verified)return 'USB 연결 필요';
 if(!viewReady||!readReady)return '기기에서 읽기 필요';
 if(!slot)return '현재 레이어에 빈 키가 없습니다. 빈 키를 만들거나 다른 레이어를 선택하세요.';
 if(!probeEmpty(profile.layers[layer],slot))return '빈 키를 선택하세요.';
 if([...pending.keys()].some(k=>k!==layer+':'+slot))return '다른 미전송 변경을 먼저 기기에 쓰세요.';
 return '';
}
function probeControls(){
 const select=$('probeSlot'),previous=Number(select.value),l=profile.layers[layer];
 const choices=viewReady&&readReady?Array.from({length:12},(_,i)=>i+1).filter(s=>probeEmpty(l,s)):[];
 const current=choices.includes(previous)?previous:choices.includes(selected)?selected:choices[0];
 select.replaceChildren();
 if(!choices.length){const o=document.createElement('option');o.value='';o.textContent='선택 가능한 빈 키 없음';select.append(o)}
 for(const s of choices){const o=document.createElement('option');o.value=String(s);o.textContent='K'+s;select.append(o)}
 if(current)select.value=String(current);
 select.disabled=busy||!choices.length;
 const reason=probeBlock(current);
 $('stageBtTest').disabled=!!reason;
 $('probeStatus').textContent=reason||'레이어 '+(layer+1)+' · K'+current+'에 시험 코드 배정 가능';
 $('stageBtTest').title=reason||'선택한 빈 키에 시험 코드를 배정합니다.';
}
function controls(){updateConnection();probeControls();for(const id of ['connect','read','write','open','save','assign','setKey','keyCode','orientation'])$(id).disabled=busy||!localReady; $('connect').disabled=busy||!localReady||device.verified; $('read').disabled=busy||!localReady||!codeReady||!device.verified;$('write').disabled=busy||!localReady||!codeReady||!device.verified||!readReady||(!pending.size&&!(localMode&&syncDirty));$('pendingCount').textContent=viewReady?'미전송 변경 '+pending.size+'개'+(localMode&&syncDirty?' · Fusion 반영 대기':''):'장치 읽기 전'+(pending.size?' · 이전 미전송 변경 '+pending.size+'개 보관 중':'');$('assign').disabled=busy||!viewReady||!readReady||!codeReady||selected===null||!chosen;$('setKey').disabled=busy||!viewReady||!readReady||selected===null||selectedHeld;$('keyCode').disabled=busy||!viewReady||!readReady||selected===null||selectedHeld;$('save').disabled=busy||!viewReady;for(const id of ['clearLayer','clearAll'])$(id).disabled=busy||!viewReady||!readReady||!device.verified}
async function run(fn){if(busy)return;busy=true;controls();try{await fn()}catch(e){state(e.message);log(e.message)}finally{busy=false;renderKeys();controls()}}
function keyName(code){if(code>=104&&code<=115)return 'F'+(code-91);if(code>=58&&code<=69)return 'F'+(code-57);if(code>=4&&code<=29)return String.fromCharCode(code+61).toUpperCase();return ({40:'Enter',41:'Esc',42:'Backspace',43:'Tab',44:'Space',79:'→',80:'←',81:'↓',82:'↑'})[code]||'0x'+Number(code).toString(16)}
function bindingName(b){if(!b)return '미설정';if(b.type==='media')return '미디어 0x'+b.usage.toString(16);if(b.type==='mouse')return '마우스 '+({1:'클릭',3:'휠',5:'이동'}[b.action]||'동작');if(b.type!=='key')return '기존 HID 설정';if(b.steps.length===1&&!b.steps[0].mods&&!b.steps[0].code)return '미설정';return b.steps.map(s=>[s.mods&1?'Ctrl':'',s.mods&2?'Shift':'',s.mods&4?'Alt':'',s.mods&8?'Win':'',keyName(s.code)].filter(Boolean).join('+')).join(', ')}
function art(id){id=orbitBase(id)||id;const el=document.createElement('img');const meta=commands.find(c=>c.id===id)||{};const original=icons.has(id);el.className='art '+(original?'original-art':'vector-art');el.src=original?icons.get(id):iconUrl(id,meta);el.alt='';el.title=original?'Fusion 로컬 원본 아이콘':Object.hasOwn(referenceIcons,id)?'공식 원본 참조 재드로잉':'미검수 임시 아이콘';el.draggable=false;return el}
function commandName(c){const base=orbitBase(c.id);if(base)c=commands.find(x=>x.id===base)||c;return language==='en'?(c.en||c.name):c.name}
function setPending(slot,b){if(localMode)syncDirty=true;profile.layers[layer].bindings[slot]=b;pending.set(layer+':'+slot,{layer,slot,binding:b});persist()}
function directMeta(b){const i=directIndex(b,codeIds),id=i===null?null:codeIds[i];if(KNOB_MARKERS.includes(id))return {id,name:'누름 감지'};return id?(cameraMeta(id)||{id,name:overlay?.commands?.[id]||id}):null}
function pairSlot(slot){return slot>=16&&slot<=24&&(slot-16)%3!==1}
function pairedKnob(l,k){return [16+3*k,18+3*k].some(s=>pairInfo(l.bindings[s],codeIds)?.held)}
function pressSlot(s){return [17,20,23].includes(s)}
function internalPress(id){return KNOB_MARKERS.includes(id)||HOLD_MARKERS.includes(id)}
function ordinaryPress(l,k){const s=17+3*k,id=l.fusion[s]?.id;if(internalPress(id))return false;return !!id||bindingName(l.bindings[s])!=='미설정'}
function emptyBinding(){return {type:'key',steps:[{mods:0,code:0}],delay:0}}
function restorePress(l,k){const slot=17+3*k;delete l.fusion[slot];if(pairedKnob(l,k)){const id=KNOB_MARKERS[k];l.fusion[slot]={id,name:'누름 감지'};setPending(slot,commandBinding(codeMap.get(id),codeIds))}else setPending(slot,emptyBinding())}
function preserveLegacyHeld(l,k){const marker=l.fusion[17+3*k]?.id;if(!HOLD_MARKERS.includes(marker))return;for(const s of [16+3*k,18+3*k]){const held=heldPreview(l,s,marker);if(held)stagePair(s,l.fusion[s]?.id||null,held.id)}}
function visibleCommand(l,slot,held){const c=held?heldPreview(l,slot,l.fusion[17+3*Math.floor((slot-16)/3)]?.id):l.fusion[slot];return c&&!internalPress(c.id)?c:null}
function visibleBinding(l,slot){return internalPress(l.fusion[slot]?.id)||pairInfo(l.bindings[slot],codeIds)?'미설정':bindingName(l.bindings[slot])}
function cameraMeta(id){const base=orbitBase(id),c=commands.find(c=>c.id===(base||id));return c?{...c,id}:null}
function viewCommand(l,slot,held){return held?heldPreview(l,slot,l.fusion[17+3*Math.floor((slot-16)/3)]?.id)?.id:l.fusion[slot]?.id}
function knobOrbit(l,k,held){return [16+3*k,18+3*k].map(s=>viewCommand(l,s,held)).filter(id=>orbitBase(id))}
function chooseOrbit(c,slot,held){if(!c||!pairSlot(slot)||!orbitBase(c.id))return c;const mode=orbitMode(knobOrbit(profile.layers[layer],Math.floor((slot-16)/3),held)[0],legacyOrbitMode)||legacyOrbitMode;return {...c,id:orbitVariant(c.id,mode)}}
function toggleOrbit(k,held){
 if(busy||!readReady||!viewReady||!codeReady)return;
 const l=profile.layers[layer],slots=[16+3*k,18+3*k],press=17+3*k,marker=l.fusion[press]?.id,ids=knobOrbit(l,k,held);
 if(!ids.length)return;
 const next=ids.every(id=>orbitMode(id,legacyOrbitMode)==='free')?'constrained':'free';
 const legacy=HOLD_MARKERS.includes(marker);
 if(legacy&&!confirm('기존 누름 전환을 독립 회전 설정으로 변환할까요? 기존 일반/누른 채 명령은 유지됩니다.'))return;
 for(const slot of slots){
  const pair=pairInfo(l.bindings[slot],codeIds),normal=l.fusion[slot]?.id||null,other=heldPreview(l,slot,marker)?.id||null;
  let a=normal,b=other;
  if(!held&&orbitBase(a))a=orbitVariant(a,next);
  if(held&&orbitBase(b))b=orbitVariant(b,next);
  if(a===normal&&b===other&&!legacy)continue;
  if(legacy&&!other&&a===normal)continue;
  stagePair(slot,a,b);
 }
 if(legacy&&pairedKnob(l,k)){l.fusion[press]={id:KNOB_MARKERS[k],name:'누름 감지'};setPending(press,commandBinding(codeMap.get(KNOB_MARKERS[k]),codeIds))}
 selected=null;renderKeys();state('노브 '+(k+1)+' · '+(next==='free'?'자유 오비트':'제한 오비트')+' · 쓰기 필요');
}
function stagePair(slot,normal,held){
 const k=Math.floor((slot-16)/3),l=profile.layers[layer],c=cameraMeta(normal);
 if(c)l.fusion[slot]={id:c.id,name:c.name};else delete l.fusion[slot];
 setPending(slot,held?pairBinding(k,normal,held,codeIds):normal?commandBinding(codeMap.get(normal),codeIds):{type:'key',steps:[{mods:0,code:0}],delay:0});
}
function editHeld(slot,c){
 if(busy||!viewReady||!readReady||!codeReady||!pairSlot(slot))return;
 if(c&&!pairEligible(c.id,codeIds)){const message='고정 코드표에 등록된 실행 명령만 사용할 수 있습니다.';state(message);alert(message);return}
 const k=Math.floor((slot-16)/3),press=17+3*k,l=profile.layers[layer],mode=l.fusion[press]?.id;
 let normal=l.fusion[slot]?.id||null;const old=heldPreview(l,slot,mode);
 if(!pairEligible(normal,codeIds)||(!normal&&bindingName(l.bindings[slot])!=='미설정'&&!pairInfo(l.bindings[slot],codeIds))){if(!c)return;if(!confirm('이 방향의 기존 일반 키 설정은 고정 명령으로 변환할 수 없습니다. 일반 회전을 미설정으로 바꾸고 누른 채 명령을 등록할까요?')){state('등록 취소 · 기존 설정 유지');return;}normal=null;}
 if(ordinaryPress(l,k))return;
 if(c&&old&&old.id!==c.id&&!confirm('누른 채 회전의 기존 명령을 교체할까요?'))return;
 // Convert the old preset for both directions, preserving any previously displayed camera actions.
 if(HOLD_MARKERS.includes(mode)){
  const other=slot===16+3*k?18+3*k:16+3*k,prev=heldPreview(l,other,mode),n=l.fusion[other]?.id;
  if(prev&&FAST_CAMERA.includes(orbitBase(n)||n))stagePair(other,n,prev.id);
 }
 stagePair(slot,normal,c?.id||null);
 if(pairedKnob(l,k)){
  if(l.fusion[press]?.id!==KNOB_MARKERS[k]){
   l.fusion[press]={id:KNOB_MARKERS[k],name:'누름 감지'};
   setPending(press,commandBinding(codeMap.get(KNOB_MARKERS[k]),codeIds));
  }
 }else if(KNOB_MARKERS.includes(mode)||HOLD_MARKERS.includes(mode)){
  delete l.fusion[press];setPending(press,{type:'key',steps:[{mods:0,code:0}],delay:0});
 }
 selected=slot;selectedHeld=true;renderKeys();state('누른 채 회전 설정 대기 · 쓰기 필요');
}
function assign(slot,c,held=false){
 if(busy||!localReady||!viewReady||!readReady||!codeReady||!c)return;
 c=chooseOrbit(c,slot,held);
 if(held){editHeld(slot,c);return}
 const l=profile.layers[layer],pair=pairInfo(l.bindings[slot],codeIds),old=visibleCommand(l,slot,false),index=codeMap.get(c.id),press=pressSlot(slot),k=(slot-17)/3;
 if(KNOB_MARKERS.includes(c.id))return;
 if(HOLD_MARKERS.includes(c.id)&&!press){state('누른 채 회전 전환은 노브 누르기 슬롯에만 등록할 수 있습니다');return}
 if((desktopMode||!localMode)&&index===undefined){state('고정 코드표에 없는 명령');return}
 if(pair?.held&&!pairEligible(c.id,codeIds)){alert('고정 코드표에 등록된 실행 명령만 사용할 수 있습니다.');return}
 if(old?.id!==c.id&&(old||!old&&visibleBinding(l,slot)!=='미설정')&&!confirm('이 슬롯의 기존 설정을 교체할까요?'))return;
 if(pair?.held){stagePair(slot,c.id,pair.held)}
 else{
  if(press&&!internalPress(c.id)){preserveLegacyHeld(l,k);knobViews[layer][k]=false}
  l.fusion[slot]={id:c.id,name:c.name};
  setPending(slot,localMode&&!desktopMode&&!c.id.startsWith('__fms_')?trigger(layer,slot):commandBinding(index,codeIds));
 }
 selected=slot;selectedHeld=false;renderKeys();
}
function decorate(el,slot,held=false){el.classList.toggle('selected',selected===slot&&selectedHeld===held);el.onclick=()=>{if(!busy&&viewReady&&readReady){selected=slot;selectedHeld=held;renderKeys()}};el.ondragover=e=>{if(!busy&&viewReady&&readReady&&e.dataTransfer.types.includes('application/x-fusion-macro-command')){e.preventDefault();e.dataTransfer.dropEffect='copy';el.classList.add('drop-over')}};el.ondragleave=()=>el.classList.remove('drop-over');el.ondrop=e=>{e.preventDefault();el.classList.remove('drop-over');if(busy)return;const id=e.dataTransfer.getData('application/x-fusion-macro-command');const c=commands.find(x=>x.id===id);if(c)try{assign(slot,c,held)}catch(err){state(err.message);log(err.message);alert('등록 실패: '+err.message)}}}
function heldPreview(l,slot,mode){
 if(!viewReady)return null;const pair=pairInfo(l.bindings[slot],codeIds);if(pair)return cameraMeta(pair.held);if(!HOLD_MARKERS.includes(mode))return null;
 const original=l.fusion[slot]?.id;
 if(!FAST_CAMERA.includes(orbitBase(original)||original)||![2,5].includes(l.bindings[slot]?.steps?.length))return null;
 let id=orbitBase(original)||original;
 if(mode==='__fms_hold_pan__'&&/^__fms_orbit_(left|right|up|down)__$/.test(id))id=id.replace('_orbit_','_pan_');
 if(mode==='__fms_hold_vertical__')id=({'__fms_orbit_left__':'__fms_orbit_up__','__fms_orbit_right__':'__fms_orbit_down__','__fms_pan_left__':'__fms_pan_up__','__fms_pan_right__':'__fms_pan_down__'})[id]||id;
 if(orbitBase(original)&&orbitBase(id)&&original!==orbitBase(original))id=orbitVariant(id,orbitMode(original,legacyOrbitMode));
 return cameraMeta(id);
}
function commandCell(button,slot,held,f,kind){
 const cell=document.createElement('div');cell.className=kind+'-cell';cell.append(button);
 const remove=document.createElement('button');remove.type='button';remove.className='remove-command';remove.textContent='×';remove.title='명령 제거';remove.setAttribute('aria-label',(slot<=12?'K'+slot:'노브 '+(Math.floor((slot-16)/3)+1)+' '+(held?'누른 채 ':'')+['좌회전','누르기','우회전'][(slot-16)%3])+' 명령 제거');
 remove.disabled=busy||!viewReady||!readReady||(!f&&(held||visibleBinding(profile.layers[layer],slot)==='미설정'));
 remove.onclick=e=>{e.stopPropagation();if(remove.disabled)return;selected=slot;selectedHeld=held;clearSelected();};
 cell.append(remove);return cell;
}
function renderKnob(k,l){
 const box=document.createElement('div');box.className='knob';
 const dial=document.createElement('div');dial.className='dial';
 const label=document.createElement('span');label.textContent='노브 '+(k+1);label.className='hint knob-number';
 const blocked=viewReady&&ordinaryPress(l,k);if(blocked)knobViews[layer][k]=false;
 const held=viewReady&&knobViews[layer][k],base=16+k*3,press=base+1,mode=l.fusion[press]?.id;
 const toggle=document.createElement('button');toggle.type='button';toggle.className='knob-switch';toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked',String(held));toggle.setAttribute('aria-label','노브 '+(k+1)+' 일반/누른 채 회전 보기');toggle.title=held?'누른 채 회전 · 일반으로 전환':'일반 회전 · 누른 채로 전환';toggle.disabled=busy||!viewReady||!readReady||blocked;if(blocked)toggle.title='누르기 명령 등록됨';
 for(const [cls,value] of [['switch-normal','일반'],['switch-track',''],['switch-held','누른 채']]){const span=document.createElement('span');span.className=cls;span.textContent=value;toggle.append(span)}
 toggle.onclick=()=>{knobViews[layer][k]=!held;selected=null;renderKeys();};
 const orbit=document.createElement('button');orbit.type='button';orbit.className='knob-switch orbit-switch';orbit.setAttribute('role','switch');orbit.setAttribute('aria-label','노브 '+(k+1)+' '+(held?'누른 채 ':'일반 ')+' 오비트 방식');
 const active=knobOrbit(l,k,held),free=active.length>0&&active.every(id=>orbitMode(id,legacyOrbitMode)==='free');
 orbit.setAttribute('aria-checked',String(free));orbit.disabled=busy||!viewReady||!readReady||!active.length;orbit.title=active.length?(free?'자유 오비트 · 제한으로 전환':'제한 오비트 · 자유로 전환'):'오비트 명령 미등록';
 for(const [cls,value] of [['switch-normal','제한'],['switch-track',''],['switch-held','자유']]){const span=document.createElement('span');span.className=cls;span.textContent=value;orbit.append(span)}
 orbit.onclick=()=>toggleOrbit(k,held);
 const face=document.createElement('div');face.className='knob-face';face.append(label,dial);
 const switches=document.createElement('div');switches.className='knob-switches';switches.append(orbit,toggle);
 box.append(face,switches);
 const group=document.createElement('div');group.className='knob-actions';
 for(let a=0;a<3;a++){
  const slot=base+a;
  if(held&&a===1){const note=document.createElement('div');note.className='knob-hold-status';note.setAttribute('aria-hidden','true');group.append(note);continue;}
  const b=document.createElement('button');b.className='knob-action';
  const glyph=document.createElement('span');glyph.textContent=held?['●↺','','●↻'][a]:['↺','●','↻'][a];b.append(glyph);
  const f=visibleCommand(l,slot,held);
  if(f)b.append(art(f.id));
  const n=document.createElement('span');n.className='name';
  const fallback=held?'미설정':viewReady?visibleBinding(l,slot):'';
  setWordLabel(n,f?commandName(commands.find(c=>c.id===f.id)||f):fallback);b.append(n);
  b.title='노브 '+(k+1)+' '+(held?'누른 채 ':'')+['좌회전','누르기','우회전'][a]+' · '+n.textContent;b.dataset.slot=String(slot);b.dataset.held=String(held);
  decorate(b,slot,held);
  group.append(commandCell(b,slot,held,f,'knob'));
 }
 box.append(group);

 return box;
}
function renderKeys(){const l=viewReady?profile.layers[layer]:{fusion:{},bindings:{}};$('layers').replaceChildren();for(let i=0;i<3;i++){const b=document.createElement('button');b.textContent='레이어 '+(i+1);b.classList.toggle('active',i===layer);b.onclick=()=>{if(!busy){layer=i;selected=null;renderKeys()}};$('layers').append(b)}let order=slotOrder(orientation);$('keys').replaceChildren();order.forEach((slot,i)=>{let b=document.createElement('button');b.className='key';const f=l.fusion[slot],n=document.createElement('small');n.textContent='K'+slot;b.append(n);if(f)b.append(art(f.id));let name=document.createElement('span');name.className='name';setWordLabel(name,f?commandName(commands.find(c=>c.id===f.id)||f):(viewReady?bindingName(l.bindings[slot]):''));b.append(name);b.title='슬롯 '+slot+' · '+name.textContent;decorate(b,slot);$('keys').append(commandCell(b,slot,false,f,'key'))});$('knobs').replaceChildren();for(let k=0;k<3;k++)$('knobs').append(renderKnob(k,l));$('selectedTitle').textContent=selected===null?'버튼 속성':selected<=12?'K'+selected+' 속성':'노브 '+(Math.floor((selected-16)/3)+1)+' · '+(selectedHeld?'누른 채 ':'')+['좌회전','누르기','우회전'][(selected-16)%3];const meta=selected===null?null:visibleCommand(l,selected,selectedHeld);$('selectedInfo').textContent=selected===null?'버튼 또는 노브 동작을 선택하세요.':meta?commandName(meta):selectedHeld?'미설정':visibleBinding(l,selected);controls();fitLabels()}
function buildTree(){const m=new Map();for(const x of catalog.entries){if(!m.has(x.id))m.set(x.id,{id:x.id,name:x.name,ko:x.name,en:overlay?.commands?.[x.id]||'',panel:x.panel,paths:[]})}for(const x of imported){if(!m.has(x.id))m.set(x.id,x);else if(x.description)m.get(x.id).description=x.description}for(const c of cameraCommands)m.set(c.id,c);for(const id of codeIds)if(!m.has(id)&&!KNOB_MARKERS.includes(id)&&(!orbitBase(id)||orbitBase(id)===id))m.set(id,{id,name:overlay?.commands?.[id]||id,en:overlay?.commands?.[id]||id});commands=[...m.values()];tree=window.FusionMenuTree.fromMenuCatalog(catalog,commands);renderCommands();renderKeys()}
function tabs(el,items,current,kind,change){el.replaceChildren();el.style.setProperty('--columns',String(Math.max(9,items.length)));for(const x of items){let b=document.createElement('button');const name=document.createElement('span');name.className='menu-name';setWordLabel(name,window.FusionMenuTree.localizedLabel(x,kind,language,overlay));b.append(name);b.title=name.textContent;b.classList.toggle('active',x.key===current);b.onclick=()=>change(x.key);el.append(b)}}
function detail(c){$('detailTitle').textContent=commandName(c);$('detailBody').textContent='ID: '+c.id+'\n한국어: '+c.name+'\nEnglish: '+(c.en||'미수집')+'\n'+(c.description||'설명 미수집');$('detail').showModal()}
function renderCommands(){if(!tree.length)return;if(!tree.some(t=>t.key===area))area=tree[0].key;const t=tree.find(x=>x.key===area);const panels=[...t.children.values()];if(!panels.some(x=>x.key===panel))panel=panels[0]?.key||'';tabs($('workspaces'),tree,area,'tab',k=>{area=k;panel='';cameraOnly=false;allMode=false;renderCommands()});tabs($('menus'),panels,panel,'panel',k=>{panel=k;cameraOnly=false;allMode=false;renderCommands()});let q=$('search').value.trim().toLowerCase();let p=t.children.get(panel);let items=cameraOnly&&!q?cameraCommands:allMode&&!q?commands:q?commands.filter(c=>[c.id,c.name,c.en].some(x=>String(x||'').toLowerCase().includes(q))):p?window.FusionMenuTree.descendants(p):[];$('path').textContent=cameraOnly&&!q?'시점 제어':allMode&&!q?'전체 명령':q?'전체 명령 검색':t.name+' / '+(p?.name||'');$('count').textContent=items.length+'개';$('commands').replaceChildren();for(const c of items.slice(0,visibleLimit)){let card=document.createElement('div');card.className='command-card';card.dataset.commandId=c.id;card.tabIndex=0;card.setAttribute('role','button');card.draggable=true;card.title=c.name+'\n'+(c.en||'영문명 미수집')+'\n'+c.id+(c.description?'\n'+c.description:'');card.append(art(c.id));let n=document.createElement('span');n.className='name';setWordLabel(n,commandName(c));card.append(n);let info=document.createElement('button');info.className='info';info.textContent='ⓘ';info.title='명령 정보';info.onclick=e=>{e.stopPropagation();detail(c)};card.append(info);card.onclick=()=>{chosen=c;for(const e of $('commands').children)e.classList.toggle('selected',e===card);controls()};card.onkeydown=e=>{if(e.key==='Enter'){card.click();if(selected!==null)assign(selected,c,selectedHeld)}};card.ondragstart=e=>{e.dataTransfer.setData('application/x-fusion-macro-command',c.id);e.dataTransfer.effectAllowed='copy'};$('commands').append(card)}$('catalogStatus').textContent='명령 '+commands.length+'개 · 로컬 원본 '+icons.size+'개 · 기본 벡터 '+new Set(commands.map(c=>iconKind(c.id,c))).size+'종';$('more').hidden=items.length<=visibleLimit;fitLabels()}
$('connect').onclick=()=>run(async()=>{readReady=false;viewReady=false;selected=null;connecting=true;renderKeys();state(desktopMode?'USB 장치 검색 중':'장치 목록에서 USB Composite Device를 선택하고 연결하세요.');try{await device.connect();state('연결됨 · 읽기 필요')}catch(e){state(e.name==='NotFoundError'?'연결 취소 또는 장치 없음':e.message);log(e.message)}finally{connecting=false;updateConnection()}});$('read').onclick=()=>run(async()=>{const discard=pending.size&&!restoreStaged;if(discard&&!confirm('이전 미전송 변경을 폐기하고 키보드의 실제 설정을 읽을까요? 취소하면 이번 읽기를 중단합니다.'))return;readReady=false;viewReady=false;selected=null;renderKeys();const raw=await device.read();if(!completeRead(raw))throw Error('전체 63 슬롯 읽기 실패 · 편집 데이터 보존, 쓰기 중단');await putAsset({id:'device-backup',value:{format:'fusion-macro-studio-device-backup-v1',created:new Date().toISOString(),layers:raw.map(m=>[...m].map(([slot,a])=>({slot,raw:[...a]})))}});if(discard){pending.clear();if(localMode){const current=await localApi('profile');profile=current.profile?validProfile(current.profile):blank();revision=current.revision;syncDirty=false;}}for(let i=0;i<3;i++){let l=profile.layers[i];for(const [slot,a] of raw[i]){if(pending.has(i+':'+slot))continue;let b=readBinding(a);if(b)l.bindings[slot]=b;else delete l.bindings[slot];const direct=directMeta(b);if(direct){l.fusion[slot]={id:direct.id,name:direct.name}}else if(l.fusion[slot]&&(!localMode||!sameKey(a,trigger(i,slot)))){delete l.fusion[slot];if(localMode)syncDirty=true}}}readReady=true;viewReady=true;restoreStaged=false;persist();state('읽기 완료 · '+raw.reduce((n,m)=>n+m.size,0)+'/63 응답')});
$('write').onclick=()=>run(async()=>{readReady=false;const result=await device.write([...pending.values()],async raw=>{await putAsset({id:'before-write-backup',value:{format:'fusion-macro-studio-device-backup-v1',created:new Date().toISOString(),layers:raw.map(m=>[...m].map(([slot,a])=>({slot,raw:[...a]})))}})});if(!result){readReady=true;return}if(!result.complete||result.unexpected.length){readReady=false;viewReady=false;selected=null;state('재읽기 이상 · 미전송 변경 유지 · 장치를 다시 읽으세요');log('재읽기 누락 또는 변경하지 않은 슬롯 불일치 '+result.unexpected.length+'개');return}const bad=new Set(result.failed.map(x=>x.layer+':'+x.slot));for(const k of pending.keys())if(!bad.has(k))pending.delete(k);readReady=!result.failed.length;viewReady=readReady;if(!viewReady)selected=null;const summary=result.failed.length?'재읽기 불일치 '+result.failed.length+'개 · 다시 읽기 필요':'쓰기 및 전체 슬롯 재읽기 확인 '+result.changed+'개';state(summary);if(localMode&&!result.failed.length&&!pending.size){syncDirty=true;persist();await syncProfile(summary)}else persist()});
if(navigator.hid)navigator.hid.addEventListener('disconnect',e=>{if(e.device===device.dev){device.verified=false;readReady=false;viewReady=false;selected=null;state('연결 해제');renderKeys()}});
$('save').onclick=()=>{if(!viewReady)return;let blob=new Blob([JSON.stringify(profile,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='fusion-macro-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('open').onclick=()=>$('profileFile').click();$('profileFile').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file||busy)return;
 await run(async()=>{
 if(file.size>8*1024*1024)throw Error('프로필 파일이 너무 큽니다');
 const value=JSON.parse(await file.text()),isBackup=value?.format==='fusion-macro-studio-device-backup-v1';
 if(!codeReady)throw Error('명령 코드표 로드 필요');
 const next=isBackup?parseBackup(value):profileChanges(validProfile(value),codeIds);
 if(!confirm((isBackup?'장치 백업':'프로필')+' 불러오기: '+next.changes.length+'개 복원 대기, '+next.skipped.length+'개 지원 제외. 기존 미전송 변경을 교체합니다. 장치에는 쓰기 버튼을 눌러야 적용됩니다.'))return;
 if(!isBackup)profile=validProfile(value);
 if(localMode)syncDirty=true;
 pending.clear();
 for(const c of next.changes){const l=profile.layers[c.layer];l.bindings[c.slot]=c.binding;if(isBackup){const direct=directMeta(c.binding);if(direct)l.fusion[c.slot]={id:direct.id,name:direct.name};else delete l.fusion[c.slot]}pending.set(c.layer+':'+c.slot,c)}
 readReady=false;viewReady=false;restoreStaged=true;selected=null;persist();state('불러오기 완료 · 복원 대기 '+next.changes.length+'개 · 제외 '+next.skipped.length+'개 · 연결 후 읽기 → 쓰기');if(next.skipped.length)log('복원 제외: '+next.skipped.map(c=>(c.layer+1)+'층/'+c.slot).join(', '));
 });
};
$('assign').onclick=()=>assign(selected,chosen,selectedHeld);function clearSelected(){
 if(selected===null||busy||!viewReady||!readReady)return;
 if(selectedHeld){editHeld(selected,null);return}
 const l=profile.layers[layer],slot=selected,pair=pairInfo(l.bindings[slot],codeIds);
 if(pair?.held){stagePair(slot,null,pair.held);renderKeys();return}
 if(pressSlot(slot)){const k=(slot-17)/3;restorePress(l,k);knobViews[layer][k]=false}
 else{delete l.fusion[slot];setPending(slot,emptyBinding())}
 renderKeys();state('명령 제거 대기 · 쓰기 필요');
}

for(const code of [...Array.from({length:26},(_,i)=>i+4),40,41,42,43,44,...Array.from({length:12},(_,i)=>i+58),79,80,81,82,...Array.from({length:12},(_,i)=>i+104)]){let o=document.createElement('option');o.value=code;o.textContent=keyName(code);$('keyCode').append(o)}
function clearLayers(all){
 if(busy||!viewReady||!readReady||!device.verified)return;
 const layers=all?[0,1,2]:[layer];
 if(!confirm((all?'전체 레이어 63개':'현재 레이어 21개')+' 키·노브의 모든 설정(일반 키/마우스/미디어 포함)을 지울까요? 실제 장치는 쓰기 버튼을 누를 때 변경됩니다.'))return;
 for(const i of layers)for(const slot of SLOTS){
  const b={type:'key',steps:[{mods:0,code:0}],delay:0};
  delete profile.layers[i].fusion[slot];profile.layers[i].bindings[slot]=b;pending.set(i+':'+slot,{layer:i,slot,binding:b});
 }
 if(localMode)syncDirty=true;selected=null;persist();renderKeys();state('지우기 대기 · 쓰기 필요');
}
$('clearLayer').onclick=()=>clearLayers(false);$('clearAll').onclick=()=>clearLayers(true);
$('setKey').onclick=()=>{if(selected===null||busy||!viewReady||!readReady||selectedHeld)return;const l=profile.layers[layer];if(pairInfo(l.bindings[selected],codeIds)?.held){state('누른 채 회전 설정을 먼저 제거하세요');return;}if(pressSlot(selected)){const k=(selected-17)/3;preserveLegacyHeld(l,k);knobViews[layer][k]=false}delete profile.layers[layer].fusion[selected];setPending(selected,{type:'key',steps:[{mods:0,code:Number($('keyCode').value)}],delay:0});renderKeys()};$('orientation').value=orientation;$('orientation').onchange=e=>{orientation=e.target.value;localStorage.setItem(store+'.orientation',orientation);renderKeys()};
$('camera').onclick=()=>{cameraOnly=true;allMode=false;$('search').value='';renderCommands()};$('more').onclick=()=>{visibleLimit+=400;renderCommands()};$('search').oninput=()=>{visibleLimit=400;renderCommands()};$('resetSearch').onclick=()=>{$('search').value='';cameraOnly=false;allMode=true;renderCommands()};for(const lang of ['ko','en'])$(lang).onclick=()=>{language=lang;for(const x of ['ko','en'])$(x).setAttribute('aria-pressed',String(x===lang));renderCommands();renderKeys()};$('closeDetail').onclick=()=>$('detail').close();
$('icons').onclick=()=>$('iconFiles').click();$('iconFiles').onchange=async e=>{let added=0;try{for(const f of e.target.files){if(!/\.png$/i.test(f.name)||f.size>768*1024)continue;const id=f.name.replace(/\.png$/i,'');if(icons.has(id))URL.revokeObjectURL(icons.get(id));await putAsset({id:'icon:'+id,value:f});icons.set(id,URL.createObjectURL(f));added++}renderCommands();renderKeys();state('원본 아이콘 '+added+'개 저장')}catch(err){state('원본 아이콘 저장 실패: '+err.message)}finally{e.target.value=''}};
$('importCatalog').onclick=()=>$('catalogFile').click();$('catalogFile').onchange=async e=>{try{let raw=JSON.parse(await e.target.files[0].text());let arr=Array.isArray(raw)?raw:raw.commands||raw.items||raw.catalog;if(!Array.isArray(arr))throw Error('지원하지 않는 카탈로그');const next=new Map(imported.map(c=>[c.id,c]));for(const v of arr){if(!v||typeof v!=='object')continue;let id=v.id||v.commandId||v.command_id,name=v.koName||v.name||v.label;if(typeof id==='string'&&typeof name==='string'&&id.length<=256&&name.length<=160)next.set(id,{id,name,en:v.englishName||v.nameEn||overlay?.commands?.[id]||'',description:typeof v.description==='string'?v.description:''})}imported=[...next.values()];await putAsset({id:'commands',value:imported});buildTree()}catch(err){$('catalogStatus').textContent=err.message}finally{e.target.value=''}};
let theme=localStorage.getItem(store+'.theme')|| (matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');function applyTheme(){document.documentElement.dataset.theme=theme;$('theme').textContent=theme==='dark'?'☀ 라이트 모드':'☾ 다크 모드'}applyTheme();$('theme').onclick=()=>{theme=theme==='dark'?'light':'dark';localStorage.setItem(store+'.theme',theme);applyTheme()};
const split=$('split');function resize(x){let w=$('main').getBoundingClientRect();let p=Math.max(35,Math.min(65,(x-w.left)/w.width*100));$('main').style.setProperty('--left',p+'%')}split.onpointerdown=e=>{split.setPointerCapture(e.pointerId);resize(e.clientX)};split.onpointermove=e=>{if(split.hasPointerCapture(e.pointerId))resize(e.clientX)};split.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();resize(split.getBoundingClientRect().left+(e.key==='ArrowLeft'?-20:20))}};
async function downloadBackup(id){try{let saved=(await loadAssets()).find(x=>x.id===id);if(!saved)throw Error('장치 읽기 후 백업을 받을 수 있습니다');const u=URL.createObjectURL(new Blob([JSON.stringify(saved.value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='fusion-macro-'+id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}catch(e){state(e.message)}}
$('backup').onclick=()=>downloadBackup('device-backup');$('beforeWriteBackup').onclick=()=>downloadBackup('before-write-backup');
async function localApi(path,body){
 if(desktopMode)return window.fmsDesktop.api(path,body);
 const response=await fetch('/api/'+path,{cache:'no-store',headers:{'X-FMS-Local':'1',...(body?{'Content-Type':'application/json'}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});
 if(!response.ok){let info=await response.json().catch(()=>({}));throw Error(info.error||'로컬 연결 오류 '+response.status)}
 return response.json();
}
async function syncProfile(summary){
 try{
  const legacy=JSON.parse(JSON.stringify(profile));for(const l of legacy.layers)for(const slot of Object.keys(l.fusion))if(directIndex(l.bindings[slot],codeIds)!==null)delete l.fusion[slot];
  const saved=await localApi('profile',{profile:legacy,revision});revision=saved.revision;persist();
  for(let i=0;i<30;i++){
   const current=await localApi('status');
   if(desktopMode&&current.state!=='running'){syncDirty=false;persist();state(summary+' · Fusion 설정 저장 완료');return;}
   if(current.state==='running'&&current.profile==='loaded'&&current.profile_revision===revision){
    syncDirty=false;persist();state(summary+' · Fusion 자동 반영 '+current.mapped+'개');return;
   }
   await new Promise(r=>setTimeout(r,100));
  }
  throw Error('애드인 반영 확인 시간 초과');
 }catch(e){syncDirty=true;persist();state(summary+' · Fusion 반영 실패: '+e.message+' · 쓰기로 재시도');log(e.message)}
}
if(localMode){
 localApi('orbit-mode').then(data=>{legacyOrbitMode=data.mode==='free'?'free':'constrained';renderKeys()}).catch(e=>log(e.message));
 if(desktopMode){
  $('desktopCheck').hidden=false;
  const api=window.fmsDesktop;let info={state:'idle'},addin={state:'idle'},checking=false,addinBusy=false;
  function title(){const app=info.current||'0.4.11',version=addin.current===null?'미설치':addin.current||'확인 필요';$('appTitleVersion').textContent='앱 '+app+' · 애드인 '+version}
  function safe(){
   if(busy){alert('기기 통신이 진행 중입니다. 완료 후 다시 시도하세요.');return false}
   if((pending.size||syncDirty)&&!confirm('키보드에 아직 쓰지 않은 변경사항이 있습니다. 변경사항을 보관하고 업데이트할까요?'))return false;
   try{persist();if(localStorage.getItem(store)!==JSON.stringify(profile)||localStorage.getItem(store+'.pending')!==JSON.stringify([...pending.values()])||localStorage.getItem(store+'.syncDirty')!==(syncDirty?'1':'0')||localStorage.getItem(store+'.revision')!==revision)throw Error('변경사항 저장 실패');return true}catch(e){alert(e.message+' · 프로필을 저장한 후 다시 시도하세요.');return false}
  }
  function buttons(){const waiting=checking||addinBusy||['checking','downloading'].includes(info.state);$('desktopInstall').disabled=waiting||!['available','ready'].includes(info.state);$('manageAddin').disabled=waiting||addin.state!=='available';$('desktopClose').disabled=addinBusy}
  function display(d){info=d;title();$('desktopCurrent').textContent=d.current||'—';$('desktopLatest').textContent=d.latest||'—';$('desktopInstall').textContent=d.state==='ready'?'프로그램 설치':'프로그램 업데이트';$('desktopProgress').hidden=!['downloading','ready'].includes(d.state);$('desktopProgress').value=d.progress||0;$('desktopMessage').textContent=({checking:'프로그램 확인 중',current:'프로그램 최신 버전',downloading:'프로그램 다운로드 '+d.progress+'%',ready:'다운로드 완료',error:'프로그램 업데이트 실패: '+d.error})[d.state]||'';buttons()}
  function displayAddin(d){addin=d;title();$('addinCurrent').textContent=d.current===null?'미설치':d.current||'—';$('addinLatest').textContent=d.latest||'—';$('manageAddin').textContent=d.current===null?'애드인 설치':'애드인 업데이트';$('addinMessage').textContent=({checking:'애드인 확인 중',current:'애드인 최신 버전',error:'애드인 확인 실패: '+d.error,installing:'애드인 설치 중'})[d.state]||'';buttons()}
  async function action(a){try{display(await api.update(a))}catch(e){$('desktopMessage').textContent=e.message}}
  async function checkAddin(check){try{displayAddin(await api.addinUpdate(check?'check':'status'))}catch(e){displayAddin({...addin,state:'error',error:e.message})}}
  api.onUpdate(display);
  $('desktopCheck').onclick=async()=>{if(!$('desktopUpdates').open)$('desktopUpdates').showModal();if(checking||addinBusy)return;checking=true;buttons();try{await Promise.all([action(info.state==='ready'||info.state==='downloading'?'status':'check'),checkAddin(true)])}finally{checking=false;buttons()}};
  $('desktopClose').onclick=()=>$('desktopUpdates').close();
  $('desktopUpdates').addEventListener('cancel',e=>{if(addinBusy)e.preventDefault()});
  $('desktopInstall').onclick=async()=>{if(info.state==='ready'){if(!safe())return;if(confirm('프로그램 업데이트를 설치하고 다시 실행할까요?'))await action('install')}else await action('download')};
  $('manageAddin').onclick=async()=>{if(!safe()||addinBusy)return;addinBusy=true;displayAddin({...addin,state:'installing'});try{displayAddin(await api.addinUpdate('install'))}catch(e){displayAddin({...addin,state:'error',error:e.message})}finally{addinBusy=false;buttons()}};
  action('status');checkAddin(false);
 }else{
 $('updateBar').hidden=false;
 let updatePolling=false,updateState='idle',updateData=null,closeApproved=false;
 function showUpdate(data){
  updateData=data;updateState=data.state;
  $('updateVersion').textContent='현재 '+data.current+' · 최신 '+(data.latest||'확인 전');
  const waiting=['checking','downloading','preparing','scheduled'].includes(data.state);
  $('checkUpdate').disabled=waiting;
  $('installUpdate').disabled=!['available','ready'].includes(data.state);
  $('installUpdate').textContent=data.state==='ready'?'설치':'업데이트';
  const progressVisible=['downloading','ready','preparing','scheduled'].includes(data.state);
  const percent=Math.max(0,Math.min(100,Number(data.progress)||0));
  $('updateProgress').hidden=!progressVisible;$('updateProgress').value=percent;
  $('updatePercent').hidden=!progressVisible;$('updatePercent').textContent=percent+'%';
  const messages={idle:'',checking:'최신 버전 확인 중',current:'최신 버전 사용 중',available:'새 버전 사용 가능',downloading:'다운로드 및 검증 중',ready:'다운로드 완료 · 설치 가능',preparing:'설치 준비 중',scheduled:'Fusion 종료 및 재실행 대기 · 저장 확인창을 확인하세요.',error:'업데이트 실패: '+data.error};
  $('updateMessage').textContent=messages[data.state]||'';
  if(data.state==='current'&&['installed','restart-requested'].includes(data.last_result?.state)&&data.last_result.version===data.current)$('updateMessage').textContent='업데이트 적용 완료 · '+data.current;
  return waiting;
 }
 function updateSafe(){
  if(busy||pending.size||syncDirty){$('updateMessage').textContent='먼저 편집 내용을 쓰고 작업을 완료하세요.';return false;}
  return true;
 }
 function confirmInstall(){
  if(!updateSafe()||updateState!=='ready')return;
  $('updateConfirmText').textContent='Fusion Macro Studio '+updateData.latest+' 다운로드 완료. '+(updateData.fusion_running===false?'지금 설치하시겠습니까?':'Fusion이 실행 중입니다. 종료 후 설치하시겠습니까?');
  $('updateNow').textContent=updateData.fusion_running===false?'설치':'종료 후 설치';
  $('updateConfirm').showModal();
 }
 async function updateAction(action){
  if(updatePolling)return;
  updatePolling=true;$('checkUpdate').disabled=true;$('installUpdate').disabled=true;
  try{
   let data=action?await localApi('update',{action}):await localApi('update');
   const startingVersion=data.current;
   if(!action&&data.state==='idle')data=await localApi('update',{action:'check'});
   let disconnected=0;
   while(showUpdate(data)){
    await new Promise(r=>setTimeout(r,data.state==='scheduled'?1500:350));
    try{
     data=await localApi('update');disconnected=0;
     if(data.current!==startingVersion){
      if(!busy&&!pending.size&&!syncDirty)location.reload();
      else {$('updateMessage').textContent='업데이트 완료 · 설정을 보존하고 페이지를 새로고침하세요.';}
      return;
     }
    }catch(e){
     if(!closeApproved||!['preparing','scheduled'].includes(updateState))throw e;
     $('updateMessage').textContent='Fusion 종료 후 설치 및 재실행 대기 중…';
     if(++disconnected>=120){$('updateMessage').textContent='Fusion 재연결 대기 중 · 설치 안내를 확인하고 다시 실행한 후 새로고침하세요.';$('checkUpdate').disabled=false;return;}
    }
   }
   if(action==='download'&&data.state==='ready')confirmInstall();
  }catch(e){$('updateMessage').textContent=e instanceof TypeError?'Fusion과 연결되지 않았습니다. Fusion을 실행한 후 업데이트를 확인하세요.':'업데이트 오류: '+e.message;$('checkUpdate').disabled=false;}
  finally{updatePolling=false}
 }
 $('checkUpdate').onclick=()=>updateAction('check');
 $('installUpdate').onclick=()=>{if(!updateSafe())return;if(updateState==='ready')confirmInstall();else updateAction('download')};
 $('updateLater').onclick=()=>$('updateConfirm').close();
 $('updateNow').onclick=()=>{if(!updateSafe()){$('updateConfirm').close();return;}closeApproved=true;$('updateConfirm').close();updateAction('install')};
 updateAction(null);
 }
 $('knobTrace').hidden=false;
 $('startTrace').onclick=async()=>{
  const button=$('startTrace'),out=$('traceResult');button.disabled=true;
  try{
   await localApi('knob-trace',{start:true});
   out.textContent='Fusion으로 전환하여 노브를 누른 채 돌려 주세요.';
   for(let i=0;i<35;i++){
    await new Promise(r=>setTimeout(r,1000));
    const data=await localApi('knob-trace');
    const labels={left:'좌회전',right:'우회전',press:'누르기',down:'눌림',up:'떼기'};
    out.textContent=(data.active?'진단 중':'진단 종료')+' · '+data.events.length+'개 이벤트\n'+data.events.map(e=>e.command?e.ms+'ms · '+e.command+' · '+e.edge:e.ms+'ms · 레이어 '+e.layer+' · 노브 '+e.knob+' · '+labels[e.action]+' · '+labels[e.edge]).join('\n');
    if(!data.active)break;
   }
  }catch(e){out.textContent='진단 실패: '+e.message}
  finally{button.disabled=false}
 };
}
async function initLocal(){
 if(!localMode)return;
 try{
  const current=await localApi('profile');
  if(!pending.size&&!syncDirty){
   if(current.profile)profile=validProfile(current.profile);
   revision=current.revision;
  }else if(revision!==current.revision){
   throw Error('로컬 프로필이 다른 곳에서 변경됨 · 현재 편집을 저장 후 사이트 데이터를 정리하고 다시 열어야 합니다');
  }
  localReady=true;persist();state(desktopMode?'':'Fusion 로컬 연결 · 키보드 연결 및 읽기 필요');
 }catch(e){state((desktopMode?'프로필 불러오기 실패: ':'Fusion 로컬 연결 실패: ')+e.message);log(e.message)}
 renderKeys();
}

$('probeSlot').onchange=probeControls;
$('stageBtTest').onclick=()=>{const slot=Number($('probeSlot').value),reason=probeBlock(slot);if(reason){$('probeStatus').textContent=reason;return}selected=slot;selectedHeld=false;setPending(slot,probeBinding(1234,$('probeKind').value));renderKeys();state('레이어 '+(layer+1)+' · K'+slot+' 시험 코드 배정 대기 · 기기에 쓰기 필요')};
setupInputComparison();watchLabels();renderKeys();initLocal();Promise.all([Promise.all(['menu','english','command-codes'].map(n=>fetch('data/'+n+'.json').then(r=>{if(!r.ok)throw Error('카탈로그 로드 실패');return r.json()}))),loadAssets().catch(e=>{log('로컬 자료 저장소: '+e.message);return []})]).then(([[m,en,codes],assets])=>{catalog=m;overlay=en;codeIds=validateCodes(codes);codeMap=new Map(codeIds.map((id,i)=>[id,i]));codeReady=true;for(const item of assets){if(item.id==='commands'&&Array.isArray(item.value))imported=item.value;if(item.id.startsWith('icon:')&&item.value instanceof Blob)icons.set(item.id.slice(5),URL.createObjectURL(item.value))}buildTree()}).catch(e=>$('catalogStatus').textContent=e.message);
