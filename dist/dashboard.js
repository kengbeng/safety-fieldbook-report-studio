import {libraryLocations,sortLibrary} from './report-library.mjs';
import {displayDate} from './report-model.mjs?v=20261105-inspectors';
import {openProjectDB,readProjects,readProject,writeProject,stripURLs,inspectSnapshot,projectSummary,matchesProject,packProject,unpackProject} from './projects.mjs?v=20261105-pwa';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateTime=s=>new Intl.DateTimeFormat('en-SG',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Singapore'}).format(new Date(s));
const stamp=s=>JSON.stringify(s,(k,v)=>v instanceof Blob?{bytes:v.size,type:v.type}:v);
export async function startDashboard(bridge){
 let db=null,active=null,projects=[],timer=null,dirty=false,saving=null,loading=false,lastStamp='',generation=0,backing=false;
 const status=(message,error=false)=>{$('projectStatus').textContent=message;$('projectStatus').dataset.tone=error?'error':'info';};
 const savingState=s=>{$('saveState').textContent=s;$('saveReport').disabled=!!saving||bridge.busy();};
 function changed(){if(!active||loading||bridge.busy())return;const snapshot=bridge.capture();$('activeReportName').textContent=snapshot.fields.title||'Untitled inspection report';const current=stamp(snapshot);if(current===lastStamp)return;lastStamp=current;generation++;dirty=true;savingState('Unsaved changes');clearTimeout(timer);timer=setTimeout(()=>saveActive().catch(()=>{}),1000);}
 async function saveActive(){
  clearTimeout(timer);if(saving){await saving;if(dirty)return saveActive();return;}
  if(!active||!dirty)return;if(bridge.busy()){timer=setTimeout(()=>saveActive().catch(()=>{}),1000);throw Error('Wait for file processing to finish.');}if(!db){$('saveReport').hidden=false;savingState('Not saved on this device');throw Error('Device storage is unavailable. Download a project backup to keep your work.');}
  const snapshot=bridge.capture(),atGeneration=generation,record={id:active.id,createdAt:active.createdAt,updatedAt:new Date().toISOString(),title:snapshot.fields.title||'Untitled inspection report',preparedDate:snapshot.fields.preparedDate,...projectSummary(snapshot),snapshot};
  saving=(async()=>{$('saveReport').hidden=true;savingState('Saving on this device…');try{const revision=await writeProject(db,record,active.revision);active={...record,revision};if(generation===atGeneration)dirty=false;savingState(dirty?'Unsaved changes':'Saved on this device · '+dateTime(record.updatedAt));}catch(e){$('saveReport').hidden=false;savingState('Not saved · retry or download a backup');status(e.message,true);throw e;}finally{saving=null;$('saveReport').disabled=false;}})();
  return saving;
 }
 function editorVisible(on){$('dashboard').hidden=on;$('editor').hidden=!on;$('editorBar').hidden=!on;document.querySelector('.skip-link').href=on?'#review':'#reportsList';}
 async function showDashboard(){if(bridge.busy())return;try{await saveActive();editorVisible(false);projects=db?await readProjects(db):[];renderList();$('dashboardHeading').focus();}catch(e){status(e.message,true);}}
 async function activate(record){loading=true;try{inspectSnapshot(record.snapshot);bridge.load(record.snapshot);active=record;lastStamp=stamp(bridge.capture());dirty=false;$('saveReport').hidden=true;editorVisible(true);$('activeReportName').textContent=record.title;savingState('Saved on this device · '+dateTime(record.updatedAt));$('activeReportName').focus();}finally{loading=false;}}
 function renderList(){
  const query=$('reportSearch').value,from=$('reportFrom').value,to=$('reportTo').value;
  const filtered=!!query.trim()||!!from||!!to;$('clearReportFilters').hidden=!filtered;$('reportFilterBadge').textContent=(from||to)?' · '+(Number(!!from)+Number(!!to)):'';
  if(from&&to&&from>to){$('reportCount').textContent='Check date filters';$('reportsList').innerHTML='<div class="warning" role="alert">Choose an end date on or after the start date.</div>';return;}
  const selected=sortLibrary(projects.filter(p=>matchesProject(p,query,from,to)),$('reportSort').value);
  $('reportCount').textContent=filtered?selected.length+' of '+projects.length+' reports':projects.length+' saved report'+(projects.length===1?'':'s');
  $('reportsList').innerHTML=selected.length?selected.map(p=>`<article class="saved-report"><div class="saved-report-heading"><h3>${esc(p.title)}</h3>${p.conflictCount?'<span class="tag">Versions to review</span>':''}</div><p class="report-period">${p.dates.length?esc(displayDate(p.dates[0])+(p.dates.length>1?' – '+displayDate(p.dates.at(-1)):'')):'Inspection date not recorded'}</p><p class="report-places">${esc(libraryLocations(p))}</p><p class="saved-report-counts">${p.inspectionCount} inspection${p.inspectionCount===1?'':'s'} · ${p.findingCount} finding${p.findingCount===1?'':'s'} · ${p.photoCount} photos</p><div class="saved-report-meta"><span>Edited ${esc(dateTime(p.updatedAt))}</span><button class="button primary" data-open-report="${esc(p.id)}" aria-label="Edit report: ${esc(p.title)}">Edit report</button></div></article>`).join(''):`<div class="empty"><div class="empty-icon" aria-hidden="true">▤</div><h3>${projects.length?'No reports match your search':'Your reports, ready to continue'}</h3><p>${projects.length?'Change your search or inspection dates.':'Create your first report, or open a project backup to continue earlier work.'}</p></div>`;
 }
 $('newReport').onclick=()=>{$('newReportDialog').showModal();};
 $('cancelNewReport').onclick=()=>$('newReportDialog').close();
 $('newReportTitle').oninput=()=>$('newReportTitle').setCustomValidity('');
 $('newReportForm').onsubmit=async e=>{e.preventDefault();if(!$('newReportTitle').value.trim()){$('newReportTitle').setCustomValidity('Enter a report title.');$('newReportTitle').reportValidity();return;}$('createReport').disabled=true;try{
  const snapshot=bridge.empty();snapshot.fields.title=$('newReportTitle').value.trim();const record={id:crypto.randomUUID(),title:snapshot.fields.title,revision:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),snapshot};
  await activate(record);dirty=true;generation++;try{await saveActive();}catch(e){status(e.message,true);}$('newReportDialog').close();$('newReportForm').reset();
 }catch(e){status(e.message,true);}finally{$('createReport').disabled=false;}};
 $('backReports').onclick=showDashboard;document.querySelector('.brand').onclick=e=>{e.preventDefault();if(active)showDashboard();};
 $('saveReport').onclick=()=>{changed();saveActive().then(()=>status('Report saved on this device.')).catch(e=>status(e.message,true));};
 $('reportsList').onclick=async e=>{const id=e.target.closest('[data-open-report]')?.dataset.openReport;if(!id)return;try{const record=await readProject(db,id);if(!record)throw Error('This report is no longer available.');await activate(record);}catch(e){status(e.message,true);}};
 for(const id of ['reportSearch','reportFrom','reportTo'])$(id).oninput=renderList;
 $('reportSort').onchange=renderList;
 $('clearReportFilters').onclick=()=>{for(const id of ['reportSearch','reportFrom','reportTo'])$(id).value='';renderList();};
 $('backupReport').onclick=async()=>{if(!active||bridge.busy()||backing)return;backing=true;$('backupReport').disabled=true;status('Preparing editable project backup…');try{const blob=await packProject(bridge.capture(),window.JSZip);bridge.download(blob,(bridge.capture().fields.title||'Inspection report').replace(/[<>:"/\\|?*]/g,'-').slice(0,100)+'.fieldbook-report.zip');status('Project backup download started. It includes your edits and photographs. Keep it to resume on another device.');}catch(e){status('Backup failed: '+e.message,true);}finally{backing=false;$('backupReport').disabled=false;}};
 $('openBackup').onclick=()=>$('projectFile').click();
 $('projectFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;$('openBackup').disabled=true;status('Checking project backup…');try{const snapshot=await unpackProject(file,window.JSZip);const now=new Date().toISOString(),record={id:crypto.randomUUID(),title:snapshot.fields.title,createdAt:now,updatedAt:now,revision:0,snapshot};await activate(record);dirty=true;generation++;try{await saveActive();}catch(e){status(e.message,true);}status(dirty?'Backup opened. Download another backup if device storage is unavailable.':'Backup restored as a separate report on this device.');}catch(e){status('Could not open backup: '+e.message,true);}finally{$('openBackup').disabled=false;$('projectFile').value='';}};
 document.addEventListener('report-changed',changed);
 $('editor').addEventListener('input',changed);$('editor').addEventListener('change',changed);
 window.addEventListener('beforeunload',e=>{if(dirty||bridge.busy()||backing){e.preventDefault();e.returnValue='';}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty&&!bridge.busy())saveActive().catch(()=>{});});
 editorVisible(false);
 try{db=await openProjectDB();projects=await readProjects(db);status('');}catch(e){status('Device storage is unavailable. You can still prepare a report and download a project backup.',true);}
 renderList();
 return {save:saveActive};
}
