export const LIMITS={zip:200*1024**2,session:500*1024**2,expanded:1024*1024**2,entries:5000};
export function safePath(p){if(typeof p!=='string'||!p||p.includes('\\')||p.startsWith('/')||p.includes(':')||p.split('/').some(x=>x==='..'||x===''))throw Error('Unsafe archive path: '+p);return p;}
export function validate(d){
 if(d.schemaVersion!==3)throw Error('Unsupported schema version. This release supports version 3.');
 for(const k of ['id','title','date','inspector'])if(typeof d[k]!=='string'||(k==='id'&&!d[k]))throw Error('Invalid inspection '+k);
 if(!Array.isArray(d.findings))throw Error('Missing findings array');
 const seen=new Set();for(const f of d.findings){if(typeof f.id!=='string'||!f.id||seen.has(f.id))throw Error('Missing or repeated finding ID');seen.add(f.id);
 for(const k of ['description','building','floor','room','reference','folder'])if(typeof f[k]!=='string')throw Error('Invalid finding '+k);safePath(f.folder);
 if(!Array.isArray(f.photos))throw Error('Invalid photographs');const ps=new Set();
 for(const p of f.photos){if(typeof p.id!=='string'||!p.id||ps.has(p.id))throw Error('Missing or repeated photograph ID');ps.add(p.id);for(const k of ['original','annotated'])if(p[k])safePath(p[k]);}
 }return d;
}
export const keyFor=(inspection,finding)=>inspection.id+'|'+finding.id;
export function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value);}
export function fingerprint(f,hashes){const copy=structuredClone(f);delete copy.reference;delete copy.folder;copy.photos=copy.photos.map(p=>{const q={...p};delete q.reference;delete q.original;delete q.annotated;return q;});return stable({finding:copy,hashes});}
export function counts(rows){const selected=rows.filter(r=>r.include);return{findings:selected.length,photos:selected.reduce((n,r)=>n+r.photos.filter(p=>p.include&&!p.removed).length,0),withPhotos:selected.filter(r=>r.photos.some(p=>p.include&&!p.removed)).length,inspections:new Set(selected.map(r=>r.inspection.id)).size};}
export function parseCSV(text){const rows=[];let row=[],cell='',quote=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(c===','&&!quote){row.push(cell);cell='';}else if((c==='\r'||c==='\n')&&!quote){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}row.push(cell);if(row.some(Boolean))rows.push(row);if(quote)throw Error('Unclosed CSV quote');return rows.map((r,i)=>i===0?r.map(s=>s.replace(/^\uFEFF/,'')):r);}

export function checkArchiveSize(size,total=0){if(size>LIMITS.zip)throw Error('ZIP exceeds the 200 MB file limit.');if(total+size>LIMITS.session)throw Error('Total imported ZIPs exceed the 500 MB report limit.');}
export function checkExpandedSize(size,total=0){if(total+size>LIMITS.expanded)throw Error('This report exceeds the 1 GB expanded file limit.');}
