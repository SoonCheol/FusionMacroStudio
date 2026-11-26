const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('fmsDesktop',{
 api:(route,body)=>ipcRenderer.invoke('fms:api',route,body),
 addinUpdate:action=>ipcRenderer.invoke('fms:addin-update',action),
 update:action=>ipcRenderer.invoke('fms:update',action),
 onUpdate:fn=>{ipcRenderer.on('fms:update-state',(_event,data)=>fn(data))}
});
