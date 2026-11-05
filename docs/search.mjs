import {modules,glossary} from './course.mjs?v=20261105-06';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const aliases={po:'purchase order',ocr:'order change request',gm:'general manager',erp:'sage',shipping:'shipment',schedule:'planning',flowchart:'process map'};
export const searchIndex=modules.flatMap((m,n)=>[{title:m.title,context:`Module ${String(n+1).padStart(2,'0')}`,text:[m.subtitle,m.foundation,...m.objectives,m.takeaway].join(' '),href:`#lesson/${m.id}`},...m.sections.map((s,i)=>({title:s.title,context:`Module ${String(n+1).padStart(2,'0')} · ${m.title}`,text:[...s.paragraphs,...s.steps].join(' '),href:`#lesson/${m.id}/section-${i+1}`}))]);
searchIndex.push(...glossary.map(([title,text])=>({title,text,context:'PM field guide · Vocabulary',href:'#reference'})),
 {title:'OCR form',context:'Reference download · Excel',text:'Order Change Request workbook for customer scope changes.',href:'./downloads/OCR.xls'},
 {title:'Equipment Runoff Checklist Draft 02',context:'Reference download · Word',text:'Equipment testing, runoff and acceptance checklist.',href:'./downloads/TNi-Equipment-Runoff-Checklist.docx'},
 {title:'Process flowchart',context:'Reference download · PDF',text:'TNi project management process map, delivery, scope changes, risks and reporting.',href:'./downloads/TNi-PM-Process-Map.pdf'});
export function search(query){const terms=normalize(query).split(' ').filter(Boolean);if(!terms.length)return [];return searchIndex.map(item=>{const title=normalize(item.title),body=normalize(item.text+' '+item.context);let score=0;for(const term of terms){const alternatives=[term,aliases[term]].filter(Boolean);if(!alternatives.some(t=>title.includes(t)||body.includes(t)))return null;score+=alternatives.some(t=>title.includes(t))?8:2;}if(title.includes(normalize(query)))score+=12;return {...item,score};}).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,15);}
export function excerpt(text,query){const terms=normalize(query).split(' ').filter(Boolean);const pos=terms.map(t=>text.toLowerCase().indexOf(t)).filter(n=>n>=0);const start=Math.max(0,(pos.length?Math.min(...pos):0)-65);return (start?'…':'')+text.slice(start,start+230)+(text.length>start+230?'…':'');}
if(typeof document!=='undefined'){
 const input=document.getElementById('academy-search'),results=document.getElementById('search-results'),status=document.getElementById('search-status'),clear=document.getElementById('search-clear');
 function show(){const query=input.value.trim();clear.hidden=!query;if(!query){results.hidden=true;status.textContent='';return;}const matches=search(query);status.textContent=matches.length?`${matches.length===15?'Top ':''}${matches.length} matching results`:'No matches. Try OCR, runoff, budget, warranty or process flowchart.';results.innerHTML=matches.map(item=>`<a class="search-result" href="${escape(item.href)}" ${item.href.startsWith('./')?'target="_blank" rel="noopener"':''}><small>${escape(item.context)}</small><strong>${escape(item.title)}</strong><span>${escape(excerpt(item.text,query))}</span></a>`).join('');results.hidden=!matches.length;}
 input.addEventListener('input',show);input.addEventListener('focus',()=>{if(input.value)show();});
 document.getElementById('search-form').addEventListener('submit',event=>{event.preventDefault();show();results.querySelector('a')?.focus();});
 clear.addEventListener('click',()=>{input.value='';show();input.focus();});
 document.getElementById('academy-search-area').addEventListener('keydown',event=>{if(event.key==='Escape'){results.hidden=true;input.focus();}if(event.key==='ArrowDown'&&event.target===input){event.preventDefault();results.querySelector('a')?.focus();}});
 results.addEventListener('click',event=>{if(event.target.closest('a')){results.hidden=true;status.textContent='';}});
 document.addEventListener('click',event=>{if(!event.target.closest('#academy-search-area'))results.hidden=true;});
}
