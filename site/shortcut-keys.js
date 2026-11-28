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

// Exact DeckForge preset ordering and additional Windows advisories, mapped to HID.
export const PRESETS=[
 {
  "id": "copy",
  "label": "복사",
  "mods": 1,
  "code": 6
 },
 {
  "id": "paste",
  "label": "붙여넣기",
  "mods": 1,
  "code": 25
 },
 {
  "id": "cut",
  "label": "잘라내기",
  "mods": 1,
  "code": 27
 },
 {
  "id": "undo",
  "label": "실행 취소",
  "mods": 1,
  "code": 29
 },
 {
  "id": "redo",
  "label": "다시 실행",
  "mods": 1,
  "code": 28
 },
 {
  "id": "save",
  "label": "저장",
  "mods": 1,
  "code": 22
 },
 {
  "id": "selectAll",
  "label": "전체 선택",
  "mods": 1,
  "code": 4
 },
 {
  "id": "find",
  "label": "찾기",
  "mods": 1,
  "code": 9
 },
 {
  "id": "newWindow",
  "label": "새 창",
  "mods": 1,
  "code": 17
 },
 {
  "id": "switchWindow",
  "label": "창 전환",
  "mods": 4,
  "code": 43
 },
 {
  "id": "showDesktop",
  "label": "바탕화면 보기",
  "mods": 8,
  "code": 7
 },
 {
  "id": "explorer",
  "label": "파일 탐색기",
  "mods": 8,
  "code": 8
 },
 {
  "id": "lock",
  "label": "윈도우 잠금",
  "mods": 8,
  "code": 15
 },
 {
  "id": "taskManager",
  "label": "작업 관리자",
  "mods": 3,
  "code": 41
 },
 {
  "id": "screenshot",
  "label": "영역 캡처",
  "mods": 10,
  "code": 22
 },
 {
  "id": "switchWindowPrevious",
  "label": "이전 창 전환",
  "mods": 6,
  "code": 43
 },
 {
  "id": "windowMaximize",
  "label": "창 최대화",
  "mods": 8,
  "code": 82
 },
 {
  "id": "windowRestore",
  "label": "창 복원·최소화",
  "mods": 8,
  "code": 81
 },
 {
  "id": "monitorLeft",
  "label": "왼쪽 모니터로 이동",
  "mods": 10,
  "code": 80
 },
 {
  "id": "monitorRight",
  "label": "오른쪽 모니터로 이동",
  "mods": 10,
  "code": 79
 },
 {
  "id": "desktopPrevious",
  "label": "이전 가상 데스크톱",
  "mods": 9,
  "code": 80
 },
 {
  "id": "desktopNext",
  "label": "다음 가상 데스크톱",
  "mods": 9,
  "code": 79
 },
 {
  "id": "brushDecrease",
  "label": "브러시 축소 (앱별)",
  "mods": 0,
  "code": 47
 },
 {
  "id": "brushIncrease",
  "label": "브러시 확대 (앱별)",
  "mods": 0,
  "code": 48
 },
 {
  "id": "timelinePrevious",
  "label": "이전 타임라인 단계 (앱별)",
  "mods": 0,
  "code": 80
 },
 {
  "id": "timelineNext",
  "label": "다음 타임라인 단계 (앱별)",
  "mods": 0,
  "code": 79
 },
 {
  "id": "timelineZoomIn",
  "label": "타임라인 확대 (앱별)",
  "mods": 1,
  "code": 46
 },
 {
  "id": "timelineZoomOut",
  "label": "타임라인 축소 (앱별)",
  "mods": 1,
  "code": 45
 }
];
export const WINDOWS_PRESETS=[
 {
  "id": "os-0-70",
  "label": "화면 캡처 (Windows 설정에 따름)",
  "mods": 0,
  "code": 70
 },
 {
  "id": "os-4-70",
  "label": "활성 창 캡처",
  "mods": 4,
  "code": 70
 },
 {
  "id": "os-5-76",
  "label": "Windows 보안 화면",
  "mods": 5,
  "code": 76
 },
 {
  "id": "os-5-43",
  "label": "창 전환 목록",
  "mods": 5,
  "code": 43
 },
 {
  "id": "os-8-70",
  "label": "전체 화면 캡처 후 저장",
  "mods": 8,
  "code": 70
 },
 {
  "id": "os-8-80",
  "label": "창 왼쪽 배치",
  "mods": 8,
  "code": 80
 },
 {
  "id": "os-8-79",
  "label": "창 오른쪽 배치",
  "mods": 8,
  "code": 79
 },
 {
  "id": "os-8-44",
  "label": "입력 언어 전환",
  "mods": 8,
  "code": 44
 },
 {
  "id": "os-8-43",
  "label": "작업 보기",
  "mods": 8,
  "code": 43
 },
 {
  "id": "os-8-72",
  "label": "시스템 정보",
  "mods": 8,
  "code": 72
 },
 {
  "id": "os-8-4",
  "label": "빠른 설정",
  "mods": 8,
  "code": 4
 },
 {
  "id": "os-8-5",
  "label": "시스템 트레이",
  "mods": 8,
  "code": 5
 },
 {
  "id": "os-8-10",
  "label": "게임 바",
  "mods": 8,
  "code": 10
 },
 {
  "id": "os-8-11",
  "label": "음성 입력",
  "mods": 8,
  "code": 11
 },
 {
  "id": "os-8-12",
  "label": "Windows 설정",
  "mods": 8,
  "code": 12
 },
 {
  "id": "os-8-14",
  "label": "무선 디스플레이 연결",
  "mods": 8,
  "code": 14
 },
 {
  "id": "os-8-16",
  "label": "모든 창 최소화",
  "mods": 8,
  "code": 16
 },
 {
  "id": "os-8-17",
  "label": "알림 센터 및 달력",
  "mods": 8,
  "code": 17
 },
 {
  "id": "os-8-19",
  "label": "디스플레이 출력 선택",
  "mods": 8,
  "code": 19
 },
 {
  "id": "os-8-21",
  "label": "실행 창",
  "mods": 8,
  "code": 21
 },
 {
  "id": "os-8-22",
  "label": "검색",
  "mods": 8,
  "code": 22
 },
 {
  "id": "os-8-23",
  "label": "작업 표시줄 앱 순환",
  "mods": 8,
  "code": 23
 },
 {
  "id": "os-8-24",
  "label": "접근성 설정",
  "mods": 8,
  "code": 24
 },
 {
  "id": "os-8-25",
  "label": "클립보드 기록",
  "mods": 8,
  "code": 25
 },
 {
  "id": "os-8-26",
  "label": "위젯",
  "mods": 8,
  "code": 26
 },
 {
  "id": "os-8-27",
  "label": "빠른 링크 메뉴",
  "mods": 8,
  "code": 27
 },
 {
  "id": "os-8-29",
  "label": "스냅 레이아웃",
  "mods": 8,
  "code": 29
 },
 {
  "id": "os-8-39",
  "label": "작업 표시줄 앱 0",
  "mods": 8,
  "code": 39
 },
 {
  "id": "os-8-30",
  "label": "작업 표시줄 앱 1",
  "mods": 8,
  "code": 30
 },
 {
  "id": "os-8-31",
  "label": "작업 표시줄 앱 2",
  "mods": 8,
  "code": 31
 },
 {
  "id": "os-8-32",
  "label": "작업 표시줄 앱 3",
  "mods": 8,
  "code": 32
 },
 {
  "id": "os-8-33",
  "label": "작업 표시줄 앱 4",
  "mods": 8,
  "code": 33
 },
 {
  "id": "os-8-34",
  "label": "작업 표시줄 앱 5",
  "mods": 8,
  "code": 34
 },
 {
  "id": "os-8-35",
  "label": "작업 표시줄 앱 6",
  "mods": 8,
  "code": 35
 },
 {
  "id": "os-8-36",
  "label": "작업 표시줄 앱 7",
  "mods": 8,
  "code": 36
 },
 {
  "id": "os-8-37",
  "label": "작업 표시줄 앱 8",
  "mods": 8,
  "code": 37
 },
 {
  "id": "os-8-38",
  "label": "작업 표시줄 앱 9",
  "mods": 8,
  "code": 38
 },
 {
  "id": "os-8-55",
  "label": "이모지 및 특수문자",
  "mods": 8,
  "code": 55
 },
 {
  "id": "os-9-61",
  "label": "가상 데스크톱 닫기",
  "mods": 9,
  "code": 61
 },
 {
  "id": "os-9-7",
  "label": "가상 데스크톱 추가",
  "mods": 9,
  "code": 7
 },
 {
  "id": "os-10-16",
  "label": "최소화된 창 복원",
  "mods": 10,
  "code": 16
 },
 {
  "id": "os-11-5",
  "label": "그래픽 드라이버 재설정",
  "mods": 11,
  "code": 5
 }
];
export const ALL_PRESETS=[...PRESETS,...WINDOWS_PRESETS];
export function matchShortcut(mods,code){return ALL_PRESETS.find(p=>p.mods===mods&&p.code===code)||null;}
