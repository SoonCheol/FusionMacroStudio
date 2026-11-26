import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {CAPACITY,validateCodes,directBinding,directIndex,commandBinding,FAST_CAMERA,HOLD_MARKERS,KNOB_MARKERS,pairBinding,pairInfo,COMMON_CAMERA,COMMON_CAPACITY,commonCommandBinding,commonPairBinding} from './direct-codes.js';
import {reports,readBinding,sameBinding,blank,profileChanges} from './protocol.js';
const url=new URL('./data/command-codes.json',import.meta.url),ids=validateCodes(JSON.parse(readFileSync(url,'utf8')));
test('fixed registry, all 14641 code payloads roundtrip and no legacy modifiers',()=>{
 const seen=new Set();
 for(let i=0;i<CAPACITY;i++){const b=directBinding(i),r=reports(0,1,b)[0];r[0]=250;assert.equal(directIndex(readBinding(r)),i);assert.ok(sameBinding(r,b));assert.ok(b.steps.every(s=>s.mods===1));seen.add(JSON.stringify(b))}
 assert.equal(seen.size,CAPACITY);assert.equal(ids.length,1238);
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

test('short camera and held markers roundtrip',()=>{
 for(const id of [...FAST_CAMERA,...HOLD_MARKERS]){const i=ids.indexOf(id),b=commandBinding(i,ids),r=reports(0,17,b)[0];r[0]=250;assert.equal(directIndex(readBinding(r),ids),i);assert.ok(sameBinding(r,b));const p=blank();p.layers[0].bindings[17]=b;p.layers[0].fusion[17]={id,name:id};assert.deepEqual(profileChanges(p,ids).changes,[{layer:0,slot:17,binding:b}]);}
});

test('independent camera pair roundtrip and restore',()=>{
 for(let k=0;k<3;k++)for(const normal of [...FAST_CAMERA,null])for(const held of [...FAST_CAMERA,null]){const b=pairBinding(k,normal,held),slot=16+3*k,r=reports(0,slot,b)[0];r[0]=250;assert.deepEqual(pairInfo(readBinding(r)),{knob:k,normal,held});const p=blank();p.layers[0].bindings[slot]=b;if(normal)p.layers[0].fusion[slot]={id:normal,name:normal};assert.deepEqual(profileChanges(p,ids).changes,[{layer:0,slot,binding:b}]);}
});

test('extended pair preserves arbitrary fixed commands and camera pair remains short',()=>{
 const normal='DrawPolyline',held='__fms_pivot_origin__';assert.ok(ids.includes(normal));const b=pairBinding(1,normal,held,ids);assert.equal(b.steps.length,14);const raw=reports(1,19,b)[0];raw[0]=250;assert.deepEqual(pairInfo(readBinding(raw),ids),{knob:1,normal,held});const p=blank();p.layers[1].bindings[19]=b;p.layers[1].fusion[19]={id:normal,name:normal};assert.deepEqual(profileChanges(p,ids).changes,[{layer:1,slot:19,binding:b}]);assert.equal(pairBinding(1,'__fms_orbit_left__','__fms_pan_up__',ids).steps.length,4);
});

test('explicit orbit mode variants retain registry identity in direct and paired writes',()=>{for(const direction of ['down','left','right','up'])for(const mode of ['constrained','free']){const id='__fms_orbit_'+direction+'_'+mode+'__',i=ids.indexOf(id);assert.ok(i>=1230);const b=commandBinding(i,ids);assert.equal(directIndex(b,ids),i);const pair=pairBinding(2,id,'__fms_pan_left__',ids);assert.deepEqual(pairInfo(pair,ids),{knob:2,normal:id,held:'__fms_pan_left__'});assert.ok(pair.steps.length<=18)}});

test('common codes preserve registry and roundtrip through HID and Python',()=>{
 const vectors=[],add=(b,id)=>vectors.push({steps:b.steps,id});
 for(let i=0;i<ids.length;i++){
  const b=commonCommandBinding(i,ids),raw=reports(0,1,b)[0];raw[0]=250;assert.equal(directIndex(readBinding(raw),ids),i);assert.ok(sameBinding(raw,b));
  if(![...HOLD_MARKERS,...KNOB_MARKERS].includes(ids[i])){assert.ok(b.steps.every(s=>s.mods===7));add(b,ids[i]);}
 }
 for(let k=0;k<3;k++)for(const normal of [...COMMON_CAMERA,null])for(const held of [...COMMON_CAMERA,null]){
  const b=commonPairBinding(k,normal,held,ids);assert.deepEqual(pairInfo(b,ids),{knob:k,normal,held});assert.equal(b.steps.length,5);add(b,normal);
 }
 const b=commonPairBinding(1,'DrawPolyline','__fms_pivot_origin__',ids);assert.equal(b.steps.length,12);assert.deepEqual(pairInfo(b,ids),{knob:1,normal:'DrawPolyline',held:'__fms_pivot_origin__'});add(b,'DrawPolyline');
 const script=`import importlib.util,json,sys
spec=importlib.util.spec_from_file_location("direct",sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
ids=m.load_codes(sys.argv[2]);d=m.DirectInput(ids);t=0
def tap(s):
 global t
 c=s["code"];v=c+54 if 58<=c<=63 else 48 if c==39 else c+19
 assert d.down(v,s["mods"],t,True),(v,s)
 t+=.01
 consumed,cmd=d.up(v,t,True)
 t+=.01
 assert consumed
 return cmd
for x in json.load(sys.stdin):
 out=[cmd for s in x["steps"] if (cmd:=tap(s)) is not None]
 assert out==([x["id"]] if x["id"] else []),(x,out)
print("OK")
`;
 const r=spawnSync(process.env.PYTHON||'python3',['-c',script,fileURLToPath(new URL('../addin/FusionMacroStudio/direct_codes.py',import.meta.url)),fileURLToPath(url)],{input:JSON.stringify(vectors),encoding:'utf8',maxBuffer:4*1024*1024});
 assert.ifError(r.error);assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),'OK');
});
