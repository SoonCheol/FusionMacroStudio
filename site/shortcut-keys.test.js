import test from 'node:test';
import assert from 'node:assert/strict';
import {GROUPS,captureShortcut,shortcutBinding,shortcutLabel,shortcutIssue} from './shortcut-keys.js';
import {reports,readBinding,sameBinding,blank,profileChanges} from './protocol.js';
test('unique HID catalog; keyboard and selection preserve physical key identities',()=>{
 const keys=GROUPS.flatMap(g=>g.keys);
 assert.equal(new Set(keys.map(k=>k.usage)).size,keys.length);
 for(const k of keys){assert.deepEqual(captureShortcut({code:k.code,ctrlKey:true,altKey:true}),{mods:5,code:k.usage});}
 assert.equal(shortcutLabel(7,6),'Ctrl + Alt + Shift + C');
 assert.equal(captureShortcut({code:'NumpadEnter'}).code,88);
 assert.equal(captureShortcut({code:'Digit0'}).code,39);
 assert.equal(captureShortcut({code:'KeyC',isComposing:true}),null);
});
test('ordinary shortcuts preserve HID write and profile restore',()=>{
 for(const [mods,code] of [[1,6],[5,43],[8,22],[2,56],[0,76],[0,88]]){
  const b=shortcutBinding(mods,code),raw=reports(2,12,b)[0];raw[0]=250;
  assert.ok(sameBinding(raw,b));assert.deepEqual(readBinding(raw).steps,b.steps);
  const p=blank();p.layers[2].bindings[12]=b;
  assert.deepEqual(profileChanges(p).changes,[{layer:2,slot:12,binding:b}]);
 }
 assert.throws(()=>shortcutBinding(7,61));assert.throws(()=>shortcutBinding(1,115));
 assert.equal(shortcutIssue(7,6),'');
});
