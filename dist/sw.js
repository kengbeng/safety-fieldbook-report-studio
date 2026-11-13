const CACHE_NAME='sfbr-shell-ca8081663cc94c98';
const ASSETS=["/","/ai-api.mjs","/ai-batch.mjs","/ai-photos.mjs","/ai.js","/app-icon.svg","/app.js","/core.mjs","/dashboard.js","/features.mjs","/findings-ops.mjs","/icons/app-192.png","/icons/app-512.png","/icons/app-maskable-512.png","/index.html","/manifest.webmanifest","/photo-editor.mjs","/photos.mjs","/ppt-export.js","/ppt-plan.mjs","/projects.mjs","/pwa.js","/report-export.js","/report-fields.mjs","/report-library.mjs","/report-model.mjs","/status-messages.mjs","/storage-protection.mjs","/style.css","/tutorial-sample.mjs","/tutorial.mjs","/vendor/docx.js","/vendor/jspdf.js","/vendor/jszip.min.js","/vendor/pptxgen.LICENSE.txt","/vendor/pptxgen.min.js","/workflow.mjs"];
const PATHS=new Set(ASSETS);
function validAsset(response,path){
 if(!response.ok||response.redirected||!['basic','default'].includes(response.type))return false;
 const type=response.headers.get('content-type')||'';
 return path==='/'||path.endsWith('.html')?type.includes('text/html'):path.endsWith('.js')||path.endsWith('.mjs')?type.includes('javascript'):path.endsWith('.css')?type.includes('text/css'):path.endsWith('.png')?type.includes('image/png'):path.endsWith('.svg')?type.includes('image/svg+xml'):path.endsWith('.webmanifest')?type.includes('json'):true;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE_NAME);
 try{await Promise.all(ASSETS.map(async path=>{const response=await fetch(new Request(path,{cache:'reload',credentials:'same-origin',redirect:'error'}));if(!validAsset(response,path))throw Error('Offline asset unavailable: '+path);if((path==='/'||path.endsWith('.html'))&&!(await response.clone().text()).includes('name="application-name" content="Safety Fieldbook Report Studio"'))throw Error('The offline page was not the application.');await cache.put(path,response);}));}
 catch(error){await caches.delete(CACHE_NAME);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('sfbr-shell-')&&name!==CACHE_NAME)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 // Never cache API calls, sign-in pages, third-party requests or report data.
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!PATHS.has(url.pathname))return;
 event.respondWith((async()=>{const cached=await (await caches.open(CACHE_NAME)).match(url.pathname);if(cached)return cached;return fetch(event.request);})());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();
 if(event.data?.type==='STATUS')event.waitUntil((async()=>{const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});event.ports[0]?.postMessage({ready:(await Promise.all(ASSETS.map(path=>caches.open(CACHE_NAME).then(cache=>cache.match(path))))).every(Boolean),windows:clients.filter(client=>client.url.startsWith(self.registration.scope)&&client.frameType!=='nested').length,version:CACHE_NAME});})());
});
