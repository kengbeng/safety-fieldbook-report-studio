import test from 'node:test';
import assert from 'node:assert/strict';
import {createBatchRunner,wording,batchCounts,inspectBatch} from '../dist/ai-batch.mjs';
const row=(key,extra={})=>({key,include:true,inspection:{id:'i'},original:{id:key},edit:{shortTitle:'Before '+key,description:'Observed '+key,action:'Original action'},photos:[],...extra});
const suggestion=key=>({shortTitle:'Updated '+key,observation:'Improved '+key,correctiveAction:'Fix '+key,review:''});
function harness(rows=[row('1'),row('2')]){
 let journal=null,persisted=null,saves=0,calls=0,failSave=0,generation=1;
 const bridge={rows:()=>rows,journal:()=>journal,setJournal:v=>{journal=v;},generation:()=>generation,changed(){},async save(){saves++;if(saves===failSave)throw Error('Storage full');persisted=structuredClone({journal,rows});},async suggest(r){calls++;return suggestion(r.key);}};
 const runner=createBatchRunner(bridge);
 return {bridge,runner,rows,get journal(){return journal;},get persisted(){return persisted;},get saves(){return saves;},get calls(){return calls;},failSave(n){failSave=n;},switchProject(){generation++;},run:options=>runner.run({model:'gpt-6-luna',photos:false,...options})};
}
test('batch updates only included unmerged findings sequentially and checkpoints recovery before requests',async()=>{
 const h=harness([row('1'),row('2',{include:false}),row('3',{mergedInto:'1'}),row('4'),row('5',{edit:{shortTitle:'',description:'',action:''}})]);let active=0;
 h.bridge.suggest=async r=>{assert.ok(h.persisted.journal);assert.equal(++active,1);await Promise.resolve();active--;return suggestion(r.key);};
 await h.run();assert.equal(h.rows[0].edit.description,'Improved 1');assert.equal(h.rows[1].edit.description,'Observed 2');assert.equal(h.rows[2].edit.description,'Observed 3');assert.deepEqual(batchCounts(h.journal),{updated:2,failed:0,skipped:1,pending:0,undone:0});inspectBatch(h.persisted.journal);
});
test('failed initial recovery save sends no paid requests',async()=>{const h=harness();h.failSave(1);await assert.rejects(h.run(),/Storage full/);assert.equal(h.calls,0);assert.equal(h.rows[0].edit.description,'Observed 1');});
test('stop discards a late response and leaves completed updates and pending originals recoverable',async()=>{
 const h=harness();let release,started;const waiting=new Promise(resolve=>{started=resolve;});
 h.bridge.suggest=async r=>{if(r.key==='1')return suggestion('1');started();return new Promise(resolve=>{release=()=>resolve(suggestion('2'));});};
 const pending=h.run();await waiting;h.runner.stop();release();await pending;
 assert.equal(h.rows[0].edit.description,'Improved 1');assert.equal(h.rows[1].edit.description,'Observed 2');assert.equal(h.persisted.journal.status,'stopped');assert.equal(h.persisted.journal.entries[1].status,'pending');
});
test('missing evidence and changed photo context never overwrite findings',async()=>{
 const h=harness();h.bridge.suggest=async r=>{if(r.key==='1')return {shortTitle:'',observation:'',correctiveAction:'',review:'Confirm the actual condition.'};r.photos.push({id:'new',variant:'original'});return suggestion('2');};
 await h.run();assert.equal(batchCounts(h.journal).skipped,2);assert.equal(h.rows[1].edit.description,'Observed 2');
});
test('save failure rolls back the current finding and stops further paid requests',async()=>{
 const h=harness();h.failSave(2);await assert.rejects(h.run(),/Storage full/);assert.equal(h.calls,1);assert.equal(h.rows[0].edit.description,'Observed 1');assert.equal(h.persisted.journal.entries[0].status,'pending');
});
test('explicit retry handles failed findings without repeating successes; upstream rejection stops batch',async()=>{
 const h=harness();let calls=[];h.bridge.suggest=async r=>{calls.push(r.key);if(r.key==='1')throw Error('Image preparation failed');return suggestion(r.key);};await h.run();assert.deepEqual(calls,['1','2']);
 h.bridge.suggest=async r=>{calls.push(r.key);return suggestion(r.key);};await h.run({retry:true});assert.deepEqual(calls,['1','2','1']);
 const rejected=harness();rejected.bridge.suggest=async()=>{throw Object.assign(Error('Key rejected'),{code:'reconnect'});};const result=await rejected.run();assert.equal(result.fatal,'Key rejected');assert.equal(rejected.journal.entries[1].status,'pending');
});
test('Undo survives reopening, protects manual edits, and requires explicit recovery clearing before a new batch',async()=>{
 const h=harness();await h.run();const saved=structuredClone(h.persisted);const reopened=harness(saved.rows);reopened.bridge.setJournal(saved.journal);reopened.rows[1].edit.action='Later manual action';
 const result=await reopened.runner.undo();assert.deepEqual(result,{restored:1,protectedCount:1});assert.deepEqual(wording(reopened.rows[0]),saved.journal.entries[0].before);assert.equal(reopened.rows[1].edit.action,'Later manual action');
 await assert.rejects(reopened.run(),/previous batch/);await reopened.runner.clear();assert.equal(reopened.persisted.journal,null);
});
test('Undo saving failure retains the AI wording and recovery',async()=>{const h=harness([row('1')]);await h.run();h.failSave(h.saves+1);await assert.rejects(h.runner.undo(),/Storage full/);assert.equal(h.rows[0].edit.description,'Improved 1');assert.equal(h.journal.entries[0].status,'updated');});
test('malformed batch recovery cannot be imported',()=>{assert.throws(()=>inspectBatch({version:1}),/Invalid/);const h=harness();return h.run().then(()=>{const j=structuredClone(h.journal);j.entries.push(j.entries[0]);assert.throws(()=>inspectBatch(j),/Invalid/);});});
