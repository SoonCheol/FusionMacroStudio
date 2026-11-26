const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const LIMIT=8*1024*1024,SLOTS=[...Array.from({length:12},(_,i)=>i+1),...Array.from({length:9},(_,i)=>i+16)],MODS=[0,3,5,6,7,2];
const revision=raw=>raw?crypto.createHash('sha256').update(raw).digest('hex'):'';
async function read(file){try{const s=await fs.stat(file);if(s.size>LIMIT)throw Error('파일 크기 초과');return await fs.readFile(file)}catch(e){if(e.code==='ENOENT')return null;throw e}}
const parse=raw=>raw?JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,'')):null;
async function write(file,raw){await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+crypto.randomUUID()+'.tmp';try{await fs.writeFile(tmp,raw,{flag:'wx'});await fs.rename(tmp,file)}finally{await fs.rm(tmp,{force:true})}}
function validate(p){
 if(p?.format!=='fusion-macro-studio-v1'||p.knobBase!==16||!Array.isArray(p.layers)||p.layers.length!==3)throw Error('잘못된 프로필');
 let n=0;
 for(let l=0;l<3;l++){
  const layer=p.layers[l];if(!layer||!layer.fusion||!layer.bindings||Array.isArray(layer.fusion)||Array.isArray(layer.bindings)||typeof layer.fusion!=='object'||typeof layer.bindings!=='object')throw Error('잘못된 레이어');
  for(const [key,v] of Object.entries(layer.fusion)){
   const slot=Number(key),i=l*21+SLOTS.indexOf(slot),b=layer.bindings[key];
   if(!SLOTS.includes(slot)||String(slot)!==key||typeof v?.id!=='string'||!v.id.trim()||v.id.length>256||['__fms_escape__','__fms_export__'].includes(v.id)||b?.type!=='key'||b.delay!==0||!Array.isArray(b.steps)||b.steps.length!==1||b.steps[0]?.mods!==MODS[Math.floor(i/12)]||b.steps[0]?.code!==104+i%12)throw Error('프로필 명령 코드 불일치');
   n++;
  }
 }return n;
}
function storage(home){
 let tail=Promise.resolve();
 async function handle(route,body){
  if(route==='profile'){
   const target=path.join(home,'profile.json'),old=await read(target);
   if(body===undefined)return {profile:parse(old),revision:revision(old)};
   const mapped=validate(body.profile),raw=Buffer.from(JSON.stringify(body.profile),'utf8');
   if(raw.length>LIMIT)throw Error('프로필 크기 초과');
   if(body.revision!==revision(old))throw Error('다른 편집기에서 프로필이 변경되었습니다. 다시 실행하세요.');
   if(!old||!old.equals(raw)){if(old)await write(path.join(home,'profile.previous.json'),old);await write(target,raw)}
   return {revision:revision(raw),mapped};
  }
  if(route==='orbit-mode'){
   const target=path.join(home,'orbit-settings.json');
   if(body===undefined){let mode;try{mode=parse(await read(target))?.mode}catch{}return {mode:mode==='free'?'free':'constrained'}}
   if(!['free','constrained'].includes(body?.mode))throw Error('잘못된 오비트 방식');
   await write(target,Buffer.from(JSON.stringify({mode:body.mode})));return {mode:body.mode};
  }
  if(route==='status'&&body===undefined){
   const s=parse(await read(path.join(home,'status.json')))||{};
   if(s.state==='running'&&Math.abs(Date.now()/1000-Number(s.time))<12){try{process.kill(s.pid,0);return s}catch{}}
   return {state:'stopped'};
  }
  throw Error('지원하지 않는 요청');
 }
 return (route,body)=>{const result=tail.then(()=>handle(route,body));tail=result.catch(()=>{});return result}
}
module.exports={storage,validate};
