const {app,BrowserWindow,protocol,net,ipcMain,dialog,Menu}=require('electron');
const {autoUpdater}=require('electron-updater');
const path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const {storage}=require('./storage.cjs');
const {readRelease,downloadRelease,compareVersion}=require('./addin-release.cjs');
const os=require('node:os');
const execute=promisify(execFile);
const ROOT=path.join(__dirname,'site'),URL='fms://editor/';
protocol.registerSchemesAsPrivileged([{scheme:'fms',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let win,installing=false,updateInstalling=false,updateState={state:'idle',current:app.getVersion(),latest:null,progress:0,error:''};
const home=path.join(process.env.LOCALAPPDATA||app.getPath('userData'),'FusionMacroStudio');
const local=storage(home);
const trusted=url=>{try{const u=new globalThis.URL(url);return u.protocol==='fms:'&&u.hostname==='editor'&&!u.port&&!u.username&&!u.password}catch{return false}};
const permitted=e=>e.sender===win?.webContents&&e.senderFrame===win.webContents.mainFrame&&trusted(e.senderFrame.url);
const target=d=>d.vendorId===0x514c&&d.productId===0x8842;
const sendUpdate=(data)=>{Object.assign(updateState,data);if(win&&!win.isDestroyed())win.webContents.send('fms:update-state',{...updateState})};
function fail(e){sendUpdate({state:'error',error:String(e.message||e)})}
autoUpdater.autoDownload=false;autoUpdater.autoInstallOnAppQuit=false;
autoUpdater.on('checking-for-update',()=>sendUpdate({state:'checking',error:''}));
autoUpdater.on('update-available',info=>sendUpdate({state:'available',latest:info.version,error:''}));
autoUpdater.on('update-not-available',info=>sendUpdate({state:'current',latest:info.version,error:''}));
autoUpdater.on('download-progress',p=>sendUpdate({state:'downloading',progress:Math.min(99,Math.round(p.percent))}));
autoUpdater.on('update-downloaded',info=>sendUpdate({state:'ready',latest:info.version,progress:100}));
autoUpdater.on('error',fail);
function addinPath(){return path.join(process.resourcesPath,'addin-package','setup.ps1')}
function bundledAddinVersion(){return JSON.parse(fs.readFileSync(path.join(process.resourcesPath,'addin-package','FusionMacroStudio','FusionMacroStudio.manifest'),'utf8').replace(/^\uFEFF/, '')).version}
async function ps(args,script=addinPath()){const exe=path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');return execute(exe,['-NoProfile','-ExecutionPolicy','Bypass','-File',script,...args],{windowsHide:true,encoding:'utf8',maxBuffer:1024*1024,timeout:1900000})}
async function addinStatus(){const {stdout}=await ps(['-DesktopStatus']);return JSON.parse(stdout.trim().replace(/^\uFEFF/,''))}
let release=null,addinInfo={state:'idle',current:undefined,latest:null,error:''};
function updateAddinStatus(s){
 const current=s.installed||null,latest=release?.version||null;
 addinInfo={current,latest,state:!latest?'idle':!s.ready?'unavailable':!current||compareVersion(current,latest)<0?'available':'current',error:''};
 return {...addinInfo};
}
async function addinUpdate(action){
 if(action==='status')return updateAddinStatus(await addinStatus());
 if(installing||updateInstalling)throw Error('다른 설치 작업이 진행 중입니다.');
 if(action==='check'){
  const s=await addinStatus();release=null;updateAddinStatus(s);
  try{release=await readRelease(net.fetch);return updateAddinStatus(s)}
  catch(e){return {...addinInfo,state:'error',error:e.message}}
 }
 if(action!=='install'||!release)throw Error('먼저 최신 버전을 확인하세요.');
 return manageAddin(false);
}
async function manageAddin(first=false){
 if(installing||updateInstalling)return {...addinInfo};
 installing=true;let temporary=null;
 try{
  const s=await addinStatus(),targetVersion=first?bundledAddinVersion():release.version;
  if(first&&s.installed)return updateAddinStatus(s);
  if(s.installed&&compareVersion(s.installed,targetVersion)>=0)return updateAddinStatus(s);
  if(!s.ready){if(!first)await dialog.showMessageBox(win,{type:'info',message:'Fusion 설치 또는 초기 실행 후 애드인을 설치하세요.'});return updateAddinStatus(s)}
  const res=await dialog.showMessageBox(win,{type:'question',message:s.running?'Fusion이 실행 중입니다. 종료 후 애드인을 설치하시겠습니까?':'Fusion 애드인을 설치하시겠습니까?',detail:s.running?'작업물 저장 확인창에서 저장을 선택하세요.':(s.installed||'미설치')+' → '+targetVersion,buttons:['취소',s.running?'종료 후 설치':'설치'],defaultId:1,cancelId:0});
  if(res.response!==1)return updateAddinStatus(s);
  let installer=addinPath();
  if(!first&&targetVersion!==bundledAddinVersion()){
   temporary=await fs.promises.mkdtemp(path.join(os.tmpdir(),'fms-addin-'));
   const archive=path.join(temporary,'release.zip'),out=path.join(temporary,'package');
   await downloadRelease(net.fetch,release,archive);
   await ps(['-Archive',archive,'-Destination',out,'-ExpectedVersion',targetVersion],path.join(process.resourcesPath,'addin-package','prepare-release.ps1'));
   installer=path.join(out,'setup.ps1');
  }
  const {stdout}=await ps(['-DesktopInstall',...(s.running?['-RequestClose','-RestartFusion']:[])],installer);
  const result=JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
  const verified=await addinStatus();
  if(result.version!==targetVersion||verified.installed!==targetVersion)throw Error('애드인 설치 버전 검증 실패');
  await dialog.showMessageBox(win,{type:'info',message:'애드인 '+result.version+' 설치 완료',detail:result.restartError||''});
  return updateAddinStatus(verified);
 }catch(e){
  const error=String(e.stderr||e.message).slice(-2500);
  await dialog.showMessageBox(win,{type:'error',message:'애드인 설치/확인 실패',detail:error});
  return {...addinInfo,state:'error',error};
 }finally{if(temporary)await fs.promises.rm(temporary,{recursive:true,force:true}).catch(()=>{});installing=false}
}
async function createWindow(){
 protocol.handle('fms',req=>{
  if(!trusted(req.url))return new Response('Forbidden',{status:403});
  const u=new globalThis.URL(req.url),rel=decodeURIComponent(u.pathname).replace(/^\/+/, '')||'index.html',file=path.resolve(ROOT,rel);
  if(!file.startsWith(ROOT+path.sep))return new Response('Forbidden',{status:403});
  return net.fetch(pathToFileURL(file).href).then(r=>{const headers=new Headers(r.headers);headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");return new Response(r.body,{status:r.status,headers})});
 });
 win=new BrowserWindow({icon:path.join(__dirname,'assets','app-icon.png'),width:1480,height:1000,minWidth:900,minHeight:650,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 Menu.setApplicationMenu(null);
 const ses=win.webContents.session;
 ses.setPermissionCheckHandler((wc,permission,origin,details)=>permission==='hid'&&trusted(details.securityOrigin||origin));
 ses.setPermissionRequestHandler((wc,permission,callback,details)=>callback(permission==='hid'&&trusted(details.requestingUrl||wc.getURL())));
 ses.setDevicePermissionHandler(d=>d.deviceType==='hid'&&trusted(d.origin)&&target(d.device));
 ses.on('select-hid-device',async(e,details,callback)=>{
  e.preventDefault();const list=details.deviceList.filter(target);
  if(!trusted(win.webContents.getURL())||!list.length){callback('');return}
  if(list.length===1){callback(list[0].deviceId);return}
  try{const r=await dialog.showMessageBox(win,{message:'연결할 키보드를 선택하세요.',buttons:[...list.map((d,i)=>(d.productName||'키보드')+' '+(i+1)),'취소'],cancelId:list.length});callback(list[r.response]?.deviceId||'')}catch{callback('')}
 });
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(e,url)=>{if(!trusted(url))e.preventDefault()});
 win.on('close',e=>{if(installing){e.preventDefault();dialog.showMessageBox(win,{message:'애드인 설치가 진행 중입니다.'});}});
 ipcMain.handle('fms:api',async(e,route,body)=>{
  if(!permitted(e))throw Error('Forbidden');
  if(route==='knob-trace'){
   // Optional diagnostics only. No dependency for editing or updating.
   const status=await local('status');if(status.state!=='running')throw Error('Fusion을 실행하세요.');
   const r=await net.fetch('http://127.0.0.1:18472/api/knob-trace',{headers:{'X-FMS-Local':'1',Origin:'http://127.0.0.1:18472',...(body?{'Content-Type':'application/json'}:{})},...(body?{method:'POST',body:JSON.stringify({start:true})}:{})});
   if(!r.ok)throw Error('진단 연결 실패');return r.json();
  }
  return local(route,body);
 });
 ipcMain.handle('fms:addin-update',(e,action)=>{if(!permitted(e))throw Error('Forbidden');return addinUpdate(action)});
 ipcMain.handle('fms:update',async(e,action)=>{
  if(!permitted(e))throw Error('Forbidden');
  try{
   if(action==='check'&&!installing&&!['checking','downloading','ready'].includes(updateState.state))await autoUpdater.checkForUpdates();
   else if(action==='download'&&updateState.state==='available'&&!installing){sendUpdate({state:'downloading',progress:0});await autoUpdater.downloadUpdate()}
   else if(action==='install'&&updateState.state==='ready'&&!installing){updateInstalling=true;autoUpdater.quitAndInstall(false,true)}
   else if(action!=='status')throw Error('현재 업데이트 작업을 완료하세요.');
  }catch(e){fail(e)}return {...updateState};
 });
 await win.loadURL(URL);
 if(app.isPackaged)await manageAddin(true);
}
if(!app.requestSingleInstanceLock())app.quit();
else{app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus()}});app.whenReady().then(createWindow).catch(e=>{dialog.showErrorBox('Fusion Macro Studio',String(e.stack||e));app.quit()});app.on('window-all-closed',()=>app.quit())}
