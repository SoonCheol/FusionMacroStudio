import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {CAPACITY,validateCodes,directBinding,directIndex} from './direct-codes.js';
import {reports,readBinding,sameBinding,blank,profileChanges} from './protocol.js';
const url=new URL('./data/command-codes.json',import.meta.url),ids=validateCodes(JSON.parse(readFileSync(url,'utf8')));
test('fixed registry, all 14641 code payloads roundtrip and no legacy modifiers',()=>{
 const seen=new Set();
 for(let i=0;i<CAPACITY;i++){const b=directBinding(i),r=reports(0,1,b)[0];r[0]=250;assert.equal(directIndex(readBinding(r)),i);assert.ok(sameBinding(r,b));assert.ok(b.steps.every(s=>s.mods===1));seen.add(JSON.stringify(b))}
 assert.equal(seen.size,CAPACITY);assert.equal(ids.length,1220);
});
test('direct profile restore keeps command code independent of slot',()=>{
 const p=blank(),b=directBinding(1);p.layers[2].bindings[24]=b;p.layers[2].fusion[24]={id:ids[1],name:'test'};
 assert.deepEqual(profileChanges(p,ids).changes,[{layer:2,slot:24,binding:b}]);
 p.layers[2].fusion[24].id=ids[0];assert.equal(profileChanges(p,ids).skipped.length,1);
});
test('every registered JS code executes exactly its fixed ID in Python',()=>{
 const script=`import importlib.util,json,sys
spec=importlib.util.spec_from_file_location("direct",sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
ids=m.load_codes(sys.argv[2]);d=m.DirectInput(ids);out=[];t=0
for seq in json.load(sys.stdin):
 for s in seq:
  vk=s["code"]+20
  assert d.down(vk,s["mods"],t,True)
  t+=.01
  consumed,cmd=d.up(vk,t,True)
  assert consumed
  if cmd:out.append(cmd)
  t+=.01
print(json.dumps(out))
`;
 const r=spawnSync(process.env.PYTHON||'python3',['-c',script,fileURLToPath(new URL('../addin/FusionMacroStudio/direct_codes.py',import.meta.url)),fileURLToPath(url)],{input:JSON.stringify(ids.map((_,i)=>directBinding(i).steps)),encoding:'utf8',maxBuffer:4*1024*1024});
 assert.ifError(r.error);assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),ids);
});
