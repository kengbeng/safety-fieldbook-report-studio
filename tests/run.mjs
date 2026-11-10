import {readdirSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),mode=process.argv[2]||'core';
if(!['core','ai','all','ci'].includes(mode)){console.error('Usage: node tests/run.mjs [core|ai|all|ci]');process.exit(2);}
let includeAI=mode==='all'||mode==='ai';
if(mode==='ci'){
 // Unknown change history or a manual run uses all checks rather than silently omitting AI.
 includeAI=true;
 if(process.env.GITHUB_EVENT_NAME==='push'&&process.env.GITHUB_EVENT_PATH){
  const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
  if(event.before&&!/^0+$/.test(event.before)){
   const diff=spawnSync('git',['diff','--name-only',event.before,'HEAD'],{cwd:root,encoding:'utf8'});
   if(diff.status===0){const paths=diff.stdout.split(/\r?\n/);includeAI=paths.some(p=>/^(worker\/|drizzle\/|dist\/(ai\.js|app\.js|report-model\.mjs|report-fields\.mjs|features\.mjs)$|tests\/ai\.test\.mjs$|tests\/run\.mjs$|package(-lock)?\.json$|\.github\/workflows\/)/.test(p));}
  }
 }
 // Reactivating AI must never leave its tests optional in deployment checks.
 if(/export\s+const\s+AI_ENABLED\s*=\s*true/.test(readFileSync(new URL('../dist/features.mjs',import.meta.url),'utf8')))includeAI=true;
}
const files=readdirSync(new URL('./',import.meta.url)).filter(f=>f.endsWith('.test.mjs')&&(mode==='ai'?f==='ai.test.mjs':includeAI||f!=='ai.test.mjs')).sort().map(f=>'tests/'+f);
console.log(`Running ${mode} suite (${includeAI?'including':'excluding parked'} AI checks).`);
const result=spawnSync(process.execPath,['--test','--test-isolation=none',...files],{cwd:root,stdio:'inherit'});
if(result.error)console.error(result.error.message);
process.exit(result.status??1);
