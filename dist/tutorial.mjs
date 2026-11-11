const KEY='sfbr-tutorial-v1';
export function readTutorial(storage){try{const value=JSON.parse(storage.getItem(KEY));return value&&Number.isInteger(value.step)&&value.step>=0&&value.step<=6?value:null;}catch{return null;}}
export function saveTutorial(storage,value){try{storage.setItem(KEY,JSON.stringify(value));}catch{}}
export function startTutorial({storage,createSample}={}){
 if(!storage)try{storage=window.localStorage;}catch{}
 const $=id=>document.getElementById(id),panel=$('tutorial');let progress=readTutorial(storage),active=!!progress&&!progress.done,step=progress?.step||0,previewSeen=false,last='',target=null,queued=false;
 const steps=[
 ['Welcome to Report Studio','Turn Safety Fieldbook ZIPs into Word, PDF or PowerPoint reports. This short walkthrough follows your work.','You can skip now and restart from Help.','newReport'],
 ['Create or open a report','Choose Create report and enter a title. One report can combine inspections from different dates. You can also edit a saved report.','Create a report or open an existing one to continue.','newReport'],
 ['Add your inspection records','Add one or more Safety Fieldbook ZIPs, or drag them into the upload area. Findings appear below after import.','No ZIP handy? Add a finding manually, or skip and return through Help.','importArea'],
 ['Review your findings','Click a finding to edit its wording and photographs. Drag its grip to change the report order. Cards, List and Table give different ways to review.','Save or cancel any open edits, then continue when you are ready.','findings'],
 ['Preview and export','Open Preview & export. Choose Word, PDF or PowerPoint, and use Export options to select the layout and fields recipients see.','Explore the preview, then choose Back to editing to continue this walkthrough.','preview'],
 ['Keep a project backup','Changes are saved automatically in this browser. Back up project downloads an editable copy with photographs, so you can restore your work or move devices.','Word, PDF and PowerPoint exports are separate from an editable project backup.','backupReport'],
 ['Keep Report Studio handy','Install the app for quick access. Installation is optional; the browser version can also work offline once the footer says Ready for offline use. Reports remain in this browser, so keep backups.','Choose Install app, or Maybe later.','installApp']];
 const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||$('installApp').dataset.state==='installed';
 function persist(done=false){saveTutorial(storage,{step,done});}
 function finish(){active=false;persist(true);last='';render();}
 function render(){queued=false;const editor=!$('editor').hidden,rows=!!$('findings').querySelector('.card,.finding-table tbody tr'),modal=!!document.querySelector('dialog[open]');
  if(active&&step===1&&editor){step=2;persist();}if(active&&step===2&&rows&&editor){step=3;persist();}
  if(active&&step===4&&$('reportDialog').open)previewSeen=true;
  if(active&&step===4&&previewSeen&&!$('reportDialog').open){step=5;persist();}
  if(active&&step===6&&installed()){finish();return;}
  const signature=[active,step,modal,editor,rows,$('installApp').dataset.state].join('|');if(signature===last)return;last=signature;
  target?.classList.remove('tutorial-target');target=null;panel.hidden=!active||modal;
  if(!active)return;const resuming=!editor&&step>1&&step<6,data=resuming?['Continue your report','Open a saved report to continue the walkthrough from where you left off.','Your tutorial progress has been saved.','reportsList']:steps[step];$('tutorialHeading').textContent=data[0];$('tutorialText').textContent=data[1];$('tutorialHint').textContent=data[2];$('tutorialProgress').textContent='Getting started · '+(step+1)+' of 7';
  $('tutorialInstall').hidden=step!==6;$('tutorialInstall').textContent=$('installApp').dataset.state==='update'?'App options':'Install app';$('tutorialSample').hidden=step!==0||!createSample;$('tutorialBack').hidden=step===0;$('tutorialNext').textContent=step===0?'Get started':step===6?'Maybe later':'Next';$('tutorialNext').disabled=resuming||[1,2,4].includes(step);
  if(!modal){target=$(data[3]);target?.classList.add('tutorial-target');}
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(render);}}
 $('tutorialSample').onclick=async()=>{const button=$('tutorialSample');button.disabled=true;try{await createSample();step=3;active=true;persist();last='';render();}catch(error){$('tutorialHint').textContent='Could not create the sample: '+error.message;}finally{button.disabled=false;}};
 $('tutorialInstall').onclick=()=>{if($('installApp').dataset.state==='update')$('installHelpDialog').showModal();else $('installApp').click();};
 $('skipTutorial').onclick=finish;
 $('tutorialBack').onclick=()=>{step=Math.max(0,step-1);previewSeen=false;persist();last='';render();};
 $('tutorialNext').onclick=()=>{if(step===6){finish();return;}step++;persist();last='';render();};
 $('restartTutorial').onclick=()=>{$('userHelpDialog').close();active=true;step=0;previewSeen=false;persist();last='';render();$('tutorialHeading').focus();};
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','data-state']});
 if(!progress&&!document.querySelector('#reportsList .saved-report')){active=true;persist();}render();
}
