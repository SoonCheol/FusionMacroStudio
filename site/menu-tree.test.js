import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
await import('./menu-tree.js');
const data=JSON.parse(fs.readFileSync(new URL('./data/menu.json',import.meta.url),'utf8'));
test('actual Fusion menu data resolves original command IDs',()=>{const commands=[...new Map(data.entries.map(x=>[x.id,x])).values()];const tree=globalThis.FusionMenuTree.fromMenuCatalog(data,commands);assert.equal(tree.length,9);const all=new Set(tree.flatMap(t=>[...t.children.values()].flatMap(p=>globalThis.FusionMenuTree.descendants(p).map(c=>c.id))));assert.ok(all.has('DrawPolyline'));assert.equal(all.size,326)});
