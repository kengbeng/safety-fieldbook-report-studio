export function startStatusMessages(){
 for(const id of ['installMessage','projectStatus','status','offlineNotice']){
  const message=document.getElementById(id);if(!message)continue;
  const wrapper=document.createElement('div');wrapper.className='status-banner';
  message.before(wrapper);wrapper.append(message);
  const close=document.createElement('button');close.type='button';close.className='dismiss-status';close.setAttribute('aria-label','Dismiss message');close.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  wrapper.append(close);close.onclick=()=>{message.textContent='';};
  const refresh=()=>{wrapper.hidden=message.hidden||!message.textContent.trim();};
  new MutationObserver(refresh).observe(message,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});refresh();
 }
}
