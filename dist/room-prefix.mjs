// Strip only an exact prefix already recorded in the separate location fields.
export function normaliseRoom({building='',floor='',room}={}){
 if(typeof room!=='string'||typeof floor!=='string'||typeof building!=='string')return room;
 const level=floor.trim(),block=building.trim(),value=room.trim();
 if(!level||!value)return room;
 const prefixes=block?[block+'-'+level+'-',level+'-']:[level+'-'];
 for(const prefix of prefixes)if(value.toLowerCase().startsWith(prefix.toLowerCase())&&value.slice(prefix.length).trim())return value.slice(prefix.length).trim();
 return room;
}
