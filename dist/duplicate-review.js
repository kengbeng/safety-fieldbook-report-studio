import {candidatePairs,comparisonCurrent,duplicateGroups,createDuplicateRunner,DUPLICATE_PAIR_LIMIT} from './duplicate-findings.mjs';
const names={likely_duplicate:'Likely duplicate',related_distinct:'Related, separate issues',repeat_observation:'Repeat observation',insufficient_evidence:'Insufficient evidence'};
export function startDuplicateReview({client,bridge,locked,setLocked,model,openSettings}){
 const $=id=>document.getElementById(id),dialog=$('duplicateDialog');let running=false,config=false,actionBusy=false;
 const node=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
 const runner=createDuplicateRunner({...bridge,suggest:async(payload,model,signal)=>{try{return await client.suggest(payload,model,signal);}catch(e){if(e.code==='reconnect')client.disconnect();throw e;}}});
 const button=(text,action)=>{const el=node('button',text,'button secondary');el.type='button';el.onclick=action;return el;};
 function refresh(){$('findDuplicates').hidden=false;$('findDuplicates').disabled=locked()||running;}
 function plan(){const value=candidatePairs(bridge.rows(),$('duplicateDates').checked);$('duplicatePlan').textContent=value.tooMany?value.count+' candidate pairs exceeds the '+DUPLICATE_PAIR_LIMIT+'-pair limit. Narrow the report before scanning.':value.count+' candidate pairs at matching locations. '+value.missingLocation+' missing locations, '+value.missingDate+' missing dates and '+value.blank+' blank observations and '+value.tooLong+' oversized findings excluded.';$('duplicateStart').disabled=!value.count||value.tooMany;return value;}
 function card(key,identifier){const row=bridge.rows().find(r=>r.key===key),section=node('section',null,'duplicate-finding');if(!row){section.append(node('p','Finding no longer available.'));return section;}const number=bridge.rows().filter(r=>r.include&&!r.mergedInto).findIndex(r=>r.key===key)+1;section.append(node('p',(identifier?identifier+' · ':'')+(number?'Finding '+number:'Source finding')+' · '+row.inspection.title,'duplicate-meta'));section.append(node('strong',row.edit.shortTitle||row.original.reference||'Finding'),node('p',row.inspection.inspector+' · '+row.inspection.date,'duplicate-meta'),node('p',[row.edit.building,row.edit.floor,row.edit.room].filter(Boolean).join(' / '),'duplicate-meta'),node('p',row.edit.description),node('p','Action: '+(row.edit.action||'Not entered.')));section.append(button('Open finding',()=>{if(running||actionBusy)return;dialog.close();bridge.openFinding(key);}));return section;}
 async function decide(comparisons,decision){if(running||actionBusy)return;actionBusy=true;setLocked(true);const changed=comparisons.filter(c=>comparisonCurrent(c,bridge.rows())),previous=changed.map(c=>c.decision);try{for(const c of changed)c.decision=decision;bridge.changed();await bridge.save();show(false);}catch(e){changed.forEach((c,i)=>{c.decision=previous[i];});bridge.changed();$('duplicateStatus').textContent=e.message;}finally{actionBusy=false;setLocked(false);}}
 function resultCard(c){const box=node('article',null,'duplicate-result'),current=comparisonCurrent(c,bridge.rows()),heading=!current||c.state==='stale'?'Outdated suggestion':c.result?names[c.result.classification]:c.state==='failed'?'Comparison failed':'Not yet compared';box.append(node('h3',heading));
  if(!current)box.append(node('p','A finding changed. Start a new scan before relying on this suggestion.'));
  if(c.result){box.append(node('p',c.result.reason));if(c.result.distinguishingEvidence)box.append(node('p',c.result.distinguishingEvidence,'duplicate-meta'));}else if(c.message)box.append(node('p',c.message));
  const pair=node('div',null,'duplicate-pair');c.keys.forEach((key,i)=>pair.append(card(key,i?'B':'A')));box.append(pair);
  if(current&&c.state==='done'&&c.decision==='unreviewed'){const actions=node('div',null,'duplicate-actions');actions.append(button('Keep both',()=>decide([c],'keep_both')),button('Dismiss suggestion',()=>decide([c],'dismissed')));box.append(actions);}else if(c.decision!=='unreviewed')box.append(node('p',c.decision==='keep_both'?'Reviewed: keep both records.':'Suggestion dismissed.','duplicate-meta'));
  return box;
 }
 function results(){const review=bridge.review(),host=$('duplicateResults');host.replaceChildren();if(!review)return;
  const rows=bridge.rows(),groups=duplicateGroups(review.comparisons,rows),used=new Set();
  for(const group of groups){const article=node('article',null,'duplicate-result');article.append(node('h3',(group.complete?(group.repeat?'Possible recurring issue':'Likely duplicate group'):'Overlapping matches: review separately')+' · '+group.keys.length+' findings'));
   article.append(node('p',group.complete?'Every pair in this group has a supporting comparison. Keep the source records until you have reviewed the evidence.':'Some pairings are missing, unclear or contradictory. This is not a confirmed duplicate group.'));
   const findings=node('div',null,'duplicate-pair');for(const key of group.keys)findings.append(card(key));article.append(findings);
   const details=node('details');details.append(node('summary','Pair-by-pair reasons'));for(const c of group.comparisons){used.add(c.id);details.append(resultCard(c));}article.append(details);
   const actions=node('div',null,'duplicate-actions');actions.append(button('Keep all records',()=>decide(group.comparisons,'keep_both')),button('Dismiss group suggestions',()=>decide(group.comparisons,'dismissed')));article.append(actions);host.append(article);
  }
  const remaining=review.comparisons.filter(c=>!used.has(c.id));if(remaining.length){const details=node('details');details.append(node('summary','Other comparisons and reviewed suggestions ('+remaining.length+')'));if(!groups.length&&remaining.some(c=>c.decision==='unreviewed'||!comparisonCurrent(c,rows)))details.open=true;for(const c of remaining)details.append(resultCard(c));host.append(details);}
 }
 function show(setup=!bridge.review()){
  config=setup;$('duplicateHeading').textContent=setup?'Find possible duplicates':'Duplicate review';$('duplicateSetup').hidden=!setup;$('duplicateResults').hidden=setup;$('duplicateProgressBox').hidden=true;
  $('duplicateStart').hidden=!setup;$('duplicateNew').hidden=setup;$('duplicateRetry').hidden=setup||!bridge.review()?.comparisons.some(c=>['pending','failed'].includes(c.state));$('duplicateStop').hidden=true;$('duplicateClose').hidden=false;
  if(setup){$('duplicateStatus').textContent='Text only. Findings, photographs and inclusion are never changed. API charges apply.';plan();}
  else {const review=bridge.review(),stale=review.comparisons.filter(c=>!comparisonCurrent(c,bridge.rows())||c.state==='stale').length,done=review.comparisons.filter(c=>c.state==='done').length;$('duplicateStatus').textContent=done+' of '+review.comparisons.length+' pairs compared'+(stale?' · '+stale+' outdated':'')+'. Findings remain unchanged.';results();}
  if(!dialog.open)dialog.showModal();refresh();
 }
 async function start(retry){
  if(running||actionBusy||locked())return;if(!client.connected()){dialog.close();openSettings();bridge.notify('Connect your API key, then open Find possible duplicates again.');return;}
  if(!retry){const value=plan();if(value.tooMany||!value.count)return;if(bridge.review()&&!confirm('Replace the saved duplicate suggestions with a new paid scan? Findings will not change.'))return;}
  const total=retry?bridge.review().comparisons.filter(c=>['pending','failed'].includes(c.state)).length:plan().count;let done=0,message='';
  running=true;setLocked(true);$('duplicateHeading').textContent='Comparing findings';$('duplicateSetup').hidden=true;$('duplicateResults').hidden=true;$('duplicateProgressBox').hidden=false;$('duplicateProgress').max=total||1;$('duplicateProgress').value=0;
  $('duplicateProgressLabel').textContent='0 of '+total+' pairs processed';$('duplicateStatus').textContent='Saving scan… Keep this tab open.';
  for(const id of ['duplicateStart','duplicateNew','duplicateRetry','duplicateClose'])$(id).hidden=true;$('duplicateStop').hidden=false;
  try{const result=await runner.run({model:model(),includeDates:$('duplicateDates').checked,retry,onProgress:(c,phase)=>{if(phase==='settled')done++;$('duplicateProgress').value=done;$('duplicateProgressLabel').textContent=done+' of '+total+' pairs processed';$('duplicateStatus').textContent=phase==='starting'?'Comparing the next pair…':'Progress saved.';}});if(result.fatal)message=result.fatal;}
  catch(e){message='Scan stopped: '+e.message+' No further requests were sent.';}
  finally{running=false;setLocked(false);show(!bridge.review());if(message)$('duplicateStatus').textContent=message;}
 }
 $('findDuplicates').onclick=()=>{if(locked()||running||!bridge.canStart())return;show();};
 $('duplicateDates').onchange=plan;$('duplicateStart').onclick=()=>start(false);$('duplicateRetry').onclick=()=>start(true);$('duplicateNew').onclick=()=>{if(!running&&!actionBusy)show(true);};
 $('duplicateStop').onclick=()=>{runner.stop();$('duplicateStatus').textContent='Stopping… Saved comparisons are kept.';};$('duplicateClose').onclick=()=>{if(!running&&!actionBusy)dialog.close();};
 dialog.addEventListener('cancel',e=>{if(running||actionBusy)e.preventDefault();});window.addEventListener('beforeunload',e=>{if(running||actionBusy){e.preventDefault();e.returnValue='';}});window.addEventListener('pagehide',()=>runner.stop());
 return {refresh,stop:()=>runner.stop()};
}
