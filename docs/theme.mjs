const KEY='tni-pm-academy:theme';
const root=document.documentElement;
const control=document.querySelector('.theme-control');
const toggle=document.getElementById('theme-toggle');
const panel=document.getElementById('theme-panel');
const choices=[...panel.querySelectorAll('input[name="theme"]')];
const media=window.matchMedia('(prefers-color-scheme: dark)');
function preference(){try{const value=localStorage.getItem(KEY);return ['light','dark','system'].includes(value)?value:'system';}catch{return 'system';}}
function apply(value){root.dataset.theme=value==='system'?(media.matches?'dark':'light'):value;root.dataset.themePreference=value;choices.forEach(input=>{input.checked=input.value===value;});}
function close(returnFocus=false){panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(returnFocus)toggle.focus();}
apply(preference());
toggle.addEventListener('click',()=>{const open=panel.hidden;panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)choices.find(input=>input.checked)?.focus();});
choices.forEach(input=>input.addEventListener('change',()=>{if(!input.checked)return;try{localStorage.setItem(KEY,input.value);}catch{}apply(input.value);}));
document.addEventListener('click',event=>{if(!control.contains(event.target))close();});
control.addEventListener('keydown',event=>{if(event.key==='Escape'){close(true);event.preventDefault();}});
control.addEventListener('focusout',event=>{if(!control.contains(event.relatedTarget))close();});
media.addEventListener('change',()=>{if(root.dataset.themePreference==='system')apply('system');});
