const KEY='sfbr-tutorial-v1';
export function readTutorial(storage){try{const value=JSON.parse(storage.getItem(KEY));return value&&Number.isInteger(value.step)&&value.step>=0&&value.step<=7?value:null;}catch{return null;}}
export function saveTutorial(storage,value){try{storage.setItem(KEY,JSON.stringify(value));}catch{}}
export function tutorialStep(step,direction){return Math.max(0,Math.min(7,step+direction));}
export function startTutorial({storage,createSample}={}){
 if(!storage)try{storage=window.localStorage;}catch{}
 const $=id=>document.getElementById(id),panel=$('tutorial');let progress=readTutorial(storage),active=!!progress&&!progress.done&&!progress.paused,step=progress?.step||0,collapsed=false,awaiting='',target=null,last='',queued=false,exported=false,backed=false;
 const steps=[
 ['Choose your starting point','Use your own Safety Fieldbook ZIPs, or explore a separate fictional sample report with two illustration images.','You can skip this walkthrough and return through Help.','newReport'],
 ['Create or open a report','Create a report and give it a title, or open a saved report. One report can combine inspections from different dates.','Show me minimises this guide so you can work.','newReport'],
 ['Add inspection records','Add one or more Safety Fieldbook ZIPs, or drag them into the upload area. You can also add a finding manually.','Already have findings? Choose Next to review them.','importArea'],
 ['Edit a finding','Open a finding to review its observation, recommended action and photographs. Drag the grip to reorder it.','The sample skipped ZIP import. Its images are fictional illustrations, not inspection evidence.','findings'],
 ['Preview and download','Choose Word, PDF or PowerPoint. Export options controls the layout and report fields.','Download a report, or continue without downloading.','preview'],
 ['Keep an editable backup','Reports save automatically in this browser. A project backup includes edits and photographs so you can restore your work or move devices.','Word, PDF and PowerPoint exports are separate from a project backup.','backupReport'],
 ['Optional: install the app','Install for quick access. The browser version can also work offline once the footer says Ready for offline use.','Reports remain in this browser. Keep project backups even after installation.','installApp'],
 ['You’re ready','You can import inspections, edit findings and photographs, and export reports. Return to Help whenever you need guidance.','Keep an editable project backup of important work.','review']];
 const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||$('installApp').dataset.state==='installed';
 const editor=()=>!$('editor').hidden,hasRows=()=>!!$('findings').querySelector('.card,.finding-table tbody tr');
 function persist(done=false){progress={step,done,paused:!active&&!done};saveTutorial(storage,progress);}
 function go(next){step=next;awaiting='';collapsed=false;persist();last='';render();$('tutorialHeading').focus({preventScroll:true});}
 function finish(){active=false;persist(true);last='';render();}
 function minimise(){collapsed=true;last='';render();target?.scrollIntoView({block:'center',behavior:'auto'});}
 function ensureReport(){if(editor())return true;$('tutorialHint').textContent='Open or create a report first. Choose Show me to find your saved reports.';return false;}
 function inline(dialog,id,text,action){let tip=$(id);if(!tip){tip=document.createElement('section');tip.id=id;tip.className='tutorial-inline';const label=document.createElement('strong');label.textContent='Getting started';const copy=document.createElement('p');copy.textContent=text;tip.append(label,copy);if(action){const button=document.createElement('button');button.type='button';button.className='button secondary';button.onclick=()=>{$('close').click();go(5);};tip.append(button);}dialog.insertBefore(tip,dialog.children[1]||null);}tip.hidden=!active||((id==='tutorialFindingTip'&&step!==3)||(id==='tutorialExportTip'&&step!==4));const button=tip.querySelector('button');if(button){button.textContent=exported?'Continue after download':'Continue without downloading';button.disabled=$('close').disabled;}}
 function render(){queued=false;
  if(active&&awaiting==='report'&&editor()){go(hasRows()?3:2);return;}
  if(active&&awaiting==='findings'&&editor()&&hasRows()){go(3);return;}
  const modal=document.querySelector('dialog[open]'),signature=[active,step,collapsed,modal?.id,editor(),hasRows(),installed(),exported,backed,$('close').disabled,$('installApp').dataset.state].join('|');if(signature===last)return;last=signature;
  target?.classList.remove('tutorial-target');target=null;
  inline($('findingDialog'),'tutorialFindingTip','Review the wording on the left and photographs on the right. Click a photo to crop, rotate or annotate it. Save changes to apply edits, or Cancel to keep the previous finding.');
  inline($('reportDialog'),'tutorialExportTip','Choose a format, review Export options, then Download report. You can continue without downloading.',true);
  $('resumeTutorial').hidden=!progress||progress.done===true;panel.hidden=!active||!!modal;$('tutorialChip').hidden=!active||!collapsed||!!modal;if(!active)return;
  const resuming=!editor()&&step>1&&step<6,data=resuming?['Continue your report','Open a saved report to continue from where you left off.','Choose Show me to find your saved reports.','reportsList']:steps[step];
  panel.classList.toggle('is-minimised',collapsed);$('tutorialHeading').textContent=data[0];$('tutorialText').textContent=step===6&&installed()?'This app is already installed. You can continue to finish the walkthrough.':data[1];$('tutorialHint').textContent=step===5&&backed?'Backup download started. Check your browser downloads.':step===3? 'Save or cancel edits, then choose Next. You can revisit earlier tips using Back.':data[2];$('tutorialProgress').textContent=step===0?'Getting started':step===7?'Complete':'Step '+step+' of 6';
  $('tutorialOwn').hidden=step!==0;$('tutorialSample').hidden=step!==0||!createSample;$('tutorialBack').hidden=step===0;$('tutorialNext').hidden=step===0;$('tutorialNext').disabled=false;$('tutorialNext').textContent=step===7?'Finish':step===6?(installed()?'Finish walkthrough':'Maybe later'):step===4?'Continue without downloading':step===5?'Continue':'Next';
  $('tutorialAction').hidden=step===0||step===7;$('tutorialAction').textContent=resuming?'Show me':({1:'Show me',2:'Add ZIPs',3:'Open a finding',4:'Open preview',5:'Back up now',6:installed()?'App information':'Install app'})[step];
  if(!modal){target=$(data[3]);if(target&&!target.hidden)target.classList.add('tutorial-target');}
  $('resumeTutorial').hidden=!progress||progress.done===true;
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(render);}}
 $('tutorialOwn').onclick=()=>{go(editor()?2:1);if(!editor()){$('newReport').click();awaiting='report';}else minimise();};
 $('tutorialSample').onclick=async()=>{const button=$('tutorialSample');button.disabled=true;try{await createSample();go(3);$('tutorialHint').textContent='ZIP import was skipped. This separate sample uses fictional illustration images.';}catch(error){$('tutorialHint').textContent='Could not create sample: '+error.message;}finally{button.disabled=false;}};
 $('tutorialAction').onclick=()=>{if(!editor()&&step>1&&step<6){awaiting='report';minimise();return;}if(step===1){awaiting='report';minimise();return;}if(step===2){awaiting='findings';minimise();$('addInspectionFiles').click();}if(step===3){minimise();const open=$('findings').querySelector('.finding-overview,.table-finding-title');if(open)open.click();else $('add').click();}if(step===4){collapsed=true;$('preview').click();schedule();}if(step===5){$('backupReport').click();minimise();}if(step===6){if(installed()||$('installApp').dataset.state==='update')$('installHelpDialog').showModal();else $('installApp').click();}};
 $('tutorialNext').onclick=()=>{if(step===7){finish();return;}if(step===6){go(7);return;}if(step>0&&step<6&&!ensureReport())return;if(step===2&&!hasRows()){$('tutorialHint').textContent='Add ZIPs or a manual finding, or use Back to choose the sample report.';return;}go(tutorialStep(step,1));};
 $('tutorialBack').onclick=()=>go(tutorialStep(step,-1));$('skipTutorial').onclick=()=>{active=false;persist();last='';render();};$('tutorialMinimise').onclick=minimise;$('tutorialChip').onclick=()=>{collapsed=false;last='';render();$('tutorialHeading').focus();};
 $('restartTutorial').onclick=()=>{$('userHelpDialog').close();active=true;go(0);};$('resumeTutorial').onclick=()=>{$('userHelpDialog').close();active=true;collapsed=false;last='';render();};
 document.addEventListener('report-export-started',()=>{exported=true;last='';render();});document.addEventListener('project-backup-started',()=>{backed=true;last='';render();});
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','data-state','disabled']});
 if(!progress&&!document.querySelector('#reportsList .saved-report')){active=true;persist();}render();
}
