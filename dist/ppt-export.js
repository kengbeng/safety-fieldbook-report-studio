import {createPptPlan} from './ppt-plan.mjs?v=20261105-photo-editor';
import {rasterPhoto} from './report-export.js?v=20261105-photo-editor';
export {wrapSlideText,slidePages} from './ppt-plan.mjs?v=20261105-photo-editor';
export async function powerpointReport(data){
 if(!window.PptxGenJS)throw Error('PowerPoint export could not load. Reload this page and try again.');
 const plan=createPptPlan(data),m=plan.model,deck=new window.PptxGenJS();deck.layout='LAYOUT_WIDE';deck.author='Safety Fieldbook Report Studio';deck.title=m.title;deck.subject='Safety inspection report';deck.company='National University of Singapore';deck.lang='en-SG';deck.theme={headFontFace:'Arial',bodyFontFace:'Arial',lang:'en-SG'};
 const text=(s,t,x,y,w,h,size=17,color='233247',bold=false,align='left')=>s.addText(t,{x,y,w,h,fontFace:'Arial',fontSize:size,color,bold,align,margin:0,valign:'top',lineSpacingMultiple:1.12,paraSpaceAfter:0});
 const cell=(value,options={})=>({text:String(value),options:{fontFace:'Arial',fontSize:17,color:'233247',margin:[6,8,6,8],valign:'top',...options}});
 for(const page of plan.slides){const s=deck.addSlide();s.background={color:'FFFFFF'};text(s,page.title,.55,.3,12.2,.65,28,'003D7C',true);text(s,'Safety Fieldbook Report Studio',.55,7.12,9,.2,10,'566579');text(s,page.number+' / '+plan.slides.length,11.9,7.12,.9,.2,10,'566579');
  if(page.split){const heading=page.rows[0],leftRows=page.rows.slice(1),layout=page.split,top=plan.tableY+heading.h;
   s.addTable([[cell(heading.label,{bold:true,color:'FFFFFF',fill:'003D7C',fontSize:22})]],{x:.55,y:plan.tableY,w:plan.width,colW:[plan.width],rowH:[heading.h],fontFace:'Arial',border:{color:'D9D9D9',pt:.7},autoPage:false});
   s.addTable(leftRows.map(r=>[cell(r.label,{bold:true,color:'003D7C',fill:'EDF3FA',fontSize:layout.fontSize}),cell(r.text,{fontSize:layout.fontSize})]),{x:.55,y:top,w:layout.leftWidth,colW:[1.9,layout.leftWidth-1.9],rowH:leftRows.map(r=>r.h),fontFace:'Arial',fontSize:layout.fontSize,border:{color:'D9D9D9',pt:.7},autoPage:false,paraSpaceAfter:0});
   const p=page.photo,x=.55+layout.leftWidth+layout.gap,slotHeight=(p.h-.12*(p.photos.length-1))/p.photos.length,imageHeight=slotHeight-p.captionHeight-.12;
   for(let i=0;i<p.photos.length;i++){const photo=p.photos[i],im=await rasterPhoto(photo),scale=Math.min((layout.rightWidth-.2)/im.width,imageHeight/im.height),w=im.width*scale,h=im.height*scale,y=top+i*(slotHeight+.12);s.addShape('rect',{x,y,w:layout.rightWidth,h:slotHeight,fill:{color:'FFFFFF'},line:{color:'D9D9D9',width:.7}});s.addImage({data:im.data,x:x+(layout.rightWidth-w)/2,y:y+.04+(imageHeight-h)/2,w,h,altText:photo.caption||photo.captionText});text(s,p.captions[i],x+.1,y+imageHeight+.07,layout.rightWidth-.2,p.captionHeight,14,'46566D',false,'center');}
  }else{
  const rows=[],heights=[];let widths=[2.4,9.8];
  if(page.kind==='consolidated'){widths=page.widths;rows.push(page.headers.map(v=>cell(v,{bold:true,color:'FFFFFF',fill:'003D7C',fontSize:page.fontSize})));heights.push(page.headerHeight);for(const r of page.rows){rows.push(r.cells.map(v=>cell(v,{fontSize:page.fontSize})));heights.push(r.h);}}
  else if(page.kind==='summary'){widths=page.widths;rows.push(page.headers.map(v=>cell(v,{bold:true,color:'FFFFFF',fill:'003D7C',fontSize:16})));heights.push(page.headerHeight);for(const r of page.rows){rows.push(r.cells.map(v=>cell(v,{fontSize:16})));heights.push(r.h);}}
  else for(const r of page.rows){rows.push(r.heading?[cell(r.label,{colspan:2,bold:true,color:'FFFFFF',fill:'003D7C',fontSize:22,border:[{color:'D9D9D9',pt:.7},{color:'D9D9D9',pt:.7},{color:'EF7C00',pt:1.4},{color:'D9D9D9',pt:.7}]})]:[cell(r.label,{bold:true,color:'003D7C',fill:'EDF3FA'}),cell(r.text)]);heights.push(r.h);}
  if(page.photo){rows.push([cell('',{colspan:2,margin:0})]);heights.push(page.photo.h);}
  s.addTable(rows,{x:.55,y:plan.tableY,w:plan.width,colW:widths,rowH:heights,margin:[6,8,6,8],fontFace:'Arial',fontSize:17,color:'233247',border:{color:'D9D9D9',pt:.7},autoPage:false,paraSpaceAfter:0,breakLine:false,verbose:false});
  if(page.photo){const p=page.photo,top=plan.tableY+page.rows.reduce((n,r)=>n+r.h,0),slot=plan.width/p.photos.length,imageArea=p.h-p.captionHeight-.15;
   for(let i=0;i<p.photos.length;i++){const photo=p.photos[i],im=await rasterPhoto(photo),scale=Math.min((slot-.25)/im.width,imageArea/im.height),w=im.width*scale,h=im.height*scale,x=.55+i*slot;
    s.addImage({data:im.data,x:x+(slot-w)/2,y:top+.07+(imageArea-h)/2,w,h,altText:photo.caption||photo.captionText});text(s,p.captions[i],x+.12,top+imageArea+.12,slot-.24,p.captionHeight,14,'46566D',false,'center');
   }
  }
  }
  const f=page.finding;s.addNotes(f?JSON.stringify({finding:f.ref,sourceFindingId:f.original.id,mergedSources:f.mergeSources,inspectionId:f.inspection.id,inspection:f.inspection,files:f.sources,photos:f.photos.map(p=>({id:p.id,reference:p.reference,filename:p.source?.originalName,addedInReport:!!p.addedInReport,caption:p.caption||''}))},null,2):JSON.stringify({report:m.title,inspections:m.groups,...(page.kind==='consolidated'?{findings:m.findings.map(f=>({finding:f.ref,sourceFindingId:f.original.id,mergedSources:f.mergeSources,inspectionId:f.inspection.id,photos:f.photos.map(p=>({id:p.id,filename:p.source?.originalName}))}))}:{}),files:[...new Set(m.findings.flatMap(f=>f.sources))]},null,2));
 }
 return deck.write({outputType:'blob',compression:true});
}
