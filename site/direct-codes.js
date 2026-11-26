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
export const HOLD_MARKERS=['__fms_hold_pan__','__fms_hold_vertical__'];
export function commandBinding(index,ids){
 const id=ids[index],c=FAST_CAMERA.indexOf(id),h=HOLD_MARKERS.indexOf(id);
 if(c>=0)return {type:'key',steps:[{mods:2,code:115},{mods:1,code:104+c}],delay:0};
 if(h>=0)return {type:'key',steps:[{mods:2,code:113+h}],delay:0};
 return directBinding(index);
}
export function directIndex(b,ids=[]){
 if(b?.type==='key'&&b.delay===0){
  const s=b.steps;
  let id;
  if(s?.length===2&&s[0].mods===2&&s[0].code===115&&s[1].mods===1)id=FAST_CAMERA[s[1].code-104];
  if(s?.length===1&&s[0].mods===2)id=HOLD_MARKERS[s[0].code-113];
  if(id){const i=ids.indexOf(id);return i>=0?i:null}
 }
 if(b?.type!=='key'||b.delay!==0||b.steps?.length!==5||b.steps[0]?.code!==115||b.steps.some(s=>s?.mods!==1))return null;
 let index=0;
 for(const s of b.steps.slice(1)){if(!Number.isInteger(s.code)||s.code<104||s.code>114)return null;index=index*11+s.code-104}
 return index;
}
