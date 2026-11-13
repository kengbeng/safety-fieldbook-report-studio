const normalise=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
export function helpMatches(text,query){const terms=normalise(query).split(' ').filter(Boolean),content=normalise(text);return terms.every(term=>content.includes(term));}
export function startHelpSearch(){
 const $=id=>document.getElementById(id),dialog=$('userHelpDialog'),input=$('helpSearch'),sections=[...dialog.querySelectorAll(':scope > details, :scope > #reportAbout')],original=new Map();
 const tutorial=dialog.querySelector('.tutorial-help');let searching=false;
 function render(){
  const query=input.value.trim();
  if(query&&!searching){for(const section of sections)original.set(section,{hidden:section.hidden,open:section.open});searching=true;}
  let count=0;
  for(const section of sections){
   if(query){const match=helpMatches(section.textContent,query);section.hidden=!match;if(match){count++;if(section.tagName==='DETAILS')section.open=true;}}
   else if(searching){const previous=original.get(section);section.hidden=previous.hidden;if(section.tagName==='DETAILS')section.open=previous.open;}
  }
  if(!query){searching=false;original.clear();}
  tutorial.hidden=!!query;$('clearHelpSearch').hidden=!query;$('helpSearchEmpty').hidden=!query||count>0;
  $('helpSearchStatus').textContent=query?count+' matching section'+(count===1?'':'s'):'';
 }
 function clear(){input.value='';render();}
 input.addEventListener('input',render);
 input.addEventListener('keydown',event=>{if(event.key==='Escape'&&input.value){event.preventDefault();event.stopPropagation();clear();}});
 $('clearHelpSearch').onclick=()=>{clear();input.focus();};
 dialog.addEventListener('close',clear);
 render();return {clear};
}
