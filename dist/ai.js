import {startDuplicateReview} from './duplicate-review.js';
import {startBatchUI} from './ai-batch.mjs';
import {createAIClient} from './ai-api.mjs';
import {selectAIPhotos,prepareAIPhotos} from './ai-photos.mjs';
const $=id=>document.getElementById(id);
export function startAI(bridge){
 const client=createAIClient(),settings=$('aiSettingsDialog');let batch=null,duplicates=null;
 let running=false,operation=null,controller=null,undo=[],redo=[],epoch=0,connecting=false,connectController=null,activeKey=null;
 const summaryMessage=text=>{$('draftSummaryMessage').textContent=text;};
 function findingMessage(text,notes=''){$('findingAIMessage').textContent=text;$('findingAINotes').textContent=notes;$('findingAINotesBox').hidden=!notes;$('findingAIStatus').hidden=!text;}
 function controls(){
  const connected=client.connected(),findingBusy=running&&operation==='finding';
  $('aiSettingsStatus').textContent=connected?'Connected for this tab':'Not connected';
  const connection=connecting?'Connecting…':connected?'Connected':'Not connected',model=$('aiModel').selectedOptions[0]?.textContent.replace(' (default)','')||$('aiModel').value;
  $('aiButtonStatus').textContent='AI · '+model;
  $('openAISettings').classList.toggle('ai-connected',connected);
  $('openAISettings').setAttribute('aria-label','AI Settings: '+connection+', '+model);
  $('openAISettings').title=connection+' · '+model;
  $('aiKeyEntry').hidden=connected;$('aiDisconnect').hidden=!connected;
  $('aiConnect').disabled=connecting||running;$('aiConnect').textContent=connecting?'Connecting…':'Connect';$('aiKey').disabled=connecting||running;
  $('aiModel').disabled=$('aiIncludePhotos').disabled=running;
  $('draftExecutiveSummary').disabled=running||connecting;$('draftExecutiveSummary').textContent=running&&operation==='summary'?'Drafting summary…':'Draft executive summary';
  $('draftSummaryCancel').hidden=!(running&&operation==='summary');
  const icon=$('findingAI');icon.disabled=running||connecting;icon.classList.toggle('is-working',findingBusy);icon.setAttribute('aria-busy',String(findingBusy));icon.title=findingBusy?'Updating finding…':'Update title, observation and corrective action with AI';
  $('findingAICancel').hidden=!findingBusy;
  $('findingAIUndo').hidden=running||!undo.some(change=>change.kind==='finding'&&change.key===activeKey);
  $('findingAIRedo').hidden=running||!redo.some(change=>change.key===activeKey);
  batch?.refresh();duplicates?.refresh();
 }
 function cancelRequest(){if(operation==='batch')batch?.stop();if(operation==='duplicates')duplicates?.stop();epoch++;controller?.abort();controller=null;running=false;operation=null;controls();}
 function cancelFinding(){if(running&&operation==='finding'){cancelRequest();findingMessage('AI update cancelled. No AI text applied.');}}
 function cancelSummary(){if(running&&operation==='summary'){cancelRequest();summaryMessage('AI drafting cancelled. The summary was not changed.');}}
 function clearKey(){client.disconnect();connectController?.abort();cancelRequest();connecting=false;$('aiKey').value='';controls();}
 function closeSettings(){connectController?.abort();connecting=false;$('aiKey').value='';settings.close();controls();}
 function openSettings(){controls();$('aiSettingsMessage').textContent='';settings.showModal();}
 function record(change){redo=redo.filter(item=>item.key!==change.key);undo.push(change);if(undo.length>20)undo.shift();}
 async function updateSummary(){
  if(bridge.busy()||running||connecting)return;
  if(!client.connected()){openSettings();$('aiSettingsMessage').textContent='Connect your key once, then click Draft executive summary.';return;}
  const chosen=bridge.select('summary',null);
  if(!chosen){summaryMessage('Include a finding with an observation before drafting a summary.');return;}
  const ticket=++epoch;running=true;operation='summary';controller=new AbortController();controls();summaryMessage('Drafting the management summary…');
  try{
   const text=await client.suggest(chosen.payload,$('aiModel').value,controller.signal);if(ticket!==epoch)return;
   if(!bridge.apply(chosen,text)){summaryMessage('The report details changed while AI was working. The summary was not replaced. Click Draft executive summary to try again.');return;}
   const wordCount=text.trim().split(/\s+/).length;
   summaryMessage(wordCount>150?'Summary updated · '+wordCount+' words. This is above the suggested 150-word limit. Edit it or click Draft executive summary again to shorten it. Save changes to keep it.':'Summary updated · '+wordCount+' words. Save changes to keep it.');$('draft_summary').focus();
  }catch(error){if(ticket===epoch&&error.name!=='AbortError'){if(error.code==='reconnect')client.disconnect();summaryMessage(error.message);}}
  finally{if(ticket===epoch){running=false;operation=null;controller=null;controls();}}
 }
 async function updateFinding(index){
  if(bridge.busy()||running||connecting)return;
  if(!client.connected()){openSettings();$('aiSettingsMessage').textContent='Connect your key once, then click the finding’s sparkle icon.';return;}
  const chosen=bridge.select('finding',index);
  if(!chosen){bridge.notify('Enter an observation before updating this finding with AI.');return;}
  activeKey=chosen.key;const ticket=++epoch;running=true;operation='finding';controller=new AbortController();
  const signal=controller.signal,model=$('aiModel').value;
  const {photos,total}=selectAIPhotos(chosen.photos,$('aiIncludePhotos').checked);
  findingMessage('Updating with AI · '+(photos.length?photos.length+' photo'+(photos.length===1?'':'s')+(total>photos.length?' (first '+photos.length+' of '+total+')':''):'text only')+'…');controls();
  try{
   const images=await prepareAIPhotos(photos,signal);if(ticket!==epoch)return;
   const result=await client.suggest({...chosen.payload,action:'finding_improve'},model,signal,images);if(ticket!==epoch)return;
   if(!result.shortTitle&&!result.observation&&!result.correctiveAction){findingMessage('More factual detail is needed. The finding was not changed.',result.review);return;}
   const change=bridge.applyFinding(chosen,result);
   if(!change){findingMessage('Finding changed while AI was working. No AI text applied. Click the sparkle icon to try again.');return;}
   const longer=[['shortTitle','Title',8,80],['observation','Observation',60,600],['correctiveAction','Corrective action',40,400]].filter(([key,,words,chars])=>result[key].split(/\s+/).length>words||result[key].length>chars).map(([,label])=>label);
   const message=longer.length?'AI updated this finding. '+longer.join(', ')+' exceeded the suggested length. Edit for concision, then Save changes.':'AI updated this finding. Review the fields, then Save changes.';
   record(change);findingMessage(message+(change.text.room!==undefined?' Room prefix corrected: '+change.old.room+' → '+change.text.room+'.':''),result.review);bridge.notify('AI updated the finding. Save changes when ready.');
  }catch(error){if(ticket===epoch&&error.name!=='AbortError'){if(error.code==='reconnect')client.disconnect();findingMessage(error.message);}}
  finally{if(ticket===epoch){running=false;operation=null;controller=null;controls();}}
 }
 document.addEventListener('click',e=>{const button=e.target.closest('[data-ai]');if(!button)return;if(button.dataset.ai==='finding'){const row=button.closest('[data-row]');return updateFinding(row?Number(row.dataset.row):null);}return updateSummary();});
 $('openAISettings').onclick=openSettings;
 $('aiSettingsClose').onclick=closeSettings;settings.addEventListener('cancel',e=>{e.preventDefault();closeSettings();});
 $('aiKeyForm').onsubmit=async e=>{
  e.preventDefault();if(connecting||running)return;const value=$('aiKey').value;$('aiKey').value='';connecting=true;connectController=new AbortController();
  const current=connectController;controls();$('aiSettingsMessage').textContent='Checking connection…';
  try{await client.connect(value,current.signal);if(!current.signal.aborted)$('aiSettingsMessage').textContent='Connected. Settings apply to all AI actions in this tab.';}
  catch(error){if(!current.signal.aborted)$('aiSettingsMessage').textContent=error.message;}
  finally{if(connectController===current){connecting=false;connectController=null;controls();}}
 };
 $('aiDisconnect').onclick=()=>{const wasFinding=operation==='finding',wasSummary=operation==='summary';clearKey();if(wasFinding)findingMessage('Disconnected. No AI text applied.');if(wasSummary)summaryMessage('Disconnected. The summary was not changed.');$('aiSettingsMessage').textContent='Disconnected. Key removed from this tab.';};
 $('aiModel').onchange=controls;
 $('findingAICancel').onclick=cancelFinding;$('draftSummaryCancel').onclick=cancelSummary;
 function undoLast(key){
  let at=undo.length-1;if(key!=null){at=undo.findLastIndex(change=>change.kind==='finding'&&change.key===key);}
  const change=undo[at];if(!change||!bridge.undo(change)){const text='Fields changed since the AI update. Undo was not applied.';findingMessage(text);bridge.notify(text);return;}
  undo.splice(at,1);
  redo.push(change);if(redo.length>20)redo.shift();
  if(change.kind==='finding')findingMessage('Previous wording and any corrected room restored.');
  bridge.notify('Previous wording restored.');controls();
 }
 $('findingAIUndo').onclick=()=>undoLast(activeKey);
 $('findingAIRedo').onclick=()=>{
  const at=redo.findLastIndex(change=>change.key===activeKey),change=redo[at];
  if(!change||!bridge.undo({...change,text:change.old,old:change.text})){const text='Fields changed since Undo. Redo was not applied.';findingMessage(text);bridge.notify(text);return;}
  redo.splice(at,1);undo.push(change);if(undo.length>20)undo.shift();
  findingMessage('AI wording and any corrected room restored.');bridge.notify('AI wording restored.');controls();
 };
 if(bridge.batch)batch=startBatchUI({client,bridge:bridge.batch,photosFor:async(photos,enabled,signal)=>prepareAIPhotos(selectAIPhotos(photos,enabled).photos,signal),locked:()=>running||connecting,setLocked:value=>{running=value;operation=value?'batch':null;controls();},model:()=>$('aiModel').value,includePhotos:()=>$('aiIncludePhotos').checked,openSettings});
 if(bridge.duplicates)duplicates=startDuplicateReview({client,bridge:bridge.duplicates,locked:()=>running||connecting,setLocked:value=>{running=value;operation=value?'duplicates':null;controls();},model:()=>$('aiModel').value,openSettings});
 window.addEventListener('pagehide',()=>{clearKey();findingMessage('');});controls();
 return {
  refresh:controls,
  prepareFinding(key){cancelFinding();activeKey=key;findingMessage('');controls();},
  cancelFinding,
  cancelSummary,
  prepareDetails(){cancelSummary();summaryMessage('');},
  reset(){cancelRequest();undo=[];redo=[];activeKey=null;findingMessage('');summaryMessage('');controls();}
 };
}
