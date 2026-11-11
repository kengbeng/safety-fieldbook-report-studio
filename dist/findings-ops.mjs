export function moveFinding(rows,key,targetKey){const from=rows.findIndex(r=>r.key===key),to=rows.findIndex(r=>r.key===targetKey);if(from<0||to<0||from===to)return rows;const next=[...rows],item=next.splice(from,1)[0];next.splice(to,0,item);return next;}
export function mergeFindings(rows,keys,id,title=''){
 const selected=rows.filter(r=>keys.includes(r.key));if(selected.length<2)throw Error('Select at least two findings.');if(selected.some(r=>r.mergeSources||r.mergedInto))throw Error('Undo an existing merge before combining those findings again.');if(new Set(selected.map(r=>r.inspection.id)).size!==1)throw Error('Select findings from the same inspection. This preserves their inspection date and source context.');
 const first=selected[0],unique=key=>[...new Set(selected.map(r=>r.edit[key]).filter(v=>v?.trim()))],same=key=>unique(key).length===1?unique(key)[0]:'',combine=key=>unique(key).join('\n\n'),photos=[],seen=new Set();
 for(const r of selected)for(const p of r.photos)if(!seen.has(p.id)){photos.push(structuredClone(p));seen.add(p.id);}
 const original={id,reference:'Merged',description:combine('description'),building:same('building'),floor:same('floor'),room:same('room')},merged={key:first.inspection.id+'|'+id,inspection:structuredClone(first.inspection),original,edit:{...original,shortTitle:title.trim(),category:combine('category'),priority:combine('priority'),action:combine('action'),remarks:combine('remarks')},include:true,photos,sources:[...new Set(selected.flatMap(r=>r.sources))],signature:'report-merge:'+id,mergeSources:selected.map(r=>({key:r.key,include:r.include,inspection:structuredClone(r.inspection),original:structuredClone(r.original),edit:structuredClone(r.edit)}))};
 // Differing locations stay attached to their observations instead of being silently discarded.
 if(new Set(selected.map(r=>[r.edit.building,r.edit.floor,r.edit.room].join(' / '))).size>1)merged.edit.description=selected.map(r=>[r.edit.building,r.edit.floor,r.edit.room].filter(Boolean).join(' / ')+': '+r.edit.description).join('\n\n');
 const next=rows.map(r=>keys.includes(r.key)?{...r,include:false,mergedInto:merged.key}:r);next.splice(rows.indexOf(first),0,merged);return {rows:next,key:merged.key};
}
export function undoFindingMerge(rows,key){const merged=rows.find(r=>r.key===key);if(!merged?.mergeSources)throw Error('This finding has no merge to undo.');const originals=new Map(merged.mergeSources.map(s=>[s.key,s]));return rows.filter(r=>r.key!==key).map(r=>{const source=originals.get(r.key);if(!source)return r;const {mergedInto,...rest}=r;return {...rest,include:source.include};});}

export function groupFindingsByInspection(rows){const ids=[...new Set(rows.map(r=>r.inspection.id))];return ids.flatMap(id=>rows.filter(r=>r.inspection.id===id));}

export function sortFindingsByRoom(rows,direction='ascending'){
 if(!['ascending','descending'].includes(direction))throw Error('Choose ascending or descending room order.');
 const collator=new Intl.Collator('en-SG',{numeric:true,sensitivity:'base'}),fields=['building','floor','room'],value=(row,key)=>String(row.edit?.[key]??'').trim(),complete=row=>fields.every(key=>value(row,key)),factor=direction==='ascending'?1:-1;
 const sorted=rows.filter(row=>row.include&&!row.mergedInto).map((row,index)=>({row,index})).sort((a,b)=>{
  const missing=Number(!complete(a.row))-Number(!complete(b.row));if(missing)return missing;
  for(const key of fields){const av=value(a.row,key),bv=value(b.row,key);if(!av||!bv){if(!!av!==!!bv)return av?-1:1;continue;}const order=collator.compare(av,bv);if(order)return order*factor;}
  return a.index-b.index;
 }).map(item=>item.row);
 let index=0;return rows.map(row=>row.include&&!row.mergedInto?sorted[index++]:row);
}
export function restoreFindingOrder(rows,keys){const byKey=new Map(rows.map(row=>[row.key,row])),restored=[];for(const key of keys){if(byKey.has(key)){restored.push(byKey.get(key));byKey.delete(key);}}return [...restored,...byKey.values()];}
