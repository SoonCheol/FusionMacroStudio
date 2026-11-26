// Focused, opt-in diagnostic only. Never records outside the capture area.
export function inputSignature(e){return {edge:e.type==='keydown'?'down':'up',code:e.code||'Unidentified',key:e.key||'Unidentified',mods:(e.ctrlKey?1:0)|(e.shiftKey?2:0)|(e.altKey?4:0)|(e.metaKey?8:0),repeat:!!e.repeat}}
export function compareInputs(a,b){if(!a.length||!b.length)return 'USB와 블루투스 기록이 모두 필요합니다.';const first=Array.from({length:Math.max(a.length,b.length)},(_,i)=>i).find(i=>JSON.stringify(a[i])!==JSON.stringify(b[i]));return first===undefined?'입력 코드 및 순서 일치 ('+a.length+'개 이벤트)':'입력 차이 · '+(first+1)+'번째 이벤트부터 불일치'}
export function setupInputComparison(){
 const $=id=>document.getElementById(id),area=$('captureArea'),result=$('captureResult'),details=$('inputComparison');
 const records={usb:[],bt:[]};let mode=null,timer=null;
 function render(){const lines=[];for(const key of ['usb','bt']){lines.push((key==='usb'?'USB':'블루투스')+' ('+records[key].length+')');for(const e of records[key])lines.push(e.edge+' '+e.code+' '+e.key+' mods='+e.mods+(e.repeat?' repeat':''));}lines.push(compareInputs(records.usb,records.bt));result.textContent=lines.join('\n')}
 function stop(){if(timer)clearTimeout(timer);timer=null;mode=null;$('captureStop').disabled=true;area.textContent='기록 종료 · 동일 레이어와 동작을 비교하세요.';render()}
 function start(next){stop();mode=next;records[next]=[];$('captureStop').disabled=false;area.textContent=(next==='usb'?'USB':'블루투스')+' 기록 중 · 같은 키 또는 노브를 시험하세요. (최대 15초)';area.focus();timer=setTimeout(stop,15000);render()}
 for(const type of ['keydown','keyup'])area.addEventListener(type,e=>{if(!mode)return;e.preventDefault();e.stopPropagation();if(records[mode].length>=128){stop();return}records[mode].push(inputSignature(e));render()});
 area.addEventListener('blur',()=>{if(mode)stop()});
 window.addEventListener('blur',()=>{if(mode)stop()});
 details.addEventListener('toggle',()=>{if(!details.open&&mode)stop()});
 $('captureUsb').onclick=()=>start('usb');$('captureBt').onclick=()=>start('bt');$('captureStop').onclick=stop;$('captureReset').onclick=()=>{stop();records.usb=[];records.bt=[];render()};
}
