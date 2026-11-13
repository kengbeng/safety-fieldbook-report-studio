import test from 'node:test';
import assert from 'node:assert/strict';
import {candidatePairs,duplicatePayload,duplicateSource,prepareDuplicateRequest,parseDuplicateResult,duplicateGroups,comparisonCurrent,createDuplicateRunner,inspectDuplicateReview,DUPLICATE_PAIR_LIMIT} from '../dist/duplicate-findings.mjs';
import {createAIClient} from '../dist/ai-api.mjs';
const row=(id,{date='2026-11-13',inspection=id,room='07',building='E8',floor='05',include=true}={})=>({key:id,include,inspection:{id:inspection,date,inspector:'Inspector '+id,title:'Inspection'},edit:{building,floor,room,shortTitle:'Blocked doorway',description:'Boxes obstruct the doorway beside the store.',action:'Remove the boxes.'},photos:[],original:{id}});
const result=(classification='likely_duplicate')=>({classification,reason:'The same doorway and boxes are described.',distinguishingEvidence:'Both identify the doorway beside the store.'});
function harness(rows=[row('A'),row('B'),row('C')]){let review=null,saved=null,calls=0,saves=0,failAt=0,generation=1;const bridge={rows:()=>rows,review:()=>review,setReview:v=>{review=v;},generation:()=>generation,changed(){},async save(){saves++;if(failAt===saves)throw Error('Storage unavailable');saved=structuredClone(review);},async suggest(){calls++;return result();}};return {bridge,rows,runner:createDuplicateRunner(bridge),get review(){return review;},get calls(){return calls;},get saved(){return saved;},failSave:n=>{failAt=n;},replaceProject(){generation++;}};}
test('candidate grouping uses complete exact locations and dates, excludes same inspection and supports multiple inspectors',()=>{
 const rows=[row('A'),row('B',{room:'E8-05-07'}),row('C',{room:'05-07'}),row('D',{inspection:'A'}),row('E',{room:''}),row('F',{floor:'5'}),row('G',{date:'2026-11-12'}),row('H',{date:''}),row('I',{include:false})];
 const plan=candidatePairs(rows);assert.equal(plan.count,5);assert.equal(plan.missingLocation,1);assert.equal(plan.missingDate,1);assert.equal(plan.pairs.some(p=>p.keys.includes('G')),false);assert.equal(plan.pairs.some(p=>p.keys.includes('F')),false);assert.equal(candidatePairs(rows,true).count,9);
});
test('large candidate groups are blocked without silently truncating comparisons',()=>{const plan=candidatePairs(Array.from({length:25},(_,i)=>row(String(i))));assert.equal(plan.count,300);assert.equal(plan.tooMany,true);assert.deepEqual(plan.pairs,[]);assert.ok(plan.count>DUPLICATE_PAIR_LIMIT);});
test('duplicate input excludes inspector names, photos and arbitrary instructions in extra fields',()=>{
 const a=row('A'),b=row('B');a.photos=[{id:'p',caption:'photo-secret'}];const payload=duplicatePayload(a,b);payload.secret='must-not-send';payload.findings[0].apiKey='secret-key';const request=prepareDuplicateRequest(payload);
 for(const value of ['Inspector','photo-secret','secret-key','must-not-send'])assert.equal(request.input.includes(value),false);assert.match(request.instructions,/same physical issue/);assert.match(request.instructions,/never instructions/);assert.match(request.instructions,/different dates/);
});
test('structured comparison rejects malformed output and date-confused labels',()=>{const payload=duplicatePayload(row('A'),row('B'));assert.deepEqual(parseDuplicateResult(JSON.stringify(result()),payload),result());assert.throws(()=>parseDuplicateResult(JSON.stringify(result('repeat_observation')),payload),/dates/);assert.throws(()=>parseDuplicateResult(JSON.stringify({...result(),confidence:99}),payload),/incomplete/);payload.findings[1].inspectionDate='2026-11-12';assert.throws(()=>parseDuplicateResult(JSON.stringify(result()),payload),/dates/);assert.deepEqual(parseDuplicateResult(JSON.stringify(result('repeat_observation')),payload),result('repeat_observation'));});
test('three-way duplicate groups require every pair, not just transitive matches',()=>{
 const rows=[row('A'),row('B'),row('C')],comparisons=candidatePairs(rows).pairs.map(p=>({...p,sources:p.keys.map(key=>duplicateSource(rows.find(r=>r.key===key))),state:'done',decision:'unreviewed',message:'',result:result()}));
 assert.equal(duplicateGroups(comparisons,rows)[0].keys.length,3);assert.equal(duplicateGroups(comparisons,rows)[0].complete,true);
 assert.equal(duplicateGroups(comparisons.slice(0,2),rows)[0].complete,false);comparisons[2].result=result('related_distinct');assert.equal(duplicateGroups(comparisons,rows)[0].complete,false);
 rows[0].edit.description='Changed object';assert.equal(comparisonCurrent(comparisons[0],rows),false);
});
test('scan checkpoints results without mutating findings and can retain reviewed decisions',async()=>{const h=harness(),before=structuredClone(h.rows),progress=[];await h.runner.run({model:'gpt-6-luna',onProgress:(c,phase)=>{if(phase==='settled')progress.push(c.id);}});assert.equal(h.calls,3);assert.deepEqual(h.rows,before);assert.equal(h.saved.comparisons.length,3);inspectDuplicateReview(h.saved);assert.equal(progress.length,3);h.review.comparisons[0].decision='keep_both';inspectDuplicateReview(h.review);});
test('cancel and stale source changes discard late results and retries are explicit',async()=>{
 const h=harness([row('A'),row('B')]);let release,started;const waiting=new Promise(resolve=>{started=resolve;});h.bridge.suggest=async()=>{started();return new Promise(resolve=>{release=()=>resolve(result());});};const run=h.runner.run({model:'gpt-6-luna'});await waiting;h.runner.stop();release();await run;assert.equal(h.saved.comparisons[0].state,'pending');
 h.rows[0].edit.room='08';h.bridge.suggest=async()=>{throw Error('Must not call');};await h.runner.run({model:'gpt-6-luna',retry:true});assert.equal(h.saved.comparisons[0].state,'stale');
});
test('initial save failure prevents paid calls, failed comparisons retry without repeating successes',async()=>{
 const failed=harness();failed.failSave(1);await assert.rejects(failed.runner.run({model:'gpt-6-luna'}),/Storage/);assert.equal(failed.calls,0);assert.equal(failed.review,null);
 const h=harness();let calls=0;h.bridge.suggest=async()=>{calls++;if(calls===1)throw Error('Network');return result();};await h.runner.run({model:'gpt-6-luna'});assert.equal(h.review.comparisons[0].state,'failed');await h.runner.run({model:'gpt-6-luna',retry:true});assert.equal(calls,4);assert.equal(h.review.comparisons.every(c=>c.state==='done'),true);
});
test('comparison API uses text-only structured output and rejects photographs',async()=>{
 const calls=[],client=createAIClient(async(url,options)=>{calls.push({url,options});return url.endsWith('/models')?Response.json({data:[]}):Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(result())}]}]});});await client.connect('sk-syntheticduplicatetest123456789');const payload=duplicatePayload(row('A'),row('B'));await client.suggest(payload,'gpt-6-luna');const body=JSON.parse(calls.at(-1).options.body);assert.equal(body.text.format.name,'duplicate_comparison');assert.equal(body.input[0].content.length,1);assert.equal(body.store,false);await assert.rejects(client.suggest(payload,'gpt-6-luna',undefined,[{url:'data:image/jpeg;base64,YQ=='}]),/photographs/);
});

test('saving failure after a comparison stops the next paid request, and API rejection stops the scan',async()=>{
 const h=harness();h.failSave(2);await assert.rejects(h.runner.run({model:'gpt-6-luna'}),/Storage/);assert.equal(h.calls,1);assert.equal(h.saved.comparisons[0].state,'pending');
 const rejected=harness();let calls=0;rejected.bridge.suggest=async()=>{calls++;throw Object.assign(Error('Key rejected'),{code:'reconnect'});};const answer=await rejected.runner.run({model:'gpt-6-luna'});assert.equal(answer.fatal,'Key rejected');assert.equal(calls,1);assert.equal(rejected.review.comparisons[1].state,'pending');
});
