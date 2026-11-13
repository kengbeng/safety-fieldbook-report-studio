const KEY='sfbr-tutorial-v1';
const LAST_STEP=9;
export function readTutorial(storage){try{
 const value=JSON.parse(storage.getItem(KEY));
 if(!value||!Number.isInteger(value.step)||value.step<0||value.step>(value.version===2?LAST_STEP:7))return null;
 if(value.version!==2)value.step=({3:4,4:6,5:7,6:8,7:9})[value.step]??value.step;
 return {...value,version:2};
}catch{return null;}}
export function saveTutorial(storage,value){try{storage.setItem(KEY,JSON.stringify({...value,version:2}));}catch{}}
export function tutorialStep(step,direction){return Math.max(0,Math.min(LAST_STEP,step+direction));}
export function startTutorial({storage,createSample}={}){
 if(!storage)try{storage=window.localStorage;}catch{}
 const $=id=>document.getElementById(id),panel=$('tutorial');let progress=readTutorial(storage),active=!!progress&&!progress.done&&!progress.paused,step=progress?.step||0,collapsed=false,awaiting='',target=null,last='',queued=false,exported=false,backed=false;
 const steps=[
 ['Choose your starting point','Use your own Safety Fieldbook ZIPs, or explore a separate fictional sample report with two illustration images.','You can skip this walkthrough and return through Help.','newReport'],
 ['Create or open a report','Create a report and give it a title, or open a saved report. One report can combine inspections from different dates.','Show me minimises this guide so you can work.','newReport'],
 ['Add inspection records','Add one or more Safety Fieldbook ZIPs, or drag them into the upload area. You can also add a finding manually.','Already have findings? Choose Next for optional AI setup, then review them.','importArea'],
 ['Optional: connect AI','Open AI Settings. Use Get an API key to create a key on the OpenAI Platform, then paste it into the masked field and choose Connect. API usage is billed separately from a ChatGPT subscription.','No key is needed for manual reporting. The key stays only in this tab; refresh or Disconnect removes it. GPT-6 Luna is the default model. Turn off Include finding photos if you want text only.','openAISettings'],
 ['Edit a finding','Open a finding to review its observation, recommended action and photographs. Drag the grip to reorder it.','With AI connected, the sparkle icon drafts this finding. Improve findings in the findings toolbar updates included findings directly after confirmation, with saved batch Undo. Save changes commits it and Cancel discards it.','findings'],
 ['Review report details and summary','Open Edit report details to check the title, inspectors and other report information. Write a summary manually, or use Draft executive summary after reviewing the included findings.','AI summaries send included finding text, not photos. Review and edit the draft, then Save changes; Cancel discards it. AI generation incurs API usage.','editReportDetails'],
 ['Preview and download','Choose Word, PDF or PowerPoint. Export options controls the layout and report fields.','Download a report, or continue without downloading.','preview'],
 ['Keep an editable backup','Reports save automatically in this browser. A project backup includes edits and photographs so you can restore your work or move devices.','Word, PDF and PowerPoint exports are separate from a project backup.','backupReport'],
 ['Optional: install the app','Install for quick access. The browser version can also work offline once the footer says Ready for offline use.','Reports remain in this browser. Keep project backups even after installation.','installApp'],
 ['You’re ready','You can import inspections, review findings, prepare report details and export reports. AI is optional. Return to Help whenever you need guidance.','Keep an editable project backup of important work.','review']];
 const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||$('installApp').dataset.state==='installed';
 const editor=()=>!$('editor').hidden,hasRows=()=>!!$('findings').querySelector('[data-row]');
 function persist(done=false){progress={step,done,paused:!active&&!done};saveTutorial(storage,progress);}
 function go(next){step=next;awaiting='';collapsed=false;persist();last='';render();$('tutorialHeading').focus({preventScroll:true});}
 function finish(){active=false;persist(true);last='';render();}
 function minimise(){collapsed=true;last='';render();target?.scrollIntoView({block:'center',behavior:'auto'});}
 function ensureReport(){if(editor())return true;$('tutorialHint').textContent='Open or create a report first. Choose Show me to find your saved reports.';return false;}
 function inline(dialog,id,text,action){let tip=$(id);if(!tip){tip=document.createElement('section');tip.id=id;tip.className='tutorial-inline';const label=document.createElement('strong');label.textContent='Getting started';const copy=document.createElement('p');copy.textContent=text;tip.append(label,copy);if(action){const button=document.createElement('button');button.type='button';button.className='button secondary';button.onclick=()=>{$('close').click();go(7);};tip.append(button);}dialog.insertBefore(tip,dialog.id==='reportDetailsDialog'?dialog.firstChild:dialog.children[1]||null);}tip.hidden=!active||((id==='tutorialFindingTip'&&step!==4)||(id==='tutorialExportTip'&&step!==6)||(id==='tutorialAITip'&&step!==3)||(id==='tutorialDetailsTip'&&step!==5));const button=tip.querySelector('button');if(button){button.textContent=exported?'Continue after download':'Continue without downloading';button.disabled=$('close').disabled;}}
 function render(){queued=false;
  if(active&&awaiting==='report'&&editor()){go(hasRows()?3:2);return;}
  if(active&&awaiting==='findings'&&editor()&&hasRows()){go(3);return;}
  const modal=document.querySelector('dialog[open]'),signature=[active,step,collapsed,modal?.id,editor(),hasRows(),installed(),exported,backed,$('close').disabled,$('installApp').dataset.state].join('|');if(signature===last)return;last=signature;
  target?.classList.remove('tutorial-target');target=null;
  inline($('findingDialog'),'tutorialFindingTip','Review the observation, corrective action and photographs. If AI is connected, the sparkle icon drafts all three wording fields; review the result and use Undo/Redo if needed. Click a photo to crop, rotate or annotate it. Save changes to apply edits, or Cancel to keep the previous finding.');
  inline($('aiSettingsDialog'),'tutorialAITip','AI is optional. Get an API key opens the OpenAI Platform. Paste your key, choose Connect, then keep GPT-6 Luna or choose another model and whether to include finding photos. API generation is billed to your OpenAI account. The key stays in this tab only. Choose Done to return to the guide.');
  inline($('reportDetailsDialog'),'tutorialDetailsTip','Check report details after reviewing findings. Write the summary manually or use Draft executive summary with a connected key. Review the text, then Save changes to keep it or Cancel to discard it.');
  inline($('reportDialog'),'tutorialExportTip','Choose a format, review Export options, then Download report. You can continue without downloading.',true);
  $('resumeTutorial').hidden=!progress||progress.done===true;panel.hidden=!active||!!modal;$('tutorialChip').hidden=!active||!collapsed||!!modal;if(!active)return;
  const resuming=!editor()&&step>1&&step<8,data=resuming?['Continue your report','Open a saved report to continue from where you left off.','Choose Show me to find your saved reports.','reportsList']:steps[step];
  panel.classList.toggle('is-minimised',collapsed);$('tutorialHeading').textContent=data[0];$('tutorialText').textContent=step===8&&installed()?'This app is already installed. You can continue to finish the walkthrough.':data[1];$('tutorialHint').textContent=step===7&&backed?'Backup download started. Check your browser downloads.':data[2];$('tutorialProgress').textContent=step===0?'Getting started':step===9?'Complete':'Step '+step+' of 8';
  $('tutorialOwn').hidden=step!==0;$('tutorialSample').hidden=step!==0||!createSample;$('tutorialBack').hidden=step===0;$('tutorialNext').hidden=step===0;$('tutorialNext').disabled=false;$('tutorialNext').textContent=step===9?'Finish':step===8?(installed()?'Finish walkthrough':'Maybe later'):step===3?'Skip AI setup':step===6?'Continue without downloading':step===7?'Continue':'Next';
  $('tutorialAction').hidden=step===0||step===9;$('tutorialAction').textContent=resuming?'Show me':({1:'Show me',2:'Add ZIPs',3:'Open AI Settings',4:'Open a finding',5:'Edit report details',6:'Open preview',7:'Back up now',8:installed()?'App information':'Install app'})[step];
  if(!modal){target=$(data[3]);if(target&&!target.hidden)target.classList.add('tutorial-target');}
  $('resumeTutorial').hidden=!progress||progress.done===true;
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(render);}}
 $('tutorialOwn').onclick=()=>{go(editor()?2:1);if(!editor()){$('newReport').click();awaiting='report';}else minimise();};
 $('tutorialSample').onclick=async()=>{const button=$('tutorialSample');button.disabled=true;try{await createSample();go(3);$('tutorialHint').textContent='ZIP import was skipped. This separate sample uses fictional illustration images.';}catch(error){$('tutorialHint').textContent='Could not create sample: '+error.message;}finally{button.disabled=false;}};
 $('tutorialAction').onclick=()=>{if(!editor()&&step>1&&step<8){awaiting='report';minimise();return;}if(step===1){awaiting='report';minimise();return;}if(step===2){awaiting='findings';minimise();$('addInspectionFiles').click();}if(step===3){collapsed=true;$('openAISettings').click();schedule();}if(step===4){minimise();const open=$('findings').querySelector('[data-edit-finding]');if(open)open.click();else $('add').click();}if(step===5){collapsed=true;$('editReportDetails').click();schedule();}if(step===6){collapsed=true;$('preview').click();schedule();}if(step===7){$('backupReport').click();minimise();}if(step===8){if(installed()||$('installApp').dataset.state==='update')$('installHelpDialog').showModal();else $('installApp').click();}};
 $('tutorialNext').onclick=()=>{if(step===9){finish();return;}if(step===8){go(9);return;}if(step>0&&step<8&&!ensureReport())return;if(step===2&&!hasRows()){$('tutorialHint').textContent='Add ZIPs or a manual finding, or use Back to choose the sample report.';return;}go(tutorialStep(step,1));};
 $('tutorialBack').onclick=()=>go(tutorialStep(step,-1));$('skipTutorial').onclick=()=>{active=false;persist();last='';render();};$('tutorialMinimise').onclick=minimise;$('tutorialChip').onclick=()=>{collapsed=false;last='';render();$('tutorialHeading').focus();};
 $('restartTutorial').onclick=()=>{$('userHelpDialog').close();active=true;go(0);};$('resumeTutorial').onclick=()=>{$('userHelpDialog').close();active=true;collapsed=false;last='';render();};
 document.addEventListener('report-export-started',()=>{exported=true;last='';render();});document.addEventListener('project-backup-started',()=>{backed=true;last='';render();});
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','data-state','disabled']});
 if(!progress&&!document.querySelector('#reportsList .saved-report')){active=true;persist();}render();
}
