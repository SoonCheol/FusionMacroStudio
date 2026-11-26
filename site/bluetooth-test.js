import {Keypad} from './protocol.js';
import {setupBluetoothWizard} from './bluetooth-wizard.js';
const log=s=>{document.getElementById('standaloneLog').textContent+=s+'\n'};
const device=new Keypad(log);
navigator.hid?.addEventListener('disconnect',e=>{if(e.device===device.dev)device.verified=false});
setupBluetoothWizard({device,ready:()=>true,layer:()=>0,profile:()=>null,onChange:()=>{},log,kind:new URLSearchParams(location.search).get('phase')==='2'?'alphabet':'combined'});
if(!document.getElementById('bluetoothWizard').open)document.getElementById('bluetoothWizardOpen').click();