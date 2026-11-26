// Fixed append-only registry. Ctrl-only input avoids every legacy modifier group.
export const CAPACITY=11**4;
export function validateCodes(data){
 if(data?.format!=='fms-direct-v1'||!Array.isArray(data.ids)||data.ids.length>CAPACITY||new Set(data.ids).size!==data.ids.length||data.ids.some(id=>typeof id!=='string'||!id.trim()||id.length>256||['__fms_escape__','__fms_export__'].includes(id)))throw Error('명령 코드표 오류');
 return data.ids;
}
export function directBinding(index){
 if(!Number.isInteger(index)||index<0||index>=CAPACITY)throw Error('명령 코드 범위 오류');
 const digits=Array(4);
 for(let i=3;i>=0;i--){digits[i]=104+index%11;index=Math.floor(index/11)}
 return {type:'key',steps:[115,...digits].map(code=>({mods:1,code})),delay:0};
}
// Reserved Shift+F24 prefix; next Ctrl+F13..F23 identifies the camera action.
export const FAST_CAMERA=["__fms_fit__","__fms_orbit_down__","__fms_orbit_left__","__fms_orbit_right__","__fms_orbit_up__","__fms_pan_down__","__fms_pan_left__","__fms_pan_right__","__fms_pan_up__","__fms_zoom_in__","__fms_zoom_out__"];
// Explicit orbit variants are append-only registry IDs; old IDs still use the legacy default.
export function orbitBase(id){const m=typeof id==='string'&&/^__fms_orbit_(left|right|up|down)(?:_(free|constrained))?__$/.exec(id);return m?'__fms_orbit_'+m[1]+'__':null}
export function orbitMode(id,fallback='constrained'){return orbitBase(id)?(/_free__$/.test(id)?'free':/_constrained__$/.test(id)?'constrained':fallback):null}
export function orbitVariant(id,mode){const b=orbitBase(id);return b&&['free','constrained'].includes(mode)?b.slice(0,-2)+'_'+mode+'__':id}
export const HOLD_MARKERS=['__fms_hold_pan__','__fms_hold_vertical__'];
// Pair codes: per-knob Shift+F19..F21 prefix, three base-6 Ctrl symbols.
// Exclude every hold marker from the digit alphabet to avoid simultaneous-key collision.
export const KNOB_MARKERS=['__fms_knob_hold_1__','__fms_knob_hold_2__','__fms_knob_hold_3__'];
const PAIR_DIGITS=[104,105,106,110,111,112];
export function pairEligible(id,ids){return id===null||(ids.includes(id)&&![...HOLD_MARKERS,...KNOB_MARKERS].includes(id))}
export function pairBinding(knob,normal,held,ids=FAST_CAMERA){
 if(!Number.isInteger(knob)||knob<0||knob>2||!pairEligible(normal,ids)||!pairEligible(held,ids))throw Error('지원하지 않는 노브 회전 명령');
 const a=normal===null?11:FAST_CAMERA.indexOf(normal),b=held===null?11:FAST_CAMERA.indexOf(held);
 const encode=(n,len)=>{const out=Array(len);for(let i=len-1;i>=0;i--){out[i]=PAIR_DIGITS[n%6];n=Math.floor(n/6)}return out};
 // Keep short camera-only pairs. The previously invalid first digit 5 is an extended frame marker.
 const digits=a>=0&&b>=0?encode(a*12+b,3):[PAIR_DIGITS[5],...encode(normal===null?CAPACITY:ids.indexOf(normal),6),...encode(held===null?CAPACITY:ids.indexOf(held),6)];
 return {type:'key',delay:0,steps:[{mods:2,code:110+knob},...digits.map(code=>({mods:1,code}))]};
}
export function pairInfo(b,ids=FAST_CAMERA){
 const commonPair=commonPairInfo(b,ids);if(commonPair)return commonPair;
 const s=b?.steps;
 if(b?.type!=='key'||b.delay!==0||![4,14].includes(s?.length)||s[0]?.mods!==2||s[0].code<110||s[0].code>112)return null;
 const digits=s.slice(1).map(x=>x?.mods===1?PAIR_DIGITS.indexOf(x.code):-1);
 if(digits.includes(-1))return null;
 const decode=arr=>arr.reduce((n,d)=>n*6+d,0);
 if(digits.length===3){const n=decode(digits);if(n>=144)return null;return {knob:s[0].code-110,normal:FAST_CAMERA[Math.floor(n/12)]||null,held:FAST_CAMERA[n%12]||null}}
 if(digits[0]!==5)return null;
 const a=decode(digits.slice(1,7)),c=decode(digits.slice(7,13));
 if((a!==CAPACITY&&!ids[a])||(c!==CAPACITY&&!ids[c]))return null;
 const normal=a===CAPACITY?null:ids[a],held=c===CAPACITY?null:ids[c];
 if(!pairEligible(normal,ids)||!pairEligible(held,ids))return null;
 return {knob:s[0].code-110,normal,held};
}
export function commandBinding(index,ids){
 const id=ids[index],c=FAST_CAMERA.indexOf(id),h=HOLD_MARKERS.indexOf(id),k=KNOB_MARKERS.indexOf(id);
 if(k>=0)return {type:'key',steps:[{mods:2,code:107+k}],delay:0};
 if(c>=0)return {type:'key',steps:[{mods:2,code:115},{mods:1,code:104+c}],delay:0};
 if(h>=0)return {type:'key',steps:[{mods:2,code:113+h}],delay:0};
 return directBinding(index);
}
export function directIndex(b,ids=[]){
 const pair=pairInfo(b,ids);if(pair){const i=ids.indexOf(pair.normal);return i>=0?i:null}
 const commonId=commonIndex(b,ids);if(commonId!==null)return commonId;
 if(b?.type==='key'&&b.delay===0){
  const s=b.steps;
  let id;
  if(s?.length===2&&s[0].mods===2&&s[0].code===115&&s[1].mods===1)id=FAST_CAMERA[s[1].code-104];
  if(s?.length===1&&s[0].mods===2)id=HOLD_MARKERS[s[0].code-113]||KNOB_MARKERS[s[0].code-107];
  if(id){const i=ids.indexOf(id);return i>=0?i:null}
 }
 if(b?.type!=='key'||b.delay!==0||b.steps?.length!==5||b.steps[0]?.code!==115||b.steps.some(s=>s?.mods!==1))return null;
 let index=0;
 for(const s of b.steps.slice(1)){if(!Number.isInteger(s.code)||s.code<104||s.code>114)return null;index=index*11+s.code-104}
 return index;
}

// Common USB/Bluetooth wire format. All symbols use Ctrl+Alt+Shift.
// Existing registry indices are unchanged; 99999 is the empty pair sentinel.
export const COMMON_CAPACITY=100000;
const COMMON_NULL=99999;
export const COMMON_CAMERA=[...FAST_CAMERA,...['down','left','right','up'].flatMap(d=>['constrained','free'].map(m=>'__fms_orbit_'+d+'_'+m+'__'))];
const decimalCode=d=>d===0?39:29+d;
const decimalDigit=c=>c===39?0:c>=30&&c<=38?c-29:-1;
const decimal=(n,len)=>String(n).padStart(len,'0').split('').map(d=>decimalCode(Number(d)));
const common=(prefix,digits=[])=>({type:'key',delay:0,steps:[prefix,...digits].map(code=>({mods:7,code}))});
export function commonCommandBinding(index,ids){
 if(!Number.isInteger(index)||index<0||index>=COMMON_CAPACITY||!ids[index])throw Error('명령 코드 범위 오류');
 const id=ids[index],k=KNOB_MARKERS.indexOf(id),c=COMMON_CAMERA.indexOf(id);
 if(k>=0)return common(61+k);
 // Older explicit hold-pan/vertical markers remain legacy until the pair migration.
 if(HOLD_MARKERS.includes(id))return commandBinding(index,ids);
 if(c>=0)return common(60,decimal(c,2));
 return common(58,decimal(index,5));
}
export function commonPairBinding(knob,normal,held,ids=FAST_CAMERA){
 if(!Number.isInteger(knob)||knob<0||knob>2||!pairEligible(normal,ids)||!pairEligible(held,ids))throw Error('지원하지 않는 노브 회전 명령');
 const n=COMMON_CAMERA.length+1,a=normal===null?n-1:COMMON_CAMERA.indexOf(normal),b=held===null?n-1:COMMON_CAMERA.indexOf(held);
 if(a>=0&&b>=0)return common(59,[decimalCode(knob),...decimal(a*n+b,3)]);
 const index=id=>id===null?COMMON_NULL:ids.indexOf(id);
 const x=index(normal),y=index(held);
 if(x>=COMMON_NULL&&normal!==null||y>=COMMON_NULL&&held!==null)throw Error('노브 코드 범위 오류');
 return common(59,[decimalCode(knob+3),...decimal(x,5),...decimal(y,5)]);
}
function commonDigits(s){
 if(!s?.length||s.some(x=>x?.mods!==7))return null;
 const d=s.slice(1).map(x=>decimalDigit(x.code));return d.includes(-1)?null:d;
}
export function commonPairInfo(b,ids=FAST_CAMERA){
 const s=b?.steps;if(b?.type!=='key'||b.delay!==0||s?.[0]?.code!==59)return null;
 const d=commonDigits(s);if(!d)return null;
 const decode=a=>a.reduce((n,x)=>n*10+x,0),kind=d[0],n=COMMON_CAMERA.length+1;
 if(kind>=0&&kind<3&&d.length===4){
  const v=decode(d.slice(1));if(v>=n*n)return null;
  const normal=COMMON_CAMERA[Math.floor(v/n)]||null,held=COMMON_CAMERA[v%n]||null;
  if(!pairEligible(normal,ids)||!pairEligible(held,ids))return null;
  return {knob:kind,normal,held};
 }
 if(kind>=3&&kind<6&&d.length===11){
  const a=decode(d.slice(1,6)),c=decode(d.slice(6,11));
  if((a!==COMMON_NULL&&!ids[a])||(c!==COMMON_NULL&&!ids[c]))return null;
  const normal=a===COMMON_NULL?null:ids[a],held=c===COMMON_NULL?null:ids[c];
  if(!pairEligible(normal,ids)||!pairEligible(held,ids))return null;
  return {knob:kind-3,normal,held};
 }
 return null;
}
export function commonIndex(b,ids=[]){
 const s=b?.steps;if(b?.type!=='key'||b.delay!==0)return null;
 const d=commonDigits(s);if(!d)return null;
 const p=s[0].code,n=d.reduce((v,x)=>v*10+x,0);
 let id;
 if(p===58&&d.length===5)return n;
 if(p===60&&d.length===2)id=COMMON_CAMERA[n];
 if(p>=61&&p<=63&&!d.length)id=KNOB_MARKERS[p-61];
 if(id){const i=ids.indexOf(id);return i>=0?i:null}
 return null;
}
