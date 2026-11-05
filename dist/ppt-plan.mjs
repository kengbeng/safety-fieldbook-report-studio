import {makeReport,consolidatedTable,summaryTable,findingFields,displayDate,sourceRows,sourceFiles} from './report-model.mjs?v=20261105-photo-editor';
export function wrapSlideText(text,maxWidth,measure){
 const lines=[];for(const paragraph of String(text??'').split('\n')){if(!paragraph){lines.push('');continue;}let line='';for(const char of paragraph){if(line&&measure(line+char)>maxWidth){const space=line.lastIndexOf(' ');if(space>line.length*.45){lines.push(line.slice(0,space));line=line.slice(space+1)+char;}else{lines.push(line);line=char;}}else line+=char;}lines.push(line);}return lines;
}
export function textMeasure(){const ctx=document.createElement('canvas').getContext('2d');return (text,size)=>{ctx.font=`${size*96/72}px Arial`;return ctx.measureText(text).width;};}
export function slidePages(text,width,size=18,maxLines=14,measure){const standard=measure?null:textMeasure(),metric=measure||((s)=>standard(s,size)),lines=wrapSlideText(text,width*96,metric),pages=[];for(let i=0;i<lines.length;i+=maxLines)pages.push(lines.slice(i,i+maxLines).join('\n'));return pages.length?pages:[''];}
const WIDTH=12.2,VALUE_WIDTH=9.55,LABEL_WIDTH=2.1,MAX_HEIGHT=5.65;
export function createPptPlan(data,measure=textMeasure()){
 const m=makeReport(data),slides=[];
 const lines=(text,w,size=17)=>wrapSlideText(text,w*96,s=>measure(s,size));
 const height=(text,w,size=17)=>Math.max(1,lines(text,w,size).length)*size*1.2/72+.17;
 const field=(label,text)=>({label,text:String(text??''),h:Math.max(height(label,LABEL_WIDTH),height(text,VALUE_WIDTH))});
 // Each section label stays in the same native table row as its text.
 function fieldPages(fields,capacity=MAX_HEIGHT){const pages=[];let page=[],used=0;
  for(const [label,value] of fields){const all=lines(value,VALUE_WIDTH);let offset=0;while(offset<all.length){const continued=offset>0,name=label+(continued?' (continued)':''),labelHeight=height(name,LABEL_WIDTH),room=capacity-used;
    const take=Math.min(all.length-offset,Math.floor((room-.17)/(17*1.2/72)));
    if(take<1||room<labelHeight){if(!page.length)throw Error('PowerPoint content cannot fit its table.');pages.push(page);page=[];used=0;continue;}
    const text=all.slice(offset,offset+take).join('\n'),row=field(name,text);page.push(row);used+=row.h;offset+=take;if(offset<all.length){pages.push(page);page=[];used=0;}
  }}if(page.length)pages.push(page);return pages.length?pages:[[]];}
 const sum=rows=>rows.reduce((n,r)=>n+r.h,0);
 const section=(title,fields)=>{fieldPages(fields).forEach((rows,i)=>slides.push({kind:'fields',title:title+(i?' · continued '+(i+1):''),rows}));};
 const overview=[['Report title',m.title],['Inspection dates',m.period],['Prepared',displayDate(m.preparedDate)],['Report contents',`${m.findings.length} findings · ${m.photoCount} photographs`],...(m.department?[['Department / Faculty',m.department]]:[]),...(m.reference?[['Report reference',m.reference]]:[])];
 const inspectors=m.inspectors;if(inspectors)overview.push(['Inspector(s)',inspectors]);
 section('Report overview',overview);
 if(m.purpose)section('Inspection purpose',[['Purpose',m.purpose]]);
 if(m.summary)section('Executive summary',[['Summary',m.summary]]);
 const summarySlides=[];
 if(m.consolidated){const t=consolidatedTable(m),total=t.weights.reduce((a,b)=>a+b,0),widths=t.weights.map(w=>WIDTH*w/total),fontSize=14,headerHeight=Math.max(...t.headers.map((h,i)=>height(h,widths[i]-.22,fontSize)))+.08;let rows=[],used=headerHeight;
 const push=()=>{if(rows.length)slides.push({kind:'consolidated',title:'Consolidated findings'+(slides.some(s=>s.kind==='consolidated')?' · continued':''),headers:t.headers,widths,headerHeight,fontSize,rows});rows=[];used=headerHeight;};
 for(const [index,values] of t.rows.entries()){const all=values.map((v,i)=>lines(v,widths[i]-.22,fontSize)),length=Math.max(1,...all.map(a=>a.length));let offset=0;
 while(offset<length){const capacity=Math.floor((MAX_HEIGHT-used-.2)/(fontSize*1.2/72));if(capacity<2){push();continue;}const take=Math.min(length-offset,capacity),cells=all.map((a,i)=>i===0&&offset>0?String(index+1):a.slice(offset,offset+take).join('\n')),h=Math.max(.85,take*fontSize*1.2/72+.2);if(used+h>MAX_HEIGHT){push();continue;}rows.push({cells,h});used+=h;offset+=take;if(offset<length)push();}}
 push();
 }else{
let summaryRows=[];const table=summaryTable(m),summaryHeaders=['Finding',...table.headers.slice(1,-1).map(label=>label==='Finding'?'Finding summary':label),'Slide'],summaryWidths=table.weights.map(w=>WIDTH*w/table.weights.reduce((a,b)=>a+b,0)),summaryHeaderHeight=Math.max(.62,...summaryHeaders.map((label,i)=>height(label,summaryWidths[i]-.22,16)));let summaryHeight=summaryHeaderHeight;
 for(const f of m.findings){const cells=[f.ref,...table.rows[f.number-1].slice(1,-1),''],widths=summaryWidths;
  // Full location remains in finding details; long summary locations wrap over continued rows.
  const all=cells.map((v,i)=>lines(v,widths[i]-.22,16)),length=Math.max(...all.map(a=>a.length));let offset=0;
  while(offset<length){const take=Math.min(length-offset,Math.floor((MAX_HEIGHT-summaryHeight-.16)/(16*1.2/72)));if(take<(offset>0?2:1)){summarySlides.push({kind:'summary',title:'Findings summary',headers:summaryHeaders,widths:summaryWidths,headerHeight:summaryHeaderHeight,rows:summaryRows});summaryRows=[];summaryHeight=summaryHeaderHeight;continue;}
   const n=Math.min(take,length-offset),h=Math.max(n,offset>0?2:1)*16*1.2/72+.16;summaryRows.push({finding:f.ref,cells:all.map((a,i)=>i===0&&offset>0?f.ref+' (continued)':a.slice(offset,offset+n).join('\n')),h});summaryHeight+=h;offset+=n;
  }
 }
 if(summaryRows.length||!summarySlides.length)summarySlides.push({kind:'summary',title:'Findings summary',headers:summaryHeaders,widths:summaryWidths,headerHeight:summaryHeaderHeight,rows:summaryRows});slides.push(...summarySlides);
 }
 const photoBatchSize=data.pptSinglePhoto?1:2;
 for(const f of m.findings){
  if(m.consolidated&&!f.photos.length)continue;
  const headText=f.heading,headHeight=height(headText,11.95,22),locationLines=lines(f.location,VALUE_WIDTH),compactLocation=locationLines.length<=2?f.location:locationLines.slice(0,2).join('\n')+'…';
  const fixed=[{label:headText,text:'',h:headHeight,heading:true},...(m.selectedFields.includes('location')?[field('Location',compactLocation)]:[])],fixedHeight=sum(fixed);
  const fields=findingFields(f).filter(([label])=>label!=='Location');if(m.selectedFields.includes('location')&&locationLines.length>2)fields.unshift(['Location details',f.location]);
  const pages=m.consolidated?[[]]:fieldPages(fields,MAX_HEIGHT-fixedHeight),findingSlides=[],batches=[];for(let i=0;i<f.photos.length;i+=photoBatchSize)batches.push(f.photos.slice(i,i+photoBatchSize));
  function photoRow(photos,available){const slot=WIDTH/photos.length,captions=photos.map(p=>lines(p.captionText,slot-.3,14)),captionLines=Math.min(3,Math.max(...captions.map(c=>c.length))),captionHeight=captionLines*14*1.2/72+.12,minImageHeight=data.pptSinglePhoto?3:1.9,minHeight=minImageHeight+captionHeight+.15;
   if(available<minHeight)return null;return {photos,h:Math.min(available,data.pptSinglePhoto?5:3.65),captionHeight,captions:captions.map(c=>c.slice(0,3).join('\n')),remainders:captions.map(c=>c.slice(3).join('\n'))};}
  let splitPage=null;
  if(!m.consolidated&&!data.pptSinglePhoto&&batches.length){const leftWidth=7,rightWidth=4.9,gap=.3,size=16,valueWidth=4.85,labelWidth=1.65;
   const leftRows=[...(m.selectedFields.includes('location')?[['Location',f.location]]:[]),...fields].map(([label,value])=>({label,text:String(value),h:Math.max(height(label,labelWidth,size),height(value,valueWidth,size))+.04})),heading=fixed[0],photoHeight=MAX_HEIGHT-heading.h;
   // Use a split slide only when all text fits at a readable size; otherwise keep the continuation layout.
   if(heading.h+sum(leftRows)<=MAX_HEIGHT&&photoHeight>=3.6){const photos=batches.shift(),captions=photos.map(p=>lines(p.captionText,rightWidth-.3,14)),captionLines=Math.min(3,Math.max(...captions.map(c=>c.length))),captionHeight=captionLines*14*1.2/72+.12;
    splitPage={kind:'finding',title:'Detailed finding',finding:f,rows:[heading,...leftRows],split:{leftWidth,rightWidth,gap,fontSize:size},photo:{photos,h:photoHeight,captionHeight,captions:captions.map(c=>c.slice(0,3).join('\n')),remainders:captions.map(c=>c.slice(3).join('\n'))}};findingSlides.push(splitPage);
   }
  }
  if(!splitPage)for(const [index,rows] of pages.entries()){

   const page={kind:'finding',title:m.consolidated?'Photo appendix':index?((rows[0]?.label||'Finding details').replace(' (continued)','')+' continued'):'Detailed finding',finding:f,rows:[...fixed,...rows]};
   if(batches.length){const photo=photoRow(batches[0],MAX_HEIGHT-sum(page.rows));if(photo){page.photo=photo;batches.shift();}}
   findingSlides.push(page);
  }
  for(const photos of batches){const photo=photoRow(photos,MAX_HEIGHT-fixedHeight);if(!photo)throw Error('Finding title or location leaves insufficient space for photographs. Shorten the finding title.');findingSlides.push({kind:'finding',title:'Additional photographs',finding:f,rows:[...fixed],photo});}
  for(const page of findingSlides){slides.push(page);if(page.photo)for(let i=0;i<page.photo.photos.length;i++)if(page.photo.remainders[i]){const photo=page.photo.photos[i];for(const rows of fieldPages([[photo.reference+' · Caption (continued)',page.photo.remainders[i]]],MAX_HEIGHT-fixedHeight))slides.push({kind:'finding',title:'Photo caption continued',finding:f,rows:[...fixed,...rows]});}}
 }
 if(data.pptSourceAppendix){section('Source appendix',sourceFiles(m).map(([ref,name])=>[ref+' · File',name]));for(const [i,row]of sourceRows(m).entries())section('Source appendix · '+m.findings[i].ref,[['Finding source',row[1]],['Photograph sources',row[2]||'No included photographs']]);}
 const refs=new Map();slides.forEach((s,i)=>{s.number=i+1;if(s.finding&&!refs.has(s.finding.ref))refs.set(s.finding.ref,i+1);});
 summarySlides.forEach((s,i)=>{if(i)s.title+=' · continued '+(i+1);for(const r of s.rows)r.cells[r.cells.length-1]=String(refs.get(r.finding)||'');});
 return {model:m,slides,width:WIDTH,tableY:1.15,maxTableHeight:MAX_HEIGHT};
}
