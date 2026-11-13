const fields=['shortTitle','description','action'];
export const wording=row=>Object.fromEntries(fields.map(key=>[key,row.edit[key]||'']));
const same=(a,b)=>fields.every(key=>a[key]===b[key]);
export function batchContext(row){return JSON.stringify({edit:row.edit,inspection:row.inspection,include:row.include,mergedInto:row.mergedInto,photos:row.photos.map(p=>({id:p.id,include:p.include,removed:p.removed,variant:p.variant,rotation:p.rotation,caption:p.caption,revision:p.reportEditRevision,url:p.variants?.[p.variant]?.url}))});}
export function batchCounts(journal){const counts={updated:0,failed:0,skipped:0,pending:0,undone:0};for(const e of journal?.entries||[])counts[e.status]++;return counts;}
export function inspectBatch(journal){
 if(journal==null)return;
 if(journal.version!==1||typeof journal.id!=='string'||typeof journal.model!=='string'||typeof journal.photos!=='boolean'||!['running','complete','stopped'].includes(journal.status)||!Array.isArray(journal.entries)||journal.entries.length>5000)throw Error('Invalid AI batch recovery.');
 const keys=new Set();for(const e of journal.entries){if(typeof e.key!=='string'||keys.has(e.key)||typeof e.label!=='string'||typeof e.message!=='string'||!['pending','updated','failed','skipped','undone'].includes(e.status))throw Error('Invalid AI batch finding.');keys.add(e.key);for(const value of [e.before,e.after])if(value!==null&&(!value||Object.keys(value).length!==3||fields.some(key=>typeof value[key]!=='string'||value===e.after&&value[key].length>(key==='shortTitle'?120:12000))))throw Error('Invalid AI batch wording.');if(!e.before||(e.status==='updated'&&!e.after))throw Error('Incomplete AI batch recovery.');}
}
// The bridge persists wording and recovery metadata in the same project transaction.
export function createBatchRunner(bridge){
 let running=false,controller=null;
 const rowFor=key=>bridge.rows().find(r=>r.key===key&&r.include&&!r.mergedInto);
 async function checkpoint(){bridge.changed();await bridge.save();}
 async function run({model,photos,retry=false,onProgress=()=>{}}){
  if(running)throw Error('A batch is already running.');
  if(!retry&&bridge.journal())throw Error('Keep or undo the previous batch before starting another.');
  const generation=bridge.generation();let journal=bridge.journal();
  if(!retry){const rows=bridge.rows().filter(r=>r.include&&!r.mergedInto);if(!rows.length)throw Error('Include findings before starting AI.');if(rows.length>5000)throw Error('Use at most 5,000 findings in one report.');journal={version:1,id:crypto.randomUUID(),model,photos,status:'running',entries:rows.map((r,i)=>({key:r.key,label:'Finding '+(i+1),before:wording(r),after:null,status:'pending',message:''}))};bridge.setJournal(journal);}
  journal.model=model;journal.photos=photos;journal.status='running';
  const selected=journal.entries.filter(e=>e.status==='pending'||retry&&e.status==='failed');
  const contexts=new Map(selected.map(e=>[e.key,rowFor(e.key)?batchContext(rowFor(e.key)):null]));
  running=true;controller=new AbortController();const signal=controller.signal;let fatal='';
  try{
   await checkpoint(); // Never send paid requests unless recovery has been saved first.
   for(const entry of selected){
    if(signal.aborted||generation!==bridge.generation())break;
    const row=rowFor(entry.key);onProgress(journal,entry);
    if(!row||!same(wording(row),entry.before)||batchContext(row)!==contexts.get(entry.key)){entry.status='skipped';entry.message='Finding changed or is no longer included.';await checkpoint();continue;}
    if(!row.edit.description.trim()){entry.status='skipped';entry.message='Observation is blank.';await checkpoint();continue;}
    entry.status='pending';entry.message='';
    let result;
    try{result=await bridge.suggest(row,{model,photos,signal});}
    catch(error){if(signal.aborted||error.name==='AbortError')break;entry.status='failed';entry.message=error.message;await checkpoint();if(['reconnect','upstream'].includes(error.code)){fatal=error.message;break;}continue;}
    if(signal.aborted||generation!==bridge.generation())break;
    const current=rowFor(entry.key);
    if(!current||batchContext(current)!==contexts.get(entry.key)){entry.status='skipped';entry.message='Finding changed while AI was working.';await checkpoint();continue;}
    if(!result.shortTitle||!result.observation||!result.correctiveAction){entry.status='skipped';entry.message=result.review||'More factual detail is needed.';await checkpoint();continue;}
    const next={shortTitle:result.shortTitle,description:result.observation,action:result.correctiveAction};
    if(fields.some(key=>typeof next[key]!=='string'||!next[key].trim()||next[key].length>(key==='shortTitle'?120:12000))){entry.status='failed';entry.message='AI returned incomplete or excessive wording.';await checkpoint();continue;}
    Object.assign(current.edit,next);entry.after=next;entry.status='updated';entry.message=result.review||'';
    try{await checkpoint();}catch(error){Object.assign(current.edit,entry.before);entry.after=null;entry.status='failed';entry.message='Saving failed; original wording retained.';bridge.changed();throw error;}
    onProgress(journal,entry);
   }
   journal.status=signal.aborted||fatal||generation!==bridge.generation()?'stopped':'complete';
   if(generation===bridge.generation())await checkpoint();
   return {journal,fatal};
  }catch(error){journal.status='stopped';bridge.changed();throw error;}
  finally{running=false;controller=null;}
 }
 async function undo(){
  if(running)throw Error('Stop the batch before undoing it.');let restored=0,protectedCount=0;const journal=bridge.journal();if(!journal)return {restored,protectedCount};
  for(const entry of journal.entries.filter(e=>e.status==='updated')){
   const row=rowFor(entry.key);if(!row||!same(wording(row),entry.after)){protectedCount++;continue;}
   Object.assign(row.edit,entry.before);entry.status='undone';
   try{await checkpoint();restored++;}catch(error){Object.assign(row.edit,entry.after);entry.status='updated';bridge.changed();throw error;}
  }
  journal.status='stopped';await checkpoint();return {restored,protectedCount};
 }
 async function clear(){if(running)throw Error('Stop the batch first.');const previous=bridge.journal();bridge.setJournal(null);try{await checkpoint();}catch(error){bridge.setJournal(previous);bridge.changed();throw error;}}
 return {run,undo,clear,stop:()=>controller?.abort(),get running(){return running;}};
}

export function startBatchUI({client,bridge,photosFor,locked,setLocked,model,includePhotos,openSettings}){
 const $=id=>document.getElementById(id),dialog=$('aiBatchDialog');let running=false,prepared=false,actionBusy=false;
 const runner=createBatchRunner({...bridge,suggest:async(row,{model,photos,signal})=>{
  const images=await photosFor(row.photos,photos,signal);signal.throwIfAborted();
  try{return await client.suggest(bridge.payload(row),model,signal,images);}catch(error){if(error.code==='reconnect')client.disconnect();throw error;}
 }});
 function refresh(){
  const journal=bridge.journal(),counts=batchCounts(journal);
  $('aiAllFindings').hidden=!bridge.visible();$('aiAllFindings').disabled=locked()||running;
  $('aiBatchRecovery').hidden=!bridge.visible()||!journal;
  $('aiBatchRecoveryText').textContent=journal?'AI batch: '+counts.updated+' updated, '+counts.failed+' failed, '+counts.skipped+' skipped, '+counts.pending+' unfinished. Recovery is saved with this report.':'';
 }
 function show(){
  const journal=bridge.journal(),counts=batchCounts(journal);prepared=!journal;
  $('aiBatchHeading').textContent=journal?'AI batch results':'AI all included findings?';
  $('aiBatchScope').textContent=journal?'Recovery is available after reopening this report. Undo protects later manual wording edits.':'This will replace the titles, observations and corrective actions of all '+bridge.rows().filter(r=>r.include&&!r.mergedInto).length+' included findings, including those hidden by search or filters. Each successful result is saved directly; there is no review screen.';
  $('aiBatchSettings').textContent=(journal?'Retry settings · Model: ':'Model: ')+model()+' · '+(includePhotos()?'Up to 6 selected photos per finding':'Text only')+'. API usage is charged to your account. Stop may not prevent charges already incurred.';
  $('aiBatchStart').hidden=!!journal;$('aiBatchRetry').hidden=!journal||!(counts.failed+counts.pending);$('aiBatchUndo').hidden=!journal||!counts.updated;$('aiBatchKeep').hidden=!journal;
  $('aiBatchMessage').textContent=journal?(journal.status==='running'?'The previous batch was interrupted. ':journal.status==='stopped'?'Batch stopped. ':'')+counts.updated+' updated · '+counts.failed+' failed · '+counts.skipped+' skipped · '+counts.pending+' unfinished · '+counts.undone+' restored.':'Original wording is saved for Undo before any AI request. Review the results in Cards or Table view before exporting.';
  $('aiBatchIssues').replaceChildren();
  for(const entry of journal?.entries||[]){if(entry.status==='failed'||entry.status==='skipped'){const li=document.createElement('li');li.textContent=entry.label+': '+entry.message;$('aiBatchIssues').append(li);}}
  $('aiBatchStop').hidden=true;$('aiBatchClose').hidden=false;
  if(!dialog.open)dialog.showModal();refresh();
 }
 async function start(retry){
  if(running||actionBusy||locked())return;
  if(!client.connected()){dialog.close();openSettings();bridge.notify('Connect your key, then open AI all included findings again.');return;}
  if(!retry&&!prepared)return;
  running=true;setLocked(true);$('aiBatchMessage').textContent='Saving recovery before starting…';
  for(const id of ['aiBatchStart','aiBatchRetry','aiBatchUndo','aiBatchKeep','aiBatchClose'])$(id).hidden=true;
  $('aiBatchStop').hidden=false;refresh();let message='';
  try{const {fatal}=await runner.run({model:model(),photos:includePhotos(),retry,onProgress:(journal,entry)=>{$('aiBatchMessage').textContent='Processing '+entry.label+' of '+journal.entries.length+' · '+batchCounts(journal).updated+' updated. Keep this tab open.';refresh();}});message=fatal?'Batch stopped: '+fatal:'';}
  catch(error){message='Batch stopped: '+error.message+' No further AI requests were sent. Check save status and keep a project backup.';}
  finally{running=false;setLocked(false);show();if(message)$('aiBatchMessage').textContent=message;bridge.notify('AI batch '+(bridge.journal()?.status==='complete'?'finished':'stopped')+'. Review the results before exporting.');}
 }
 $('aiAllFindings').onclick=()=>{if(locked()||running)return;if(!bridge.canStart())return;show();};
 $('aiBatchReview').onclick=show;
 $('aiBatchStart').onclick=()=>start(false);$('aiBatchRetry').onclick=()=>start(true);
 $('aiBatchStop').onclick=()=>{runner.stop();$('aiBatchMessage').textContent='Stopping… Completed findings remain saved.';};
 $('aiBatchClose').onclick=()=>{if(!running&&!actionBusy)dialog.close();};
 dialog.addEventListener('cancel',event=>{if(running||actionBusy)event.preventDefault();});
 async function recovery(action){if(running||locked()||actionBusy)return;actionBusy=true;setLocked(true);for(const id of ['aiBatchUndo','aiBatchKeep','aiBatchRetry'])$(id).disabled=true;try{const result=await action();show();if(result)$('aiBatchMessage').textContent=result;}catch(error){$('aiBatchMessage').textContent=error.message;}finally{actionBusy=false;setLocked(false);for(const id of ['aiBatchUndo','aiBatchKeep','aiBatchRetry'])$(id).disabled=false;refresh();}}
 $('aiBatchUndo').onclick=()=>recovery(async()=>{const result=await runner.undo();return result.restored+' finding'+(result.restored===1?'':'s')+' restored; '+result.protectedCount+' changed or removed finding'+(result.protectedCount===1?'':'s')+' left untouched.';});
 $('aiBatchKeep').onclick=()=>{if(!confirm('Keep the current wording and clear this batch’s Undo recovery?'))return;return recovery(async()=>{await runner.clear();return 'Batch recovery cleared. Current wording kept.';});};
 window.addEventListener('beforeunload',event=>{if(running||actionBusy){event.preventDefault();event.returnValue='';}});
 window.addEventListener('pagehide',()=>runner.stop());
 return {refresh,stop:()=>runner.stop()};
}
