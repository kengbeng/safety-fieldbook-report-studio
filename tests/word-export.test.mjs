import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {wordReport} from '../dist/report-export.js';
const require=createRequire(import.meta.url),docx=require('../dist/vendor/docx.js'),JSZip=require('../dist/vendor/jszip.min.js');
test('generated Word page dimensions match consolidated landscape and individual portrait',async()=>{
 const oldWindow=globalThis.window;globalThis.window={docx};
 try{for(const layout of ['consolidated','individual']){
  const inspection={id:'i',title:'Test inspection',date:'2026-11-06',inspector:'Reviewer'};
  const blob=await wordReport({title:'Orientation check',preparedDate:'2026-11-06',findingsLayout:layout,groups:[inspection],rows:[{inspection,original:{id:'f'},edit:{description:'Evidence',building:'S13',floor:'2',room:'13C',action:'Review'},photos:[],sources:[]}]});
  const zip=await JSZip.loadAsync(await blob.arrayBuffer()),xml=await zip.file('word/document.xml').async('string');
  const page=xml.match(/<w:pgSz\b[^>]*>/)?.[0];assert.ok(page,'Page size must be explicitly written');
  const w=Number(page.match(/w:w="(\d+)"/)[1]),h=Number(page.match(/w:h="(\d+)"/)[1]);
  if(layout==='consolidated'){assert.ok(w>h,page);assert.match(page,/w:orient="landscape"/);assert.equal(w,16838);assert.equal(h,11906);}
  else{assert.ok(h>w,page);assert.match(page,/w:orient="portrait"/);}
 }}finally{globalThis.window=oldWindow;}
});
