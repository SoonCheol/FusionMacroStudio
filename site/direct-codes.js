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
export function directIndex(b){
 if(b?.type!=='key'||b.delay!==0||b.steps?.length!==5||b.steps[0]?.code!==115||b.steps.some(s=>s?.mods!==1))return null;
 let index=0;
 for(const s of b.steps.slice(1)){if(!Number.isInteger(s.code)||s.code<104||s.code>114)return null;index=index*11+s.code-104}
 return index;
}
