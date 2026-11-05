export function libraryLocations(project){
 if(!project.locationDetails?.length)return (project.locations||[]).join(' · ')||'No locations recorded';
 const groups=new Map();for(const item of project.locationDetails){const building=(item.building||'').trim(),floor=(item.floor||'').trim(),room=(item.room||'').trim();if(!building&&!floor&&!room)continue;const key=JSON.stringify([building,floor]);if(!groups.has(key))groups.set(key,{building,floor,rooms:new Set()});if(room)groups.get(key).rooms.add(room);}
 return [...groups.values()].map(g=>[g.building,g.floor?'Level '+g.floor:'',g.rooms.size?(g.rooms.size===1?'Room ':'Rooms ')+[...g.rooms].join(', '):''].filter(Boolean).join(' · ')).join('; ')||'No locations recorded';
}
export function sortLibrary(projects,mode='edited'){const updated=(a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'');return [...projects].sort((a,b)=>{if(mode==='title')return a.title.localeCompare(b.title,undefined,{sensitivity:'base',numeric:true})||updated(a,b);if(mode==='inspection'){const date=p=>(p.dates||[]).filter(Boolean).slice().sort().at(-1)||'';return date(b).localeCompare(date(a))||updated(a,b);}return updated(a,b);});}
