import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),assets={};
// The existing static application remains the source of the client bundle.
function walk(dir){for(const entry of readdirSync(path.join(root,'dist',dir),{withFileTypes:true})){if(entry.name.startsWith('.')||entry.name==='server'||entry.name==='sw.js')continue;const file=path.posix.join(dir,entry.name);if(entry.isDirectory())walk(file);else assets['/'+file]=readFileSync(path.join(root,'dist',file)).toString('base64');}}
walk('');
const template=readFileSync(path.join(root,'worker/sw-template.js'),'utf8');
const version=createHash('sha256').update(JSON.stringify(assets)).update(template).digest('hex').slice(0,16);
const serviceWorker=template.replace('__VERSION__',version).replace('__ASSETS__',JSON.stringify(['/',...Object.keys(assets).sort()]));
writeFileSync(path.join(root,'dist/sw.js'),serviceWorker);assets['/sw.js']=Buffer.from(serviceWorker).toString('base64');
const server=readFileSync(path.join(root,'worker/ai.mjs'),'utf8')+'\nconst ASSETS='+JSON.stringify(assets)+';\n'+`
const MIME={html:'text/html;charset=utf-8',css:'text/css;charset=utf-8',js:'text/javascript;charset=utf-8',mjs:'text/javascript;charset=utf-8',svg:'image/svg+xml',png:'image/png',webmanifest:'application/manifest+json',txt:'text/plain;charset=utf-8'};
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith('/api/ai/'))return handleAI(request,env);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const name=url.pathname==='/'?'/index.html':url.pathname;const asset=ASSETS[name];if(!asset)return new Response('Not found',{status:404});const bytes=Uint8Array.from(atob(asset),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':MIME[name.split('.').pop()]||'application/octet-stream','cache-control':'no-cache','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});}};
`;
mkdirSync(path.join(root,'dist/server'),{recursive:true});mkdirSync(path.join(root,'dist/.openai'),{recursive:true});writeFileSync(path.join(root,'dist/server/index.js'),server);writeFileSync(path.join(root,'dist/.openai/hosting.json'),existsSync(path.join(root,'.openai/hosting.json'))?readFileSync(path.join(root,'.openai/hosting.json')):JSON.stringify({static:{directory:'dist'}}));
console.log('Built Worker with '+Object.keys(assets).length+' embedded client assets.');
