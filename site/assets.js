// Browser-local assets only. No upload or network transport.
let opening;
function db(){if(!opening)opening=new Promise((ok,no)=>{const r=indexedDB.open('fusion-macro-studio-assets-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('assets',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});return opening}
export async function putAsset(item){const d=await db();return new Promise((ok,no)=>{const t=d.transaction('assets','readwrite');t.objectStore('assets').put(item);t.oncomplete=()=>ok();t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)})}
export async function loadAssets(){const d=await db();return new Promise((ok,no)=>{const r=d.transaction('assets','readonly').objectStore('assets').getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
