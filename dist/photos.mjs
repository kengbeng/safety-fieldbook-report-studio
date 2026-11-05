export const PHOTO_LIMIT=20*1024**2;
export function imageMime(bytes){return bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':null;}
export function removePhoto(photo){if(photo.removed)return;photo.includedBeforeRemoval=photo.include;photo.removed=true;photo.include=false;}
export function restorePhotos(photos){for(const photo of photos)if(photo.removed){photo.removed=false;photo.include=photo.includedBeforeRemoval!==false&&!!photo.variants[photo.variant];delete photo.includedBeforeRemoval;}}
export function addedPhoto(file,blob,photos,url,id=crypto.randomUUID()){
 let number=1;const used=new Set(photos.map(p=>p.reference));while(used.has('Added '+String(number).padStart(2,'0')))number++;
 const reference='Added '+String(number).padStart(2,'0');
 return {id,reference,include:true,addedInReport:true,rotation:0,variant:'original',caption:'',variants:{original:{blob,url,mime:blob.type},annotated:null},source:{id,reference,originalName:file.name,addedInReport:true}};
}
