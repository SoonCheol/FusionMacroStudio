const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('fmsDesktop',{
 api:(route,body)=>ipcRenderer.invoke('fms:api',route,body),
 manageAddin:()=>ipcRenderer.invoke('fms:addin'),
 update:action=>ipcRenderer.invoke('fms:update',action),
 onUpdate:fn=>{ipcRenderer.on('fms:update-state',(_event,data)=>fn(data))}
});
