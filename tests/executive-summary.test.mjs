import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {summaryParagraphs} from '../dist/report-model.mjs';
import {previewReport,wordReport,pdfReport} from '../dist/report-export.js';
import {createPptPlan} from '../dist/ppt-plan.mjs';
const require=createRequire(import.meta.url),docx=require('../dist/vendor/docx.js'),JSZip=require('../dist/vendor/jszip.min.js');
const first='Management review should focus on access arrangements and electrical equipment controls.';
const second='Coordinate follow-up across the responsible teams and verify that the recorded concerns have been addressed.';
const fixture=layout=>({title:'Synthetic management report',summary:first+'\n\n'+second,preparedDate:'2026-11-13',findingsLayout:layout,groups:[],rows:[]});
test('summary paragraph splitting preserves text and handles Windows blank lines',()=>{
 assert.deepEqual(summaryParagraphs(' '+first+'\r\n \r\n'+second+'\n'),[first,second]);assert.deepEqual(summaryParagraphs(''),[]);
});
test('both report preview layouts render executive-summary paragraphs separately and escape HTML',async()=>{
 for(const layout of ['individual','consolidated']){
  const target={innerHTML:''};await previewReport({...fixture(layout),summary:first+' <unsafe>\n\n'+second},target);
  const section=target.innerHTML.match(/<div class="report-executive-summary">([\s\S]*?)<\/div>/)[1];assert.equal((section.match(/<p>/g)||[]).length,2);assert.ok(section.includes('&lt;unsafe&gt;'));assert.ok(!section.includes('<unsafe>'));assert.ok(section.includes('</p><p>'+second));
 }
});
test('Word export retains executive-summary paragraphs as separate native paragraphs in both layouts',async()=>{
 const before=globalThis.window;globalThis.window={docx};
 try{for(const layout of ['individual','consolidated']){const blob=await wordReport(fixture(layout)),zip=await JSZip.loadAsync(await blob.arrayBuffer()),xml=await zip.file('word/document.xml').async('string');const paragraphs=[...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map(match=>match[0]);assert.equal(paragraphs.filter(p=>p.includes(first)).length,1);assert.equal(paragraphs.filter(p=>p.includes(second)).length,1);assert.ok(!paragraphs.some(p=>p.includes(first)&&p.includes(second)));}}
 finally{globalThis.window=before;}
});
test('PDF summary paragraphs have a visible extra gap rather than running together',async()=>{
 const before=globalThis.window,positions=[];
 class PDF{
  constructor(){this.internal={};}setFont(){}setFontSize(){}setTextColor(){}splitTextToSize(text){return [text];}addPage(){}getNumberOfPages(){return 1;}setDrawColor(){}setLineWidth(){}line(){}setFillColor(){}rect(){}setPage(){}
  text(text,x,y){if(text===first||text===second)positions.push({text,y});}
 }
 globalThis.window={jspdf:{jsPDF:PDF}};
 try{await pdfReport(fixture('individual'));const pair=positions.slice(-2);assert.equal(pair[0].text,first);assert.equal(pair[1].text,second);assert.ok(pair[1].y-pair[0].y>=8,'paragraph spacing must exceed a normal line');}
 finally{globalThis.window=before;}
});
test('PowerPoint summary layout retains the blank line between paragraphs',()=>{
 const plan=createPptPlan(fixture('individual'),text=>text.length*6),slides=plan.slides.filter(slide=>slide.title.startsWith('Executive summary')),text=slides.flatMap(slide=>slide.rows.map(row=>row.text)).join('\n');assert.ok(text.includes('\n\n'));assert.ok(text.includes(first));assert.ok(text.includes(second));
});
