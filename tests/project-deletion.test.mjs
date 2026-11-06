import test from 'node:test';
import assert from 'node:assert/strict';
import {projectDeletion} from '../dist/projects.mjs';
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
