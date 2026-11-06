export async function storageProtection(storage,request=false){
 if(typeof storage?.persisted!=='function'||typeof storage?.persist!=='function')return 'unavailable';
 try{if(await storage.persisted())return 'persistent';if(request)return await storage.persist()?'persistent':'standard';return 'standard';}catch{return 'unavailable';}
}
export function startStorageProtection({storage,button,status}){
 let requesting=false,revision=0;
 function display(result){status.textContent=result==='persistent'?'Persistent storage enabled. Keep project backups.':result==='standard'?'Standard browser storage. Download backups regularly.':'Storage protection is unavailable in this browser.';button.hidden=result!=='standard';}
 async function refresh(){const current=++revision;const result=await storageProtection(storage);if(current===revision&&!requesting)display(result);}
 button.onclick=async()=>{if(requesting)return;requesting=true;revision++;button.disabled=true;status.textContent='Requesting storage protection…';try{display(await storageProtection(storage,true));}finally{requesting=false;button.disabled=false;}};
 refresh();return {refresh};
}
