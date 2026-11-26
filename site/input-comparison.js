// Focused, opt-in diagnostic only. Never records outside the capture area.
export function inputSignature(e){return {edge:e.type==='keydown'?'down':'up',code:e.code||'Unidentified',key:e.key||'Unidentified',mods:(e.ctrlKey?1:0)|(e.shiftKey?2:0)|(e.altKey?4:0)|(e.metaKey?8:0),repeat:!!e.repeat}}
export function compareInputs(a,b){if(!a.length||!b.length)return 'USB와 블루투스 기록이 모두 필요합니다.';const first=Array.from({length:Math.max(a.length,b.length)},(_,i)=>i).find(i=>JSON.stringify(a[i])!==JSON.stringify(b[i]));return first===undefined?'입력 코드 및 순서 일치 ('+a.length+'개 이벤트)':'입력 차이 · '+(first+1)+'번째 이벤트부터 불일치'}
// Experimental transport probe only, never used for normal command registration.
export function probeBinding(index=1234,kind='digits'){
 if(kind==='extended')return {type:'key',delay:0,steps:Array.from({length:12},(_,i)=>({mods:1,code:104+i}))};
 if(kind==='extended-plain')return {type:'key',delay:0,steps:Array.from({length:12},(_,i)=>({mods:0,code:104+i}))};
 if(kind==='function-digits')return {type:'key',delay:0,steps:[58,59,60,30,31,32].map(code=>({mods:7,code}))};
 if(kind!=='digits')throw Error('알 수 없는 시험 종류');
 if(!Number.isInteger(index)||index<0||index>9999)throw Error('시험 코드 범위 오류');
 return {type:'key',delay:0,steps:[69,...String(index).padStart(4,'0').split('').map(d=>d==='0'?39:29+Number(d))].map(code=>({mods:7,code}))};
}
export function probeMatches(events,index=1234,kind='digits'){
 const steps=probeBinding(index,kind).steps;
 const expected=steps.map(({code,mods})=>({code:code>=104?'F'+(code-91):code>=58?'F'+(code-57):'Digit'+(code===39?0:code-29),mods}));
 const actual=events.filter(e=>!(/^(Control|Shift|Alt|Meta)(Left|Right)$/.test(e.code)));
 return actual.length===expected.length*2&&expected.every(({code,mods},i)=>actual[2*i].code===code&&actual[2*i].edge==='down'&&actual[2*i].mods===mods&&!actual[2*i].repeat&&actual[2*i+1].code===code&&actual[2*i+1].edge==='up');
}
export function setupInputComparison(){
 const $=id=>document.getElementById(id),area=$('captureArea'),result=$('captureResult'),details=$('inputComparison');
 const records={usb:[],bt:[]};let mode=null,timer=null;const kind=()=> $('probeKind').value;
 function render(){const lines=[];for(const key of ['usb','bt']){lines.push((key==='usb'?'USB':'블루투스')+' ('+records[key].length+')');for(const e of records[key])lines.push(e.edge+' '+e.code+' '+e.key+' mods='+e.mods+(e.repeat?' repeat':''));}lines.push(compareInputs(records.usb,records.bt));for(const k of ['usb','bt'])if(records[k].length)lines.push((k==='usb'?'USB':'블루투스')+' 선택한 시험 코드: '+(probeMatches(records[k],1234,kind())?'정상 수신':'불일치'));result.textContent=lines.join('\n')}
 function stop(){if(timer)clearTimeout(timer);timer=null;mode=null;$('captureStop').disabled=true;area.textContent='기록 종료 · 동일 레이어와 동작을 비교하세요.';render()}
 function start(next){stop();mode=next;records[next]=[];$('captureStop').disabled=false;area.textContent=(next==='usb'?'USB':'블루투스')+' 기록 중 · 같은 키 또는 노브를 시험하세요. (최대 15초)';area.focus();timer=setTimeout(stop,15000);render()}
 for(const type of ['keydown','keyup'])area.addEventListener(type,e=>{if(!mode)return;e.preventDefault();e.stopPropagation();if(records[mode].length>=128){stop();return}records[mode].push(inputSignature(e));render()});
 area.addEventListener('blur',()=>{if(mode)stop()});
 window.addEventListener('blur',()=>{if(mode)stop()});
 details.addEventListener('toggle',()=>{if(!details.open&&mode)stop()});
 $('captureUsb').onclick=()=>start('usb');$('captureBt').onclick=()=>start('bt');$('captureStop').onclick=stop;$('captureReset').onclick=()=>{stop();records.usb=[];records.bt=[];render()};$('probeKind').onchange=$('captureReset').onclick;
}
