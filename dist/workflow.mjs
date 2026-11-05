export function visibleFindings(rows,{inspection='',query='',inclusion='all'}={}){
 const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 return rows.filter(r=>{
  if(inspection&&r.inspection.id!==inspection)return false;
  if(inclusion==='included'&&!r.include||inclusion==='excluded'&&r.include)return false;
  const haystack=[r.original.reference,r.inspection.title,...['shortTitle','description','building','floor','room','category','priority','action','remarks'].map(k=>r.edit[k])].join(' ').toLowerCase();
  return words.every(w=>haystack.includes(w));
 });
}
export function reportCheck(data){
 const notes=[];if(!data.title?.trim())notes.push('Report title is blank. A default title will be used.');
 if(!data.preparedDate)notes.push('Report preparation date is not entered.');
 const missingObservation=data.rows.filter(r=>!r.edit.description?.trim());
 const missingLocation=data.rows.filter(r=>!['building','floor','room'].some(k=>r.edit[k]?.trim()));
 const label=rows=>rows.map(r=>'Finding '+String(data.rows.indexOf(r)+1).padStart(2,'0')).slice(0,5).join(', ')+(rows.length>5?'…':'');
 if(missingObservation.length)notes.push(`Observation not entered for ${missingObservation.length} finding(s): ${label(missingObservation)}.`);
 if(missingLocation.length)notes.push(`Location not entered for ${missingLocation.length} finding(s): ${label(missingLocation)}.`);
 const missingDates=data.groups.filter(g=>!g.date?.trim());if(missingDates.length)notes.push(`Inspection date not recorded for ${missingDates.length} inspection(s): ${missingDates.map(g=>g.title||'Untitled inspection').join(', ')}.`);
 const unavailable=data.rows.filter(r=>r.photos.some(p=>!p.removed&&!p.variants[p.variant]));if(unavailable.length)notes.push(`Unavailable photograph(s) in ${label(unavailable)} will not appear in the report. Review the import notes.`);
 const photos=data.rows.reduce((n,r)=>n+r.photos.filter(p=>p.include&&!p.removed&&p.variants[p.variant]).length,0);
 return {findings:data.rows.length,photos,inspections:data.groups.length,notes};
}
export function reportFilename(title,date,extension){
 const stem=(title||'Safety inspection report').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,110).replace(/[. ]+$/,'')||'Safety inspection report';
 return stem+(/^\d{4}-\d{2}-\d{2}$/.test(date||'')?' - '+date:'')+'.'+extension;
}
export function importError(message){
 if(/end of central directory|corrupted zip|unsupported compression|can't read the data/i.test(message||''))return 'This file could not be read as a ZIP archive. Export a fresh inspection ZIP from Safety Fieldbook and try again.';
 return message||'This file could not be imported. Choose a Safety Fieldbook inspection ZIP and try again.';
}
