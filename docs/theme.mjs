const KEY='tni-pm-academy:theme';
const root=document.documentElement;
const select=document.getElementById('theme-select');
const media=window.matchMedia('(prefers-color-scheme: dark)');
function preference(){try{const value=localStorage.getItem(KEY);return ['light','dark','system'].includes(value)?value:'system';}catch{return 'system';}}
function apply(value){root.dataset.theme=value==='system'?(media.matches?'dark':'light'):value;root.dataset.themePreference=value;select.value=value;}
apply(preference());
select.addEventListener('change',()=>{const value=select.value;try{localStorage.setItem(KEY,value);}catch{}apply(value);});
media.addEventListener('change',()=>{if(select.value==='system')apply('system');});
