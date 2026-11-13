import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIClient,prepareRequest,parseFindingSuggestion,parseExecutiveSummary} from '../dist/ai-api.mjs';
const key='sk-synthetic-test-value-not-a-real-key';
const payload={action:'observation',title:'Synthetic report',findings:[{reference:'F1',observation:'Boxes partially obstructed the walkway.',location:'Training room',photos:['must-not-send'],original:{secret:'must-not-send'}}],apiKey:'must-not-send'};
const completed=text=>Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text}]}]});
test('key is used only in authorization and disconnect prevents further requests',async()=>{
 const calls=[],client=createAIClient(async(url,options)=>{calls.push({url,options});return url.endsWith('/models')?Response.json({data:[]}):completed('Boxes partially obstructed the designated walkway.');});
 assert.equal(client.connected(),false);await client.connect(key);assert.equal(client.connected(),true);
 assert.equal(await client.suggest(payload,'gpt-5-mini'),'Boxes partially obstructed the designated walkway.');
 assert.equal(calls[0].url,'https://api.openai.com/v1/models');assert.equal(calls[0].options.method,'GET');
 const {url,options}=calls[1];assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer '+key);
 assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.equal(options.referrerPolicy,'no-referrer');
 const body=JSON.parse(options.body);assert.equal(body.input[0].role,'user');assert.equal(body.input[0].content[0].type,'input_text');assert.equal(body.store,false);assert.equal(body.max_output_tokens,4096);assert.ok(!options.body.includes(key));assert.ok(!options.body.includes('must-not-send'));assert.ok(body.instructions.includes('untrusted evidence'));
 client.disconnect();assert.equal(client.connected(),false);await assert.rejects(client.suggest(payload,'gpt-5-mini'),/Connect/);assert.equal(calls.length,2);
});
test('every AI action has factual constraints and allowlists submitted fields',()=>{
 for(const action of ['observation','action','summary']){const request=prepareRequest({...payload,action});assert.ok(request.instructions.includes('Do not invent'));assert.ok(!request.input.includes('must-not-send'));}
 assert.throws(()=>prepareRequest({...payload,action:'execute'}));assert.throws(()=>prepareRequest({...payload,findings:[]}));assert.throws(()=>prepareRequest({...payload,findings:[{observation:''}]}));assert.throws(()=>prepareRequest({...payload,findings:[{observation:'a'.repeat(12001)}]}));
 assert.throws(()=>prepareRequest({...payload,action:'summary',findings:Array.from({length:10},()=>({observation:'字'.repeat(4000)}))}),/too large/);
});
test('failed connection never retains a key and raw upstream errors never reach users',async()=>{
 for(const status of [401,403,429,500]){const client=createAIClient(async()=>Response.json({error:{message:'Credentials '+key}},{status}));await assert.rejects(client.connect(key),error=>!error.message.includes(key));assert.equal(client.connected(),false);}
 let called=false;const client=createAIClient(async()=>{called=true;});await assert.rejects(client.connect('invalid'),/valid/);assert.equal(called,false);
});
test('disconnect and cancellation invalidate late connection and suggestion results',async()=>{
 let release;const client=createAIClient(()=>new Promise(resolve=>{release=resolve;}));
 const connection=client.connect(key);client.disconnect();release(Response.json({data:[]}));await assert.rejects(connection,{name:'AbortError'});assert.equal(client.connected(),false);
 const controller=new AbortController();const cancelled=client.connect(key,controller.signal);controller.abort();release(Response.json({data:[]}));await assert.rejects(cancelled,{name:'AbortError'});assert.equal(client.connected(),false);
 const connection2=client.connect(key);release(Response.json({data:[]}));await connection2;
 const suggestion=client.suggest(payload,'gpt-5-mini');client.disconnect();release(completed('Late text'));await assert.rejects(suggestion,{name:'AbortError'});
});
test('partial, refused, empty and oversized responses cannot be applied as successful suggestions',async()=>{
 for(const response of [{status:'incomplete',output:[]},{status:'completed',output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:'No'}]}]},{status:'completed',output:[]},{status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'a'.repeat(24001)}]}]}]){
  const client=createAIClient(async url=>url.endsWith('/models')?Response.json({data:[]}):Response.json(response));await client.connect(key);await assert.rejects(client.suggest(payload,'gpt-5-mini'));
 }
});
test('network errors do not disclose request details or keys',async()=>{const client=createAIClient(async()=>{throw Error('Network error '+key);});await assert.rejects(client.connect(key),e=>e.message.includes('Could not reach')&&!e.message.includes(key));});
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function uiHarness(photos=[],{deferred=false,reviewOnly=false}={}){
 let release;
 const elements=new Map(),events={},windowEvents={};
 const el=id=>{if(!elements.has(id))elements.set(id,{value:id==='aiModel'?'gpt-5-mini':'',selectedOptions:[{textContent:'GPT-5 mini (default)'}],classList:{toggle(){}},setAttribute(){},checked:true,style:{},hidden:false,disabled:false,open:false,textContent:'',focus(){},children:[],replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},addEventListener(name,fn){this[name]=fn;},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(id);};
 const calls=[],client=createAIClient(async(url,options)=>{
  calls.push({url,options});if(url.endsWith('/models'))return Response.json({data:[]});
  const body=JSON.parse(options.body);
  const response=completed(body.text?.format.name==='executive_summary'?JSON.stringify({overallPosition:'The inspection identified a partly obstructed walkway.',managementAttention:'Remove the obstruction and keep the walkway clear.'}):body.text?JSON.stringify(reviewOnly?{review:'Describe the concrete condition.',shortTitle:'',observation:'',correctiveAction:''}:{review:'Check the reported location and keep uncertainty.',shortTitle:'Partly obstructed walkway',observation:'Boxes partially obstructed the walkway.',correctiveAction:'Remove the boxes and keep the walkway clear.'}):'Reviewed synthetic wording.');
  if(deferred)return new Promise(resolve=>{release=()=>resolve(response);});return response;
 });
 let applied=0,undone=0,revision=0,stale=false,photoPreparations=0;
 const currentFields={shortTitle:'Initial title',description:'Original text',action:'Original action'};
 const bridge={busy:()=>false,select:(action)=>({action,key:'f1',snapshot:String(revision),current:'Original text',currentFields:{...currentFields},photos,payload:{...payload,action:action==='finding'?'finding_review':'summary',findings:[{...payload.findings[0]}]}}),notify(){},apply:(selection,text,field='summary')=>{
  if(stale||selection.snapshot!==String(revision))return null;const old=currentFields[field]||'Original text';currentFields[field]=text;if(field==='summary')el('draft_summary').value=text;applied++;return {key:'f1',old,text,field,snapshot:String(++revision)};
 },applyFinding:(selection,result)=>{if(stale||selection.snapshot!==String(revision))return null;const old={...currentFields},text={shortTitle:result.shortTitle,description:result.observation,action:result.correctiveAction};Object.assign(currentFields,text);applied++;return {kind:'finding',key:'f1',old,text,snapshot:String(++revision)};},undo:change=>{if(change.kind==='finding'){if(Object.entries(change.text).some(([key,value])=>currentFields[key]!==value))return false;Object.assign(currentFields,change.old);undone++;return {snapshot:String(++revision)};}if(currentFields[change.field]!==change.text)return false;currentFields[change.field]=change.old;undone++;return {snapshot:String(++revision)};}};
 const source=readFileSync(new URL('../dist/ai.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace('export function startAI','function startAI')+'\nstartAI';
 const start=vm.runInNewContext(source,{createAIClient:()=>client,selectAIPhotos,prepareAIPhotos:async selected=>{photoPreparations++;return selected.map(p=>({url:'data:image/jpeg;base64,YQ==',reference:p.reference,caption:p.caption}));},document:{getElementById:el,createElement:()=>({style:{},append(){}}),addEventListener:(name,fn)=>events[name]=fn},window:{addEventListener:(name,fn)=>windowEvents[name]=fn},AbortController,JSON,Number});
 const api=start(bridge);
 return {el,calls,client,api,windowEvents,currentFields,release:()=>release(),get photoPreparations(){return photoPreparations;},get applied(){return applied;},get undone(){return undone;},makeStale(){stale=true;},open(action='summary'){return events.click({target:{closest:()=>({dataset:{ai:action},closest:()=>({dataset:{row:'0'}})})}});},async connect(){el('aiKey').value=key;await el('aiKeyForm').onsubmit({preventDefault(){}});}};
}
test('settings clear the input, page exit disconnects, and a new tab has no key',async()=>{
 const h=uiHarness();await h.connect();assert.equal(h.el('aiKey').value,'');assert.equal(h.client.connected(),true);
 h.el('aiKey').value='unsubmitted secret';h.el('aiSettingsClose').onclick();assert.equal(h.el('aiKey').value,'');assert.equal(h.client.connected(),true);
 assert.equal(uiHarness().client.connected(),false);h.windowEvents.pagehide();assert.equal(h.client.connected(),false);assert.equal(h.el('aiDisconnect').hidden,true);
});
test('one summary click updates the details field directly without a review or Apply step',async()=>{
 const h=uiHarness();await h.connect();await h.open();
 assert.equal(h.applied,1);assert.equal(h.el('draft_summary').value,'The inspection identified a partly obstructed walkway.\n\nRemove the obstruction and keep the walkway clear.');assert.match(h.el('draftSummaryMessage').textContent,/Summary updated/);assert.equal(h.el('aiDialog').open,false);
 h.makeStale();await h.open();assert.equal(h.applied,1);assert.match(h.el('draftSummaryMessage').textContent,/not replaced/);
});
test('closing details or cancelling summary drafting prevents a late update',async()=>{
 const h=uiHarness([],{deferred:true});await h.connect();const pending=h.open();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.el('draftExecutiveSummary').disabled,true);h.api.cancelSummary();h.release();await pending;assert.equal(h.applied,0);assert.equal(h.el('draftExecutiveSummary').disabled,false);assert.match(h.el('draftSummaryMessage').textContent,/cancelled/);
});

import {selectAIPhotos,photoGeometry} from '../dist/ai-photos.mjs';
const photo=(id,extra={})=>({id,reference:'Photo '+id,caption:'Synthetic photo',include:true,removed:false,variant:'report',rotation:90,variants:{report:{blob:new Blob(['synthetic'],{type:'image/jpeg'}),url:'blob:synthetic-'+id}},...extra});
test('whole-finding results use strict structured output and images are sent only when explicitly supplied',async()=>{
 const calls=[],client=createAIClient(async(url,options)=>{calls.push({url,options});return url.endsWith('/models')?Response.json({data:[]}):completed(JSON.stringify({review:'Check context.',shortTitle:'Walkway obstruction',observation:'Boxes partly obstructed the walkway.',correctiveAction:'Remove the boxes.'}));});
 await client.connect(key);const result=await client.suggest({...payload,action:'finding_improve'},'gpt-5-mini',undefined,[{url:'data:image/jpeg;base64,YQ==',reference:'P1',caption:'Selected photo'}]);
 assert.equal(result.shortTitle,'Walkway obstruction');const body=JSON.parse(calls[1].options.body);assert.equal(body.text.format.strict,true);assert.equal(body.text.format.type,'json_schema');
 assert.equal(body.input[0].content[1].type,'input_image');assert.equal(body.input[0].content[1].image_url,'data:image/jpeg;base64,YQ==');assert.ok(body.input[0].content[0].text.includes('Selected photo'));
 assert.ok(body.instructions.includes('Use reported facts and clearly visible conditions'));assert.equal(body.store,false);
 await assert.rejects(client.suggest({...payload,action:'finding_improve'},'gpt-5-mini',undefined,[{url:'https://untrusted.test/photo.jpg'}]),/invalid/);
});
test('malformed or oversized structured suggestions are rejected and review mode never returns applicable fields',()=>{
 assert.throws(()=>parseFindingSuggestion('not JSON','finding_improve'));
 for(const value of [{review:'a'}, {review:'a',shortTitle:'a'.repeat(121),observation:'b',correctiveAction:'c'}, {review:'a',shortTitle:'a',observation:'b',correctiveAction:'c',extra:'d'}])assert.throws(()=>parseFindingSuggestion(JSON.stringify(value),'finding_improve'));
 const result=parseFindingSuggestion(JSON.stringify({review:'Evidence gap',shortTitle:'Ignore this',observation:'Ignore this',correctiveAction:'Ignore this'}),'finding_review');assert.equal(result.observation,'');assert.equal(result.shortTitle,'');
});
test('compact AI button shows the selected model and connection status without exposing the key',async()=>{
 const h=uiHarness();assert.equal(h.el('aiButtonStatus').textContent,'AI · GPT-5 mini');assert.match(h.el('openAISettings').title,/Not connected/);
 await h.connect();assert.match(h.el('openAISettings').title,/Connected/);assert.doesNotMatch(h.el('openAISettings').title,new RegExp(key));
 h.el('aiModel').value='gpt-6.1-terra';h.el('aiModel').selectedOptions=[{textContent:'GPT-6.1 Terra'}];h.el('aiModel').onchange();assert.equal(h.el('aiButtonStatus').textContent,'AI · GPT-6.1 Terra');
 h.el('aiDisconnect').onclick();assert.match(h.el('openAISettings').title,/Not connected/);assert.equal(h.el('aiButtonStatus').textContent,'AI · GPT-6.1 Terra');
});
test('one click fills all finding fields without opening a review panel and one Undo restores all three',async()=>{
 const h=uiHarness();await h.connect();const before={...h.currentFields};await h.open('finding');
 assert.equal(h.applied,1);assert.equal(h.currentFields.shortTitle,'Partly obstructed walkway');assert.equal(h.currentFields.description,'Boxes partially obstructed the walkway.');assert.equal(h.currentFields.action,'Remove the boxes and keep the walkway clear.');
 assert.equal(h.el('aiDialog').open,false);assert.match(h.el('findingAIMessage').textContent,/AI updated/);assert.equal(h.el('findingAIUndo').hidden,false);
 h.el('findingAIUndo').onclick();assert.deepEqual(h.currentFields,before);assert.equal(h.undone,1);
 assert.equal(h.el('findingAIRedo').hidden,false);assert.equal(h.el('findingAIUndo').hidden,true);
 h.el('findingAIRedo').onclick();assert.equal(h.currentFields.shortTitle,'Partly obstructed walkway');assert.equal(h.currentFields.description,'Boxes partially obstructed the walkway.');assert.equal(h.currentFields.action,'Remove the boxes and keep the walkway clear.');
 assert.equal(h.el('findingAIRedo').hidden,true);assert.equal(h.el('findingAIUndo').hidden,false);
 h.el('findingAIUndo').onclick();assert.deepEqual(h.currentFields,before);
});
test('Redo protects manual edits and a fresh AI update clears the old Redo',async()=>{
 const h=uiHarness();await h.connect();await h.open('finding');h.el('findingAIUndo').onclick();
 h.currentFields.description='Manual revision';const edited={...h.currentFields};h.el('findingAIRedo').onclick();assert.deepEqual(h.currentFields,edited);assert.match(h.el('findingAIMessage').textContent,/Redo was not applied/);
 await h.open('finding');assert.equal(h.el('findingAIRedo').hidden,true);
 h.el('findingAIUndo').onclick();assert.deepEqual(h.currentFields,edited);h.api.reset();assert.equal(h.el('findingAIRedo').hidden,true);
});
test('finding instructions require direct observations without location attribution and toolbar uses labelled history icons before AI',()=>{
 const {instructions}=prepareRequest({...payload,action:'finding_improve'});
 assert.match(instructions,/State the observed condition first/);assert.match(instructions,/safety lapse or potential harm where reasonably supported/);assert.match(instructions,/Omit administrative building, floor, room and site/);assert.match(instructions,/Avoid source-attribution phrases/);assert.match(instructions,/Retain physical context/);assert.match(instructions,/Do not invent facts to make the observation definite/);assert.doesNotMatch(instructions,/Retain essential measurements, locations/);
 const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');assert.ok(html.indexOf('id="findingAIUndo"')<html.indexOf('id="findingAI"'));assert.ok(html.indexOf('id="findingAIRedo"')<html.indexOf('id="findingAI"'));assert.match(html,/aria-label="Undo AI wording"/);assert.match(html,/aria-label="Redo AI wording"/);
});
test('shared photo setting and model dropdown apply directly to finding requests',async()=>{
 const h=uiHarness(Array.from({length:8},(_,i)=>photo(i)));assert.equal(h.calls.length,0);await h.connect();h.el('aiModel').value='gpt-6.1-terra';await h.open('finding');
 let body=JSON.parse(h.calls.at(-1).options.body);assert.equal(body.model,'gpt-6.1-terra');assert.equal(body.input[0].content.filter(p=>p.type==='input_image').length,6);
 h.el('aiIncludePhotos').checked=false;await h.open('finding');body=JSON.parse(h.calls.at(-1).options.body);assert.equal(body.input[0].content.length,1);
});
test('missing connection opens only the shared settings popup without sending finding data',async()=>{
 const h=uiHarness();await h.open('finding');assert.equal(h.el('aiSettingsDialog').open,true);assert.equal(h.el('aiDialog').open,false);assert.equal(h.calls.length,0);
});
test('cancel, closing the editor and source changes prevent automatic application of a late result',async()=>{
 for(const cancel of [h=>h.el('findingAICancel').onclick(),h=>h.api.cancelFinding(),h=>h.makeStale()]){
  const h=uiHarness([],{deferred:true});await h.connect();const before={...h.currentFields},pending=h.open('finding');
  await new Promise(resolve=>setImmediate(resolve));assert.equal(h.el('findingAI').disabled,true);const count=h.calls.length;await h.open('finding');assert.equal(h.calls.length,count);
  cancel(h);h.release();await pending;assert.equal(h.applied,0);assert.deepEqual(h.currentFields,before);assert.equal(h.el('findingAI').disabled,false);
 }
});
test('concise wording rejects missing fields, excessive length and overly long titles without truncation',()=>{
 const valid={review:'',shortTitle:'Partly obstructed walkway',observation:'Boxes partially obstructed the walkway.',correctiveAction:'Remove the boxes.'};
 assert.throws(()=>parseFindingSuggestion(JSON.stringify({...valid,correctiveAction:''}),'finding_improve'));
 assert.throws(()=>parseFindingSuggestion(JSON.stringify({...valid,observation:'word '.repeat(61)}),'finding_improve'));
 assert.throws(()=>parseFindingSuggestion(JSON.stringify({...valid,shortTitle:'one two three four five six seven eight nine'}),'finding_improve'));
 const instructions=prepareRequest({...payload,action:'finding_improve'}).instructions;assert.ok(instructions.includes('without asserting that explanation'));assert.ok(instructions.includes('Move verification of the cause into the corrective action'));
});
test('photo selection excludes removed, unchecked or missing copies and preserves report order',()=>{
 const photos=[photo(1),photo(2,{removed:true}),photo(3,{include:false}),photo(4,{variant:'missing'}),photo(5)];assert.deepEqual(selectAIPhotos(photos).photos.map(p=>p.id),[1,5]);assert.deepEqual(selectAIPhotos(photos,false).photos,[]);assert.equal(selectAIPhotos(photos,false).total,2);
});
test('AI image copies respect rotation, aspect ratio and maximum dimensions without upscaling',()=>{
 assert.deepEqual(photoGeometry(2400,1200,90),{width:640,height:1280,drawWidth:1280,drawHeight:640,angle:90});assert.equal(photoGeometry(400,200,0).width,400);assert.equal(photoGeometry(400,200,-90).angle,270);assert.throws(()=>photoGeometry(400,200,45));
});
test('application bridge applies one field at a time and detects edits, photo changes and project replacement',()=>{
 const row={key:'r1',include:true,inspection:{id:'i1',date:'2026-11-13'},original:{reference:'F1'},edit:{shortTitle:'Initial',description:'Original observation',action:'Original action'},photos:[photo(1)]};
 const elements={summary:{value:'Original summary',closest:()=>({open:false})},draft_summary:{value:'Original summary'},draft_title:{value:'Synthetic'},reportDetailsDialog:{open:true}};let bridge;
 const context={reportDetailsSession:'details1',findingDraft:{sessionId:'edit1',original:row},state:{rows:[row],conflicts:[],busy:false,groupEdits:{}},AI_ENABLED:true,projectGeneration:1,document:{querySelector:()=>({hidden:true})},reportData:()=>({title:'Synthetic',rows:[row]}),loc:()=>'',render(){},textStatus(){},$:id=>elements[id],startAI:value=>{bridge=value;}};
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),start=app.indexOf('const aiSnapshot='),end=app.indexOf('\n});\n}',start)+7;
 vm.runInNewContext(app.slice(start,end),context);
 const summarySelection=bridge.select('summary',null);assert.deepEqual(Object.keys(summarySelection.payload.findings[0]),['shortTitle','observation','correctiveAction']);
 let selection=bridge.select('finding',0);assert.equal(selection.currentFields.shortTitle,'Initial');assert.equal(selection.photos.length,1);
 let change=bridge.apply(selection,'New title','shortTitle');assert.equal(row.edit.shortTitle,'New title');assert.equal(row.edit.description,'Original observation');
 assert.equal(bridge.apply(selection,'Stale action','action'),null);
 selection.snapshot=change.snapshot;change=bridge.apply(selection,'New action','action');assert.equal(row.edit.action,'New action');assert.ok(bridge.undo(change));assert.equal(row.edit.action,'Original action');
 selection=bridge.select('finding',0);row.photos[0].rotation=180;assert.equal(bridge.apply(selection,'Stale observation','description'),null);
 selection=bridge.select('finding',0);context.projectGeneration=2;assert.equal(bridge.apply(selection,'Wrong project','description'),null);
});
test('photo preparation uses edited image bytes, strips metadata through canvas, closes bitmaps and honours cancellation',async()=>{
 let decoded,closed=0,drawn=0,rotation;
 const canvas={width:0,height:0,getContext:()=>({fillRect(){},translate(){},rotate:value=>rotation=value,drawImage(){drawn++;}}),toBlob:callback=>callback(new Blob(['encoded JPEG'],{type:'image/jpeg'}))};
 class Reader{readAsDataURL(){this.result='data:image/jpeg;base64,YQ==';this.onload();}}
 const source=readFileSync(new URL('../dist/ai-photos.mjs',import.meta.url),'utf8').replaceAll('export ','')+'\nprepareAIPhotos';
 const prepare=vm.runInNewContext(source,{createImageBitmap:async blob=>{decoded=blob;return {width:2400,height:1200,close(){closed++;}};},document:{createElement:()=>canvas},FileReader:Reader,Math,Error,Promise,String});
 const p=photo(1),before=p.variants.report.blob,images=await prepare([p]);assert.equal(decoded,before);assert.equal(images[0].url,'data:image/jpeg;base64,YQ==');assert.equal(closed,1);assert.equal(drawn,1);assert.equal(rotation,Math.PI/2);assert.equal(canvas.width,0);assert.equal(p.variants.report.blob,before);
 const controller=new AbortController();controller.abort();await assert.rejects(prepare([p],controller.signal),{name:'AbortError'});assert.equal(closed,1);
});

test('application bridge applies and undoes the three fields atomically, retaining later manual changes',()=>{
 const row={key:'r1',include:true,inspection:{id:'i1',date:'2026-11-13'},original:{reference:'F1'},edit:{shortTitle:'Initial',description:'Original observation',action:'Original action'},photos:[]};let bridge;
 const context={reportDetailsSession:'details1',findingDraft:{sessionId:'edit1',original:row},state:{rows:[row],conflicts:[],busy:false,groupEdits:{}},AI_ENABLED:true,projectGeneration:1,document:{querySelector:()=>({hidden:true})},reportData:()=>({title:'Synthetic',rows:[row]}),loc:()=>'',render(){},textStatus(){},$:()=>({value:'',closest:()=>({})}),startAI:value=>{bridge=value;}};
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),start=app.indexOf('const aiSnapshot='),end=app.indexOf('\n});\n}',start)+7;vm.runInNewContext(app.slice(start,end),context);
 const before={...row.edit},selection=bridge.select('finding',0),result={shortTitle:'New short title',observation:'New observation.',correctiveAction:'Confirm the operating status.'};
 assert.equal(bridge.applyFinding(selection,{...result,correctiveAction:''}),null);assert.deepEqual(row.edit,before);
 const change=bridge.applyFinding(selection,result);assert.equal(row.edit.shortTitle,result.shortTitle);assert.equal(row.edit.description,result.observation);assert.equal(row.edit.action,result.correctiveAction);
 row.edit.action='Manual action';assert.equal(bridge.undo(change),false);assert.equal(row.edit.shortTitle,result.shortTitle);assert.equal(row.edit.action,'Manual action');
 row.edit.action=result.correctiveAction;assert.ok(bridge.undo(change));assert.deepEqual(row.edit,before);
 const next=bridge.select('finding',0);context.findingDraft={sessionId:'another-edit',original:row};assert.equal(bridge.applyFinding(next,result),null);assert.deepEqual(row.edit,before);
});

test('a failed one-click request leaves every field unchanged and restores the icon',async()=>{
 const h=uiHarness();await h.connect();const before={...h.currentFields};h.client.suggest=async()=>{throw Error('OpenAI is unavailable. Try again later; your report is unchanged.');};
 await h.open('finding');assert.equal(h.applied,0);assert.deepEqual(h.currentFields,before);assert.equal(h.el('findingAI').disabled,false);assert.match(h.el('findingAIMessage').textContent,/unavailable/);assert.equal(h.el('aiDialog').open,false);
});

test('executive summary input omits administrative details and requests only management-level findings and actions',()=>{
 const request=prepareRequest({...payload,action:'summary',findings:[{...payload.findings[0],reference:'FINDING-99',inspectionDate:'2026-10-22',location:'Room ADMIN-13A'}]});
 const input=JSON.parse(request.input);assert.deepEqual(Object.keys(input.findings[0]),['shortTitle','observation','correctiveAction']);
 for(const irrelevant of ['FINDING-99','2026-10-22','ADMIN-13A','must-not-send'])assert.ok(!request.input.includes(irrelevant));
 for(const rule of ['Target 60 to 100 words','up to 150 words only when needed','Do not add filler to reach a minimum length','do not establish the condition of the whole site','Distinguish observed conditions from potential harm','Do not turn a possible consequence into an actual incident','without repeating detailed corrective steps','only where explicitly recorded','Do not add generic calls','Do not invent severity ratings','Do not generalise from individual findings','Retain a specific detail only when essential'])assert.ok(request.instructions.includes(rule),rule);
 assert.ok(!request.instructions.includes('Target 60 to 90'));
 assert.ok(!request.instructions.includes('proportionate oversight'));
});
test('summary response preserves two plain paragraphs and accepts longer drafts without truncation',()=>{
 const text=JSON.stringify({overallPosition:'Access routes were partly obstructed. Electrical equipment arrangements also require attention.',managementAttention:'Remove stored items from access routes. Check the electrical arrangements and address the recorded defects.'});
 const summary=parseExecutiveSummary(text);assert.equal(summary.split('\n\n').length,2);assert.ok(summary.split(/\s+/).length<=90);
 assert.equal(parseExecutiveSummary(JSON.stringify({overallPosition:'word '.repeat(90),managementAttention:'One further word.'})).split(/\s+/).length,93);
 assert.throws(()=>parseExecutiveSummary(JSON.stringify({overallPosition:'Only findings.'})),/incomplete/);
 assert.throws(()=>parseExecutiveSummary('not JSON'),/not readable/);
});
test('summary API uses the two-paragraph schema and retains longer output for editing',async()=>{
 let captured,overlong=false;
 const client=createAIClient(async(url,options)=>{if(url.endsWith('/models'))return Response.json({data:[]});captured=JSON.parse(options.body);return completed(JSON.stringify({overallPosition:overlong?'word '.repeat(91):'The inspection identified an obstructed walkway.',managementAttention:'Remove the obstruction and keep the route clear.'}));});
 await client.connect(key);const summary=await client.suggest({...payload,action:'summary'},'gpt-5-mini');assert.equal(captured.text.format.name,'executive_summary');assert.equal(captured.text.format.strict,true);assert.equal(summary.split('\n\n').length,2);assert.equal(captured.input[0].content.length,1);
 overlong=true;assert.ok((await client.suggest({...payload,action:'summary'},'gpt-5-mini')).split(/\s+/).length>90);
});

test('summary Apply updates only the details draft and rejects changed or closed details sessions',()=>{
 const row={key:'r1',include:true,inspection:{id:'i1'},original:{reference:'F1'},edit:{description:'An observed issue.',action:'An established action.'},photos:[]};let bridge;
 const elements={summary:{value:'Saved summary'},draft_summary:{value:'Unsaved summary edit'},draft_title:{value:'Unsaved report title'},reportDetailsDialog:{open:true}};
 const context={reportDetailsSession:'details1',findingDraft:null,state:{rows:[row],conflicts:[],busy:false,groupEdits:{}},AI_ENABLED:true,projectGeneration:1,document:{querySelector:()=>({hidden:true})},reportData:()=>({title:'Saved title',rows:[row]}),loc:()=>'',render(){},textStatus(){},$:id=>elements[id],startAI:value=>{bridge=value;}};
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),start=app.indexOf('const aiSnapshot='),end=app.indexOf('\n});\n}',start)+7;vm.runInNewContext(app.slice(start,end),context);
 let selected=bridge.select('summary',null);assert.equal(selected.current,'Unsaved summary edit');assert.equal(selected.payload.title,'Unsaved report title');
 assert.ok(bridge.apply(selected,'New first paragraph.\n\nManagement follow-up.'));assert.equal(elements.draft_summary.value,'New first paragraph.\n\nManagement follow-up.');assert.equal(elements.summary.value,'Saved summary');
 selected=bridge.select('summary',null);elements.draft_summary.value='Later manual draft';assert.equal(bridge.apply(selected,'Stale summary'),null);assert.equal(elements.draft_summary.value,'Later manual draft');
 selected=bridge.select('summary',null);context.reportDetailsSession='details2';assert.equal(bridge.apply(selected,'Wrong session'),null);
 elements.reportDetailsDialog.open=false;assert.equal(bridge.select('summary',null),null);assert.equal(elements.summary.value,'Saved summary');
});

test('the saved summary uses a multiline control and the obsolete summary popup is absent',()=>{
 const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');assert.match(html,/<textarea\b[^>]*id="summary"[^>]*>/);assert.doesNotMatch(html,/<input\b[^>]*id="summary"/);assert.ok(!html.includes('id="aiDialog"'));assert.ok(!html.includes('id="aiApply"'));
});

 test('insufficient evidence returns review notes without applying empty fields or creating history',async()=>{
 const review={review:'Describe the concrete condition.',shortTitle:'',observation:'',correctiveAction:''};
 assert.deepEqual(parseFindingSuggestion(JSON.stringify(review),'finding_improve'),review);
 assert.throws(()=>parseFindingSuggestion(JSON.stringify({...review,review:''}),'finding_improve'));
 const h=uiHarness([],{reviewOnly:true});await h.connect();const before={...h.currentFields};await h.open('finding');
 assert.equal(h.applied,0);assert.deepEqual(h.currentFields,before);assert.match(h.el('findingAIMessage').textContent,/not changed/);assert.equal(h.el('findingAINotes').textContent,review.review);assert.equal(h.el('findingAIUndo').hidden,true);
 });

test('long summaries are shown intact with an advisory only above 150 words',async()=>{
 for(const count of [100,150,151]){
  const h=uiHarness();await h.connect();const text=Array(count-1).fill('word').join(' ')+'\n\nFollow-up.';
  h.client.suggest=async()=>text;await h.open();
  assert.equal(h.applied,1);assert.equal(h.el('draft_summary').value,text);
  assert.ok(h.el('draftSummaryMessage').textContent.includes(count+' words'));
  assert.equal(h.el('draftSummaryMessage').textContent.includes('above the suggested'),count>150);
 }
});
