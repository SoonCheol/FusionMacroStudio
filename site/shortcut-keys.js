// Selection groups and capture approach adapted from the DeckForge hotkey editor.
// Values here are USB keyboard HID usages, not Windows virtual-key codes.
const entry=(code,label,usage,category='')=>({code,label,usage,category});
const range=(n,fn)=>Array.from({length:n},(_,i)=>fn(i));
export const GROUPS=[
 {label:'특수 키',keys:[
 ...[['PrintScreen','PrtSc',70],['PageUp','PgUp',75],['PageDown','PgDn',78],['Home','Home',74],['End','End',77],['Insert','Insert',73],['Delete','Delete',76],['ArrowLeft','←',80],['ArrowUp','↑',82],['ArrowRight','→',79],['ArrowDown','↓',81],['Enter','Enter',40],['Space','Space',44],['Tab','Tab',43],['Escape','Esc',41],['Backspace','Backspace',42],['Pause','Pause',72],['ScrollLock','Scroll Lock',71],['CapsLock','Caps Lock',57],['NumLock','Num Lock',83],['ContextMenu','Menu',101]].map(a=>entry(...a)),
 ...range(10,i=>entry('Numpad'+i,'Num '+i,i===0?98:88+i,'숫자 키패드')),
 ...[['NumpadAdd','Num +',87],['NumpadSubtract','Num -',86],['NumpadMultiply','Num *',85],['NumpadDivide','Num /',84],['NumpadDecimal','Num .',99],['NumpadEnter','Num Enter',88]].map(a=>entry(...a,'숫자 키패드'))]},
 {label:'기능 키',keys:range(24,i=>entry('F'+(i+1),'F'+(i+1),i<12?58+i:104+i-12))},
 {label:'문자·숫자·기호',keys:[
 ...range(26,i=>entry('Key'+String.fromCharCode(65+i),String.fromCharCode(65+i),4+i,'영문')),
 ...range(10,i=>entry('Digit'+i,String(i),i===0?39:29+i,'숫자')),
 ...[['Minus','-',45],['Equal','=',46],['BracketLeft','[',47],['BracketRight',']',48],['Backslash','\\',49],['Semicolon',';',51],['Quote',"'",52],['Backquote','`',53],['Comma',',',54],['Period','.',55],['Slash','/',56],['IntlBackslash','ISO \\',100]].map(a=>entry(...a,'기호'))]}
];
const all=GROUPS.flatMap(g=>g.keys);
export const MODIFIERS=[['Ctrl',1],['Alt',4],['Shift',2],['Win',8]];
export const byUsage=new Map(all.map(k=>[k.usage,k]));
const byCode=new Map(all.map(k=>[k.code,k]));
export function shortcutLabel(mods,usage){return [...MODIFIERS.filter(([,bit])=>mods&bit).map(([name])=>name),byUsage.get(usage)?.label||''].filter(Boolean).join(' + ')}
export function captureShortcut(e){
 const key=byCode.get(e.code);
 if(!key||e.isComposing)return null;
 return {mods:(e.ctrlKey?1:0)|(e.shiftKey?2:0)|(e.altKey?4:0)|(e.metaKey?8:0),code:key.usage};
}
export function shortcutIssue(mods,code){
 if(!byUsage.has(code)||!Number.isInteger(mods)||mods<0||mods>15)return '키를 선택하세요.';
 // These combinations can be consumed by the Fusion command decoder.
 if((mods===7&&code>=58&&code<=63)||(code>=104&&code<=115&&(mods===1||mods===2||mods===3)))return 'Fusion 내부 명령용 조합입니다. 다른 조합을 선택하세요.';
 return '';
}
export function shortcutBinding(mods,code){
 const issue=shortcutIssue(mods,code);if(issue)throw Error(issue);
 return {type:'key',delay:0,steps:[{mods,code}]};
}
