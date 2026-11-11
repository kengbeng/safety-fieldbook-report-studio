import test from 'node:test';
import assert from 'node:assert/strict';
import {projectDeletion,purgeDeletedProjects,writeProject} from '../dist/projects.mjs';
test('deleting and restoring preserves all project content and advances revisions',()=>{
 const original={id:'report',revision:7,title:'Inspection',updatedAt:'2026-11-01',snapshot:{rows:[{photos:[{variants:{original:{blob:new Blob(['photo'])}}}],edit:{description:'Evidence'}}]}};
 const deleted=projectDeletion(original,7,true,'2026-11-06');
 assert.equal(deleted.deletedAt,'2026-11-06');assert.equal(deleted.revision,8);assert.equal(deleted.snapshot,original.snapshot);assert.equal(original.deletedAt,undefined);
 const restored=projectDeletion(deleted,8,false);assert.equal(restored.deletedAt,undefined);assert.equal(restored.revision,9);assert.equal(restored.updatedAt,original.updatedAt);assert.equal(restored.snapshot,original.snapshot);
});
test('stale deletion and restore requests cannot replace a newer report',()=>{
 const current={revision:4,snapshot:{title:'new edits'}};assert.throws(()=>projectDeletion(current,3,true),/another tab/);
 const deleted=projectDeletion(current,4,true);assert.throws(()=>projectDeletion(deleted,4,false),/another tab/);assert.throws(()=>projectDeletion(undefined,0,true),/no longer available/);
});
test('repeated deletion and restoration reject mismatched state',()=>{
 const record={revision:1};assert.throws(()=>projectDeletion(record,1,false),/already been restored/);
 const deleted=projectDeletion(record,1,true);assert.throws(()=>projectDeletion(deleted,2,true),/already deleted/);
});

function database(records){const data=new Map(records.map(record=>[record.id,record]));return {data,transaction(){let aborted=false,pending=0;const working=new Map(data),tx={error:null,abort(){aborted=true;queueMicrotask(()=>tx.onabort?.());},objectStore(){return {get(id){pending++;const request={};queueMicrotask(()=>{if(aborted)return;request.result=working.get(id);request.onsuccess?.();pending--;if(!pending)queueMicrotask(()=>{if(aborted)return;data.clear();for(const [key,value] of working)data.set(key,value);tx.oncomplete?.();});});return request;},put(record){working.set(record.id,record);},delete(id){working.delete(id);}};}};return tx;}};}
test('permanent deletion removes only selected deleted snapshots and blocks stale saves from recreating them',async()=>{const db=database([{id:'active',revision:2,snapshot:{rows:[]}},{id:'one',revision:3,deletedAt:'2026-11-11',snapshot:{photos:[new Blob(['photo'])]}},{id:'two',revision:4,deletedAt:'2026-11-11',snapshot:{photos:[new Blob(['other photo'])]}}]);assert.equal(await purgeDeletedProjects(db,[{id:'one',revision:3},{id:'two',revision:4}]),2);assert.deepEqual([...db.data.keys()],['active']);await assert.rejects(writeProject(db,{id:'one',snapshot:{}},3),/another tab/);assert.equal(db.data.has('one'),false);});
test('bulk purge rejects restored, changed or missing reports without deleting any selected report',async()=>{for(const second of [{id:'two',revision:4},{id:'two',revision:5,deletedAt:'2026-11-11'},null]){const first={id:'one',revision:3,deletedAt:'2026-11-11'},db=database([first,...(second?[second]:[])]),before=[...db.data];await assert.rejects(purgeDeletedProjects(db,[{id:'one',revision:3},{id:'two',revision:4}]),/restored, removed or changed/);assert.deepEqual([...db.data],before);}await assert.rejects(purgeDeletedProjects(database([]),[]),/Select deleted reports/);});
