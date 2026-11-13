export const AI_PHOTO_LIMIT = 6;
export function selectAIPhotos(photos = [], enabled = true) {
 const eligible = photos.filter(p => p.include && !p.removed && p.variants?.[p.variant]?.blob);
 return {total: eligible.length, photos: enabled ? eligible.slice(0, AI_PHOTO_LIMIT) : []};
}
export function photoGeometry(width, height, rotation = 0) {
 const angle = ((rotation % 360) + 360) % 360;
 if (![0, 90, 180, 270].includes(angle) || width <= 0 || height <= 0) throw Error('This photograph has an unsupported orientation.');
 const scale = Math.min(1, 1280 / Math.max(width, height)), w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
 return {width: angle % 180 ? h : w, height: angle % 180 ? w : h, drawWidth: w, drawHeight: h, angle};
}
export async function prepareAIPhotos(photos, signal) {
 const images = [];
 for (const photo of photos) {
  signal?.throwIfAborted();
  const bitmap = await createImageBitmap(photo.variants[photo.variant].blob);
  let canvas;
  try {
   const size = photoGeometry(bitmap.width, bitmap.height, photo.rotation || 0);
   canvas = document.createElement('canvas');canvas.width = size.width;canvas.height = size.height;
   const ctx = canvas.getContext('2d');
   if (!ctx) throw Error('This browser could not prepare a photograph. Switch photos off to use text only.');
   ctx.fillStyle = '#fff';ctx.fillRect(0, 0, canvas.width, canvas.height);
   ctx.translate(canvas.width / 2, canvas.height / 2);ctx.rotate(size.angle * Math.PI / 180);
   ctx.drawImage(bitmap, -size.drawWidth / 2, -size.drawHeight / 2, size.drawWidth, size.drawHeight);
   signal?.throwIfAborted();
   const image = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .8));
   if (!image || image.size > 1024 ** 2) throw Error('A photograph could not be prepared within the AI size limit. Switch photos off to use text only.');
   const url = await new Promise((resolve, reject) => {const reader = new FileReader();reader.onload = () => resolve(reader.result);reader.onerror = () => reject(Error('Could not read the AI photograph copy.'));reader.readAsDataURL(image);});
   signal?.throwIfAborted();
   images.push({url, reference: String(photo.reference || 'Photo').slice(0, 200), caption: String(photo.caption || '').slice(0, 240)});
  } finally {bitmap.close();if (canvas) canvas.width = canvas.height = 0;}
 }
 return images;
}
