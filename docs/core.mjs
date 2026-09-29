import {COURSE_VERSION,modules,finalQuestions} from './course.mjs';
export const PASS_MARK=80;
export const IDLE_MS=120000;
export const STORE_KEY='tni-pm-academy-v1';
export const UNIT_IDS=[...modules.map(m=>m.id),'final'];
export function uid(){return crypto.randomUUID();}
export function newProfile(name){return {id:uid(),name:name.trim().replace(/\s+/g,' '),courseVersion:COURSE_VERSION,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lessons:{},time:{},attempts:[],drafts:{},lastUnit:modules[0].id};}
export function questionSet(unit){return unit==='final'?finalQuestions:modules.find(m=>m.id===unit)?.quiz||[];}
export function attemptsFor(p,unit){return p.attempts.filter(a=>a.unit===unit);}
export function passed(p,unit){return attemptsFor(p,unit).some(a=>a.score>=PASS_MARK);}
export function completedCount(p){return modules.filter(m=>!!p.lessons[m.id]&&passed(p,m.id)).length;}
export function courseComplete(p){return completedCount(p)===modules.length&&passed(p,'final');}
export function totalSeconds(p){return Object.values(p.time).reduce((sum,t)=>sum+t.lesson+t.assessment,0);}
export function retakeCount(p){return UNIT_IDS.reduce((sum,id)=>sum+Math.max(0,attemptsFor(p,id).length-1),0);}
export function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function makeDraft(unit){return {id:uid(),unit,startedAt:new Date().toISOString(),seconds:0,answers:{},order:shuffle(questionSet(unit).map(q=>q.id)),options:Object.fromEntries(questionSet(unit).map(q=>[q.id,shuffle(q.options.map((_,i)=>i))]))};}
export function grade(unit,answers){const qs=questionSet(unit);if(!qs.length||qs.some(q=>!Number.isInteger(answers[q.id])||answers[q.id]<0||answers[q.id]>=q.options.length))throw new Error('Answer every question before submitting.');const correct=qs.filter(q=>answers[q.id]===q.correct).length;return {correct,total:qs.length,score:Math.round(correct/qs.length*100),passed:correct/qs.length*100>=PASS_MARK};}
export function finishAttempt(p,unit){const d=p.drafts[unit];if(!d)throw new Error('This assessment has already been submitted.');const result=grade(unit,d.answers);const attemptNumber=attemptsFor(p,unit).length+1;const a={id:d.id,unit,courseVersion:COURSE_VERSION,startedAt:d.startedAt,submittedAt:new Date().toISOString(),activeSeconds:d.seconds,attemptNumber,retakeNumber:attemptNumber-1,...result,answers:{...d.answers},order:[...d.order]};p.attempts.push(a);delete p.drafts[unit];return a;}
// Count only foreground, engaged study. Cap long suspension gaps to avoid sleep inflation.
export function activeDelta({now,lastTick,lastActivity,eligible}){if(!eligible||now<lastTick)return 0;return Math.max(0,Math.min(now,lastActivity+IDLE_MS)-Math.max(lastTick,now-5000))/1000;}
export function hours(seconds){return (seconds/3600).toFixed(2);}
export function duration(seconds){const s=Math.floor(seconds);return `${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m ${s%60}s`;}
export function escapeHtml(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const finite=x=>Number.isFinite(x)&&x>=0&&x<=315360000;
const timestamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
export function validateProfile(p){
 if(!p||typeof p.id!=='string'||!p.id||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||p.courseVersion!==COURSE_VERSION||!timestamp(p.createdAt)||!timestamp(p.updatedAt))throw new Error('This is not a valid record for this course version.');
 if(!p.lessons||!p.time||!p.drafts||!Array.isArray(p.attempts)||p.attempts.length>10000)throw new Error('The training record is incomplete.');
 for(const [id,date] of Object.entries(p.lessons))if(!modules.some(m=>m.id===id)||!timestamp(date))throw new Error('Invalid lesson completion record.');
 for(const [id,t] of Object.entries(p.time))if(!UNIT_IDS.includes(id)||!t||!finite(t.lesson)||!finite(t.assessment))throw new Error('Invalid contact-hour record.');
 const seen=new Set();
 for(const a of p.attempts){if(!UNIT_IDS.includes(a.unit)||typeof a.id!=='string'||seen.has(a.id)||!timestamp(a.startedAt)||!timestamp(a.submittedAt)||!finite(a.activeSeconds)||a.courseVersion!==COURSE_VERSION)throw new Error('Invalid assessment record.');seen.add(a.id);const qs=questionSet(a.unit);if(!Array.isArray(a.order)||a.order.length!==qs.length||new Set(a.order).size!==qs.length||a.order.some(id=>!qs.some(q=>q.id===id)))throw new Error('Invalid assessment question order.');const g=grade(a.unit,a.answers);if(g.score!==a.score||g.correct!==a.correct||g.total!==a.total||g.passed!==a.passed)throw new Error('Assessment score does not match the recorded answers.');}
 for(const id of UNIT_IDS){attemptsFor(p,id).forEach((a,i)=>{if(a.attemptNumber!==i+1||a.retakeNumber!==i)throw new Error('Invalid attempt sequence.');});}
 for(const [id,d] of Object.entries(p.drafts)){
  const qs=questionSet(id);if(!UNIT_IDS.includes(id)||!d||d.unit!==id||typeof d.id!=='string'||seen.has(d.id)||!timestamp(d.startedAt)||!finite(d.seconds)||!Array.isArray(d.order)||d.order.length!==qs.length||new Set(d.order).size!==qs.length||d.order.some(qid=>!qs.some(q=>q.id===qid))||!d.answers||!d.options)throw new Error('Invalid saved assessment.');
  for(const q of qs){const o=d.options[q.id];if(!Array.isArray(o)||o.length!==q.options.length||new Set(o).size!==o.length||o.some(i=>!Number.isInteger(i)||i<0||i>=q.options.length))throw new Error('Invalid assessment options.');}
  for(const [qid,v] of Object.entries(d.answers)){const q=qs.find(q=>q.id===qid);if(!q||!Number.isInteger(v)||v<0||v>=q.options.length)throw new Error('Invalid saved answer.');}
 }
 if(p.attempts.some(a=>a.unit==='final')&&completedCount(p)!==modules.length)throw new Error('Final assessment requires all module checks.');
 return p;
}
export function csvCell(v){let s=String(v??'');if(/^[\s]*[=+@\-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function toCsv(rows){return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');}
export function summaryRows(p){const rows=[['PM name','Learner ID','Course version','Module','Lesson reviewed at','Status','Best score percent','Submitted attempts','Retake count','Lesson active seconds','Assessment active seconds','Contact hours']];for(const id of UNIT_IDS){const a=attemptsFor(p,id),t=p.time[id]||{lesson:0,assessment:0};rows.push([p.name,p.id,p.courseVersion,id==='final'?'Final assessment':modules.find(m=>m.id===id).title,p.lessons[id]||'',passed(p,id)?'Passed':a.length?'Review needed':p.drafts[id]?'In progress':'Not completed',a.length?Math.max(...a.map(x=>x.score)):'',a.length,Math.max(0,a.length-1),Number(t.lesson.toFixed(3)),Number(t.assessment.toFixed(3)),((t.lesson+t.assessment)/3600).toFixed(4)]);}return rows;}
export function attemptRows(p){return [['PM name','Learner ID','Course version','Assessment','Attempt ID','Attempt number','Retake number','Started at UTC','Submitted at UTC','Correct','Question count','Score percent','Result','Active seconds'],...p.attempts.map(a=>[p.name,p.id,a.courseVersion,a.unit,a.id,a.attemptNumber,a.retakeNumber,a.startedAt,a.submittedAt,a.correct,a.total,a.score,a.passed?'Passed':'Review needed',Number(a.activeSeconds.toFixed(3))])];}
