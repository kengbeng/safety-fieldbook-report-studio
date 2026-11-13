import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('production release retains existing storage and app identity without beta branding',()=>{
 assert.match(read('dist/projects.mjs'),/indexedDB.open\('safety-fieldbook-report-studio',1\)/);
 assert.match(read('dist/app.js'),/sfbr-findings-view/);
 assert.match(read('dist/tutorial.mjs'),/sfbr-tutorial-v1/);
 assert.match(read('dist/pwa.js'),/sfbr-update-complete/);
 assert.match(read('scripts/pages-build.mjs'),/const base='\/safety-fieldbook-report-studio\/';/);
 assert.match(read('worker/sw-template.js'),/sfbr-shell-/);
 const manifest=JSON.parse(read('dist/manifest.webmanifest'));
 assert.equal(manifest.name,'Safety Fieldbook Report Studio');
 assert.doesNotMatch(read('dist/index.html'),/AI BETA|AI Beta|AI beta|beta-notice|This beta/);
 assert.match(read('dist/index.html'),/Version 1\.4\.1/);
 assert.match(read('dist/features.mjs'),/AI_ENABLED=true/);
});
