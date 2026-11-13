export async function startPWA({prepareUpdate}){
 const $=id=>document.getElementById(id),button=$('installApp'),label=$('appControlLabel'),status=$('offlineState'),notice=$('offlineNotice');let prompt=null,registration=null,detected=false,applying=false,ready=false,updateTimer=null,updateRequested=false,reloading=false,reloadReady=false,checking=false;
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const note=text=>{$('installMessage').textContent=text;$('dialogUpdateMessage').textContent=text;};
 function installation(){const yes=detected||standalone(),waiting=!!registration?.waiting;label.textContent=applying?'Updating…':reloadReady?'Update ready':waiting?'Update available':yes?'Installed':'Install app';button.disabled=applying;button.title=reloadReady?'Save your work and reload the updated app':waiting?'Save your work and apply the available app update':yes?'App installed. View app information and check for updates':'Install Report Studio';button.dataset.state=applying?'updating':reloadReady?'update':waiting?'update':yes?'installed':'install';const dialogButton=$('checkAppUpdate');dialogButton.textContent=applying?'Updating…':checking?'Checking…':reloadReady?'Reload updated app':waiting?'Update now':'Check for updates';dialogButton.disabled=applying||checking;}
 function connectivity(){status.textContent=ready?(navigator.onLine?'Ready for offline use':'Offline · saved reports and local tools available'):(navigator.onLine?'Preparing offline access…':'Offline access is not ready in this browser.');notice.hidden=navigator.onLine||ready;notice.textContent=ready?'You are offline. Reports are saved in this browser; local imports, editing and exports remain available.':'You are offline. Reconnect once to prepare offline access.';}
 async function ask(worker){return new Promise((resolve,reject)=>{if(!worker){reject(Error('The app is still preparing offline access. Close and reopen it, then try updating again.'));return;}
   const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(Error('Could not confirm offline readiness. Please reopen the app and try again.'));},4000);channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};try{worker.postMessage({type:'STATUS'},[channel.port2]);}catch{clearTimeout(timer);channel.port1.close();reject(Error('The app connection changed. Please reopen the app and try updating again.'));}});}
 async function readiness(){if(!registration?.active)return;try{ready=!!(await ask(registration.active)).ready;connectivity();}catch{status.textContent='Offline readiness could not be confirmed.';notice.hidden=false;notice.textContent='Offline readiness could not be confirmed. Reconnect and reopen the app to try again.';}}
 function pending(){installation();}
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;detected=false;installation();});
 window.addEventListener('appinstalled',()=>{detected=true;prompt=null;installation();note('Installed. Open Report Studio from your device’s apps.');});
 matchMedia('(display-mode: standalone)').addEventListener('change',installation);
 button.onclick=async()=>{if(applying)return;if(reloadReady){await finishUpdate();return;}if(registration?.waiting){await applyUpdate();return;}if(detected||standalone()){$('installHelpDialog').showModal();return;}if(prompt){const current=prompt;prompt=null;try{await current.prompt();}catch{note('The browser install prompt is unavailable. Use the installation instructions.');$('installHelpDialog').showModal();return;}const result=await current.userChoice;if(result.outcome==='accepted')note('Installation requested. Your browser will confirm when it is installed.');else note('Installation cancelled. You can still use the browser version.');}else $('installHelpDialog').showModal();};
 $('closeInstallHelp').onclick=()=>$('installHelpDialog').close();
 $('checkAppUpdate').onclick=async()=>{
  if(applying||checking)return;
  if(reloadReady){await finishUpdate();return;}
  if(registration?.waiting){await applyUpdate();return;}
  if(!registration||!navigator.onLine){note('Connect to the internet to check for updates.');return;}
  checking=true;installation();note('Checking for updates…');
  try{await registration.update();note(registration.waiting?'Update available. Choose Update now to save your work and update.':'Update check requested. If a new version is found, this button will change to Update now when it is ready.');}
  catch{note('Could not check for updates. Try again when connected.');}
  finally{checking=false;pending();}
 };
 function showInfo(){if(!$('installHelpDialog').open)$('installHelpDialog').showModal();}
 async function finishUpdate(){if(!updateRequested||reloading)return;reloading=true;clearTimeout(updateTimer);try{
  // A delayed activation may arrive after the user has resumed editing.
  if(!applying){if($('installHelpDialog').open)$('installHelpDialog').close();await prepareUpdate();}
  try{sessionStorage.setItem('sfbr-update-complete','1');}catch{}
  location.reload();
 }catch(error){reloading=false;applying=false;reloadReady=true;installation();note('Update ready. '+error.message+' Then choose Update ready.');showInfo();}}
 async function applyUpdate(){if(applying||!registration?.waiting)return;applying=true;installation();note('Saving work and preparing update…');try{
  if($('installHelpDialog').open)$('installHelpDialog').close();
  await prepareUpdate();const info=await ask(registration.active);
  if(info.windows>1)throw Error('Close other Report Studio tabs and app windows, then try updating again.');
  const worker=registration.waiting;if(!worker)throw Error('The update is no longer waiting. Reload when your work is saved.');
  updateRequested=true;reloadReady=false;
  worker.addEventListener?.('statechange',()=>{if(worker.state==='activated')return finishUpdate();if(worker.state==='redundant'){clearTimeout(updateTimer);updateRequested=false;applying=false;installation();note('The update could not be applied. Check for updates and try again.');showInfo();}});
  note('Applying update… The app will reload automatically.');
  updateTimer=setTimeout(()=>{if(worker.state==='activated'){finishUpdate();return;}applying=false;installation();note('The update is taking longer than expected. It will reload when ready; keep open edits saved.');showInfo();},12000);updateTimer.unref?.();
  worker.postMessage({type:'ACTIVATE_UPDATE'});
 }catch(error){clearTimeout(updateTimer);updateRequested=false;applying=false;installation();note(error.message);showInfo();}}
 window.addEventListener('online',()=>{connectivity();registration?.update().catch(()=>{});});window.addEventListener('offline',connectivity);
 installation();connectivity();try{if(sessionStorage.getItem('sfbr-update-complete')){sessionStorage.removeItem('sfbr-update-complete');note('App updated successfully. Your saved reports are ready.');}}catch{}
 if(navigator.getInstalledRelatedApps)try{const related=await navigator.getInstalledRelatedApps();detected=related.some(app=>app.platform==='webapp'&&new URL(app.url,location.href).origin===location.origin);installation();}catch{}
 if(!('serviceWorker' in navigator)||!isSecureContext){status.textContent='Offline installation is unavailable in this browser. Use a supported browser over HTTPS.';return;}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updateRequested)return finishUpdate();readiness();pending();});
 try{registration=await navigator.serviceWorker.getRegistration('./');if(!registration)registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});pending();await readiness();registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){pending();readiness();}if(worker.state==='redundant'&&!ready)status.textContent='Offline setup did not complete. Reconnect and reopen the app to try again.';});});navigator.serviceWorker.ready.then(()=>readiness());if(navigator.onLine)registration.update().catch(()=>{});}
 catch{status.textContent='Offline setup is unavailable here. Try opening the site in a full browser while online.';}
}
