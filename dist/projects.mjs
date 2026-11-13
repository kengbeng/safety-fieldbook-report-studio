import {inspectDuplicateReview} from './duplicate-findings.mjs';
import {inspectBatch} from './ai-batch.mjs';
import {REPORT_FIELDS} from './report-fields.mjs';
export const PROJECT_FORMAT='safety-fieldbook-report-project';
export const PROJECT_VERSION=1;
export const BACKUP_LIMIT=1100*1024**2;
export function stripURLs(snapshot){
 const result=structuredClone(snapshot);
 const rows=[...(result.rows||[]),...(result.conflicts||[]).map(c=>c.incoming)];
 for(const row of rows)for(const p of row.photos||[])for(const v of Object.values(p.variants||{}))if(v)delete v.url;
 return result;
}
export function inspectSnapshot(s){
 if(!s||!Array.isArray(s.rows)||!Array.isArray(s.conflicts)||!Array.isArray(s.imports)||!s.fields||typeof s.fields!=='object')throw Error('Invalid project content.');
 for(const k of ['title','department','reference','purpose','summary','preparedDate'])if(typeof s.fields[k]!=='string')throw Error('Invalid report field: '+k);
 for(const k of ['coverPage','includeContents','compactFindings','compactPhotoAppendix','pptSinglePhoto','pptSourceAppendix','departmentResponse','includeRecommendedAction'])if(s.fields[k]!==undefined&&typeof s.fields[k]!=='boolean')throw Error('Invalid layout option.');
 if(s.fields.reportFieldSelection!==undefined&&(!Array.isArray(s.fields.reportFieldSelection)||new Set(s.fields.reportFieldSelection).size!==s.fields.reportFieldSelection.length||s.fields.reportFieldSelection.some(key=>!REPORT_FIELDS.some(([known])=>known===key))))throw Error('Invalid report field selection.');
 if(s.fields.reportFieldPreset!==undefined&&!['inspection','followup'].includes(s.fields.reportFieldPreset))throw Error('Invalid report field preset.');
 if(s.fields.findingsLayout!==undefined&&!['individual','consolidated'].includes(s.fields.findingsLayout))throw Error('Invalid findings layout.');
 if(!s.groupEdits||typeof s.groupEdits!=='object'||Array.isArray(s.groupEdits))throw Error('Invalid inspection edits.');
 for(const g of Object.values(s.groupEdits))for(const k of ['id','title','date','inspector'])if(typeof g?.[k]!=='string')throw Error('Invalid inspection details.');
 inspectBatch(s.aiBatch);inspectDuplicateReview(s.duplicateReview);
 const ids=new Set();for(const row of s.rows){checkRow(row);if(ids.has(row.key))throw Error('Repeated finding in project.');ids.add(row.key);}
 for(const r of s.rows){if(r.mergedInto!==undefined&&(typeof r.mergedInto!=='string'||!ids.has(r.mergedInto)))throw Error('Invalid merged finding link.');if(r.mergeSources!==undefined&&(!Array.isArray(r.mergeSources)||r.mergeSources.length<2||r.mergeSources.some(source=>!ids.has(source.key)||typeof source.include!=='boolean'||typeof source.original?.id!=='string'||typeof source.inspection?.id!=='string')))throw Error('Invalid merged source records.');}
 for(const c of s.conflicts){if(!ids.has(c.key)||typeof c.id!=='string')throw Error('Invalid conflict reference.');checkRow(c.incoming);if(c.incoming.key!==c.key)throw Error('Conflict does not match its finding.');}
 for(const log of s.imports)if(!log||typeof log.name!=='string'||typeof log.status!=='string'||!Array.isArray(log.warnings)||log.warnings.some(x=>typeof x!=='string'))throw Error('Invalid import register.');
 for(const k of ['bytes','expanded'])if(!Number.isFinite(s[k])||s[k]<0)throw Error('Invalid project size.');
 return s;
}
function checkRow(r){
 if(!r||typeof r.key!=='string'||typeof r.include!=='boolean'||!Array.isArray(r.photos)||!Array.isArray(r.sources)||r.sources.some(x=>typeof x!=='string')||typeof r.signature!=='string')throw Error('Invalid finding record.');
 for(const k of ['id','title','date','inspector'])if(typeof r.inspection?.[k]!=='string')throw Error('Invalid source inspection.');
 if(typeof r.original?.id!=='string'||r.key!==r.inspection.id+'|'+r.original.id)throw Error('Finding identity mismatch.');
 if(r.edit?.shortTitle!==undefined&&typeof r.edit.shortTitle!=='string')throw Error('Invalid short finding title.');
 for(const k of ['description','building','floor','room','category','priority','action','remarks'])if(typeof r.edit?.[k]!=='string')throw Error('Invalid finding field: '+k);
 for(const p of r.photos){for(const k of ['removed','includedBeforeRemoval','addedInReport'])if(p[k]!==undefined&&typeof p[k]!=='boolean')throw Error('Invalid photo state.');if(p.editBaseVariant!==undefined&&!['original','annotated'].includes(p.editBaseVariant))throw Error('Invalid source photo selection.');if(p.editBaseRotation!==undefined&&![0,90,180,270].includes(p.editBaseRotation))throw Error('Invalid source photo rotation.');if(p.reportEditRevision!==undefined&&(!Number.isInteger(p.reportEditRevision)||p.reportEditRevision<0))throw Error('Invalid photo edit revision.');if(p.caption!==undefined&&typeof p.caption!=='string')throw Error('Invalid photograph caption.');if(typeof p.id!=='string'||typeof p.reference!=='string'||typeof p.include!=='boolean'||!['original','annotated','report'].includes(p.variant)||![0,90,180,270].includes(p.rotation||0)||!p.variants)throw Error('Invalid photograph record.');if(p.variant==='report'&&(!['original','annotated'].includes(p.editBaseVariant)||!p.variants[p.editBaseVariant]))throw Error('Edited photo is missing its imported source.');for(const [kind,v]of Object.entries(p.variants)){if(!['original','annotated','report'].includes(kind))throw Error('Unknown image variant.');if(v&&!['image/jpeg','image/png'].includes(v.mime))throw Error('Unsupported project image format.');}}
}
export function projectSummary(snapshot){
 const rows=snapshot.rows.filter(r=>r.include),groups=[...new Map(rows.map(r=>[r.inspection.id,snapshot.groupEdits[r.inspection.id]||r.inspection])).values()];
 const dates=[...new Set(groups.map(g=>g.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
 return {findingCount:rows.length,inspectionCount:groups.length,photoCount:rows.reduce((n,r)=>n+r.photos.filter(p=>p.include&&!p.removed).length,0),dates,locations:[...new Set(rows.map(r=>[r.edit.building,r.edit.floor,r.edit.room].filter(Boolean).join(' / ')).filter(Boolean))],locationDetails:rows.map(r=>({building:r.edit.building,floor:r.edit.floor,room:r.edit.room})),conflictCount:snapshot.conflicts.length};
}
export function matchesProject(project,query,from,to){
 const haystack=[project.title,...project.locations].join(' ').toLowerCase();
 return haystack.includes(query.trim().toLowerCase())&&(!(from||to)||project.dates.some(d=>(!from||d>=from)&&(!to||d<=to)));
}
export async function openProjectDB(){return new Promise((resolve,reject)=>{const request=indexedDB.open('safety-fieldbook-report-studio',1);request.onupgradeneeded=()=>request.result.createObjectStore('projects',{keyPath:'id'});request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Close other report-studio tabs, then try again.'));});}
export function readProjects(db){return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readonly'),request=tx.objectStore('projects').getAll();request.onsuccess=()=>resolve(request.result.map(({snapshot,...meta})=>snapshot?{...meta,...projectSummary(snapshot)}:meta));request.onerror=()=>reject(request.error);});}
export function readProject(db,id){return new Promise((resolve,reject)=>{const req=db.transaction('projects','readonly').objectStore('projects').get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export function writeProject(db,project,expectedRevision){return new Promise((resolve,reject)=>{
 const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects'),request=store.get(project.id);let conflict=false;
 request.onsuccess=()=>{const previous=request.result;if(previous?.deletedAt||(previous?.revision||0)!==expectedRevision){conflict=true;tx.abort();return;}store.put({...project,revision:expectedRevision+1});};
 tx.oncomplete=()=>resolve(expectedRevision+1);tx.onerror=()=>reject(tx.error||Error('Unable to save on this device.'));tx.onabort=()=>reject(conflict?Error('This report changed in another tab. Download a backup of your edits, then reopen the saved report.'):tx.error||Error('Unable to save on this device.'));
 });}
export async function packProject(snapshot,JSZip){
 inspectSnapshot(snapshot);const data=stripURLs(snapshot),zip=new JSZip();let index=0,total=0;
 for(const row of [...data.rows,...data.conflicts.map(c=>c.incoming)])for(const p of row.photos)for(const v of Object.values(p.variants))if(v){if(!(v.blob instanceof Blob))throw Error('A project image is missing.');total+=v.blob.size+1024;if(total>BACKUP_LIMIT)throw Error('Project backup exceeds 1.1 GB. Split this report before backing up.');const path='media/'+(++index)+(v.mime==='image/png'?'.png':'.jpg');zip.file(path,await v.blob.arrayBuffer());v.file=path;delete v.blob;}
 const metadata=JSON.stringify({format:PROJECT_FORMAT,version:PROJECT_VERSION,exportedAt:new Date().toISOString(),snapshot:data});if(total+new TextEncoder().encode(metadata).length>BACKUP_LIMIT)throw Error('Project backup exceeds 1.1 GB. Split this report before backing up.');zip.file('project.json',metadata);return zip.generateAsync({type:'blob',compression:'STORE'});
}
export async function unpackProject(file,JSZip){
 if(file.size>BACKUP_LIMIT)throw Error('Project backup exceeds 1.1 GB.');const zip=await JSZip.loadAsync(file,{checkCRC32:true}),entries=Object.values(zip.files);if(entries.length>5000)throw Error('Too many files in project backup.');
 let total=0;for(const entry of entries){const path=entry.unsafeOriginalName||entry.name;if(path.startsWith('/')||path.includes('\\')||path.includes(':')||path.split('/').includes('..'))throw Error('Unsafe backup path.');total+=entry._data?.uncompressedSize||0;}if(total>BACKUP_LIMIT)throw Error('Expanded project exceeds 1.1 GB.');
 const manifest=zip.file('project.json');if(!manifest||manifest._data.uncompressedSize>20*1024**2)throw Error('Project manifest is missing or too large.');const data=JSON.parse(await manifest.async('string'));if(data.format!==PROJECT_FORMAT||data.version!==PROJECT_VERSION)throw Error('Unsupported project backup. Choose a Report Studio project backup, not a Fieldbook export.');
 const snapshot=inspectSnapshot(data.snapshot);
 for(const row of [...snapshot.rows,...snapshot.conflicts.map(c=>c.incoming)])for(const p of row.photos)for(const v of Object.values(p.variants))if(v){if(typeof v.file!=='string'||!/^media\/\d+\.(jpg|png)$/.test(v.file))throw Error('Invalid project image reference.');const image=zip.file(v.file);if(!image)throw Error('Missing project image: '+v.file);const bytes=await image.async('uint8array');const jpeg=bytes[0]===255&&bytes[1]===216,png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;if((v.mime==='image/jpeg'&&!jpeg)||(v.mime==='image/png'&&!png))throw Error('Invalid image data in backup.');v.blob=new Blob([bytes],{type:v.mime});delete v.file;}
 return snapshot;
}

export function projectDeletion(record,expectedRevision,deleted,now=new Date().toISOString()){
 if(!record)throw Error('This report is no longer available.');
 if(record.revision!==expectedRevision)throw Error('This report changed in another tab. Refresh the report list and try again.');
 if(!!record.deletedAt===deleted)throw Error(deleted?'This report is already deleted.':'This report has already been restored.');
 const next={...record,revision:record.revision+1};
 if(deleted)next.deletedAt=now;else delete next.deletedAt;
 return next;
}
export function setProjectDeleted(db,id,revision,deleted){return new Promise((resolve,reject)=>{
 const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects'),request=store.get(id);let result,failure;
 request.onsuccess=()=>{try{result=projectDeletion(request.result,revision,deleted);store.put(result);}catch(e){failure=e;tx.abort();}};
 tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(failure||tx.error||Error('Unable to update this report.'));tx.onabort=()=>reject(failure||tx.error||Error('Unable to update this report.'));
});}

export function purgeDeletedProjects(db,targets){return new Promise((resolve,reject)=>{
 if(!Array.isArray(targets)||!targets.length||targets.some(t=>!t||typeof t.id!=='string'||!Number.isInteger(t.revision))||new Set(targets.map(t=>t.id)).size!==targets.length){reject(Error('Select deleted reports to remove.'));return;}
 const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects');let failure,checked=0;
 for(const target of targets){const request=store.get(target.id);request.onsuccess=()=>{if(failure)return;const record=request.result;if(!record?.deletedAt||record.revision!==target.revision){failure=Error('A selected report was restored, removed or changed in another tab. Close this dialog, refresh the list and try again.');tx.abort();return;}checked++;if(checked===targets.length)for(const item of targets)store.delete(item.id);};}
 tx.oncomplete=()=>resolve(targets.length);tx.onerror=()=>reject(failure||tx.error||Error('Unable to permanently delete reports.'));tx.onabort=()=>reject(failure||tx.error||Error('Unable to permanently delete reports.'));
});}
