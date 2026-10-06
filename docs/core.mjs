import {COURSE_VERSION,FINAL_QUESTION_COUNT,modules,finalQuestions,legacyFinalQuestions} from './course.mjs?v=20261006-01';
export const PASS_MARK=100;
export const ASSESSMENT_POLICY_VERSION=2;
const LEGACY_PASS_MARK=80;
export const LEGACY_COURSE_VERSION='1.0.0';
export const PREVIOUS_COURSE_VERSION='1.1.0';
const versions=[LEGACY_COURSE_VERSION,PREVIOUS_COURSE_VERSION,COURSE_VERSION];
const supportedVersion=v=>versions.includes(v);
export const IDLE_MS=120000;
export const STORE_KEY='tni-pm-academy-v1';
export const UNIT_IDS=[...modules.map(m=>m.id),'final'];
export function uid(){return crypto.randomUUID();}
export function newProfile(name){return {id:uid(),name:name.trim().replace(/\s+/g,' '),courseVersion:COURSE_VERSION,assessmentPolicyVersion:ASSESSMENT_POLICY_VERSION,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lessons:{},time:{},attempts:[],drafts:{},archivedDrafts:[],lastUnit:modules[0].id};}
export function questionSet(unit,version=COURSE_VERSION){if(!supportedVersion(version))return [];if(unit==='final')return version===COURSE_VERSION?finalQuestions:legacyFinalQuestions;const qs=modules.find(m=>m.id===unit)?.quiz||[];return version===LEGACY_COURSE_VERSION?qs.slice(0,5):qs;}
export function questionCount(unit,version=COURSE_VERSION){return unit==='final'&&version===COURSE_VERSION?FINAL_QUESTION_COUNT:questionSet(unit,version).length;}
export function assessmentQuestions(unit,version=COURSE_VERSION,order){
 const bank=questionSet(unit,version),count=questionCount(unit,version);
 if(order===undefined&&unit!=='final')return bank;
 if(order===undefined&&version!==COURSE_VERSION)return bank;
 if(!count||!Array.isArray(order)||order.length!==count||new Set(order).size!==count||order.some(id=>!bank.some(q=>q.id===id)))throw new Error('Invalid assessment question order.');
 return order.map(id=>bank.find(q=>q.id===id));
}
export function attemptsFor(p,unit){return p.attempts.filter(a=>a.unit===unit);}
export function isCurrentAttempt(a){return supportedVersion(a.courseVersion)&&(a.unit==='final'?a.courseVersion===COURSE_VERSION:a.courseVersion!==LEGACY_COURSE_VERSION);}
export function bestScore(p,unit){const a=attemptsFor(p,unit).filter(isCurrentAttempt);return a.length?Math.max(...a.map(x=>x.score)):null;}
export function attemptStatus(a){return !isCurrentAttempt(a)?`Earlier ${a.total}-question assessment`:a.passed?'Passed':'Review needed';}
export function passed(p,unit){return attemptsFor(p,unit).some(a=>isCurrentAttempt(a)&&a.score>=PASS_MARK);}
export function completedCount(p){return modules.filter(m=>!!p.lessons[m.id]&&passed(p,m.id)).length;}
export function courseComplete(p){return completedCount(p)===modules.length&&passed(p,'final');}
export function courseCompletionDate(p){if(!p||!courseComplete(p))return null;return attemptsFor(p,'final').filter(a=>isCurrentAttempt(a)&&a.score>=PASS_MARK).reduce((first,a)=>!first||Date.parse(a.submittedAt)<Date.parse(first)?a.submittedAt:first,null);}
export function totalSeconds(p){return Object.values(p.time).reduce((sum,t)=>sum+t.lesson+t.assessment,0);}
export function retakeCount(p){return UNIT_IDS.reduce((sum,id)=>sum+Math.max(0,attemptsFor(p,id).length-1),0);}
export function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function makeDraft(unit){const bank=questionSet(unit),order=shuffle(bank.map(q=>q.id)).slice(0,questionCount(unit));if(!order.length)throw new Error('Unknown assessment.');const qs=assessmentQuestions(unit,COURSE_VERSION,order);return {id:uid(),unit,courseVersion:COURSE_VERSION,startedAt:new Date().toISOString(),seconds:0,answers:{},order,options:Object.fromEntries(qs.map(q=>[q.id,shuffle(q.options.map((_,i)=>i))]))};}
export function grade(unit,answers,version=COURSE_VERSION,order){const qs=assessmentQuestions(unit,version,order);if(!qs.length||!answers||typeof answers!=='object'||Array.isArray(answers)||Object.keys(answers).some(id=>!qs.some(q=>q.id===id))||qs.some(q=>!Number.isInteger(answers[q.id])||answers[q.id]<0||answers[q.id]>=q.options.length))throw new Error('Answer every question before submitting.');const correct=qs.filter(q=>answers[q.id]===q.correct).length;return {correct,total:qs.length,score:Math.round(correct/qs.length*100),passed:correct===qs.length};}
export function finishAttempt(p,unit){const d=p.drafts[unit];if(!d)throw new Error('This assessment has already been submitted.');if(d.courseVersion!==COURSE_VERSION)throw new Error('Reload the course to update this saved assessment.');if(unit==='final'&&completedCount(p)!==modules.length)throw new Error('Review and pass every module at 100% before submitting the final assessment.');const result=grade(unit,d.answers,d.courseVersion,d.order);const attemptNumber=attemptsFor(p,unit).length+1;const a={id:d.id,unit,courseVersion:COURSE_VERSION,passMark:PASS_MARK,startedAt:d.startedAt,submittedAt:new Date().toISOString(),activeSeconds:d.seconds,attemptNumber,retakeNumber:attemptNumber-1,...result,answers:{...d.answers},order:[...d.order]};p.attempts.push(a);delete p.drafts[unit];return a;}
// Count only foreground, engaged study. Cap long suspension gaps to avoid sleep inflation.
export function activeDelta({now,lastTick,lastActivity,eligible}){if(!eligible||now<lastTick)return 0;return Math.max(0,Math.min(now,lastActivity+IDLE_MS)-Math.max(lastTick,now-5000))/1000;}
export function hours(seconds){return (seconds/3600).toFixed(2);}
export function duration(seconds){const s=Math.floor(seconds);return `${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m ${s%60}s`;}
export function escapeHtml(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const finite=x=>Number.isFinite(x)&&x>=0&&x<=315360000;
const timestamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
export function validateProfile(p){
 if(!p||typeof p.id!=='string'||!p.id||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||!supportedVersion(p.courseVersion)||!timestamp(p.createdAt)||!timestamp(p.updatedAt))throw new Error('This is not a valid record for this course version.');
 if(!p.lessons||!p.time||!p.drafts||!Array.isArray(p.attempts)||p.attempts.length>10000)throw new Error('The training record is incomplete.');
 const legacy=p.assessmentPolicyVersion===undefined;
 if((legacy&&p.courseVersion!==LEGACY_COURSE_VERSION)||(!legacy&&p.assessmentPolicyVersion!==ASSESSMENT_POLICY_VERSION))throw new Error('Unsupported assessment policy version.');
 for(const [id,date] of Object.entries(p.lessons))if(!modules.some(m=>m.id===id)||!timestamp(date))throw new Error('Invalid lesson completion record.');
 for(const [id,t] of Object.entries(p.time))if(!UNIT_IDS.includes(id)||!t||!finite(t.lesson)||!finite(t.assessment))throw new Error('Invalid contact-hour record.');
 const archived=p.archivedDrafts??[];
 if(!Array.isArray(archived)||archived.length>10000)throw new Error('Invalid archived assessments.');
 const seen=new Set();
 for(const a of p.attempts){
  if(!UNIT_IDS.includes(a.unit)||!Array.isArray(a.order)||typeof a.id!=='string'||!a.id||seen.has(a.id)||!timestamp(a.startedAt)||!timestamp(a.submittedAt)||!finite(a.activeSeconds)||!supportedVersion(a.courseVersion)||versions.indexOf(a.courseVersion)>versions.indexOf(p.courseVersion)||(!legacy&&![LEGACY_PASS_MARK,PASS_MARK].includes(a.passMark)))throw new Error('Invalid assessment record.');
  seen.add(a.id);assessmentQuestions(a.unit,a.courseVersion,a.order);
  const g=grade(a.unit,a.answers,a.courseVersion,a.order),expectedPassed=legacy?g.score>=LEGACY_PASS_MARK:g.passed;
  if(g.score!==a.score||g.correct!==a.correct||g.total!==a.total||expectedPassed!==a.passed)throw new Error('Assessment score does not match the recorded answers.');
 }
 for(const id of UNIT_IDS){attemptsFor(p,id).forEach((a,i)=>{if(a.attemptNumber!==i+1||a.retakeNumber!==i)throw new Error('Invalid attempt sequence.');});}
 function checkDraft(id,d){
  const version=d?.courseVersion??p.courseVersion;
  if(!UNIT_IDS.includes(id)||!d||d.unit!==id||!Array.isArray(d.order)||typeof d.id!=='string'||!d.id||seen.has(d.id)||!timestamp(d.startedAt)||!finite(d.seconds)||!supportedVersion(version)||versions.indexOf(version)>versions.indexOf(p.courseVersion)||!d.answers||typeof d.answers!=='object'||Array.isArray(d.answers)||!d.options||typeof d.options!=='object'||Array.isArray(d.options))throw new Error('Invalid saved assessment.');
  const qs=assessmentQuestions(id,version,d.order);seen.add(d.id);
  if(Object.keys(d.options).length!==qs.length)throw new Error('Invalid assessment options.');
  for(const q of qs){const o=d.options[q.id];if(!Array.isArray(o)||o.length!==q.options.length||new Set(o).size!==o.length||o.some(i=>!Number.isInteger(i)||i<0||i>=q.options.length))throw new Error('Invalid assessment options.');}
  for(const [qid,v] of Object.entries(d.answers)){const q=qs.find(q=>q.id===qid);if(!q||!Number.isInteger(v)||v<0||v>=q.options.length)throw new Error('Invalid saved answer.');}
 }
 for(const [id,d] of Object.entries(p.drafts))checkDraft(id,d);
 for(const d of archived){if(d.unit!=='final'||![LEGACY_COURSE_VERSION,PREVIOUS_COURSE_VERSION].includes(d.courseVersion))throw new Error('Invalid archived final.');checkDraft(d.unit,d);}
 // Preserve historical finals under their original module prerequisites.
 for(const a of p.attempts.filter(a=>a.unit==='final')){const required=legacy?LEGACY_PASS_MARK:a.passMark;if(!modules.every(m=>p.lessons[m.id]&&attemptsFor(p,m.id).some(x=>x.score>=required&&(a.courseVersion===LEGACY_COURSE_VERSION||x.courseVersion!==LEGACY_COURSE_VERSION))))throw new Error('Final assessment requires all module checks.');}
 // Migrate only after the entire record validates. Preserve historical attempts and all study time.
 if(legacy){for(const a of p.attempts){a.passMark=LEGACY_PASS_MARK;a.passed=a.score>=PASS_MARK;}p.assessmentPolicyVersion=ASSESSMENT_POLICY_VERSION;}
 // Archive old finals intact; never substitute a random sample into work already started.
 p.archivedDrafts=archived;
 for(const [id,d] of Object.entries(p.drafts)){
  const version=d.courseVersion??p.courseVersion;
  if(id==='final'){
   if(version!==COURSE_VERSION){p.archivedDrafts.push({...d,courseVersion:version});delete p.drafts[id];}else d.courseVersion=COURSE_VERSION;
   continue;
  }
  const added=questionSet(id).filter(q=>!d.order.includes(q.id));
  d.order.push(...shuffle(added.map(q=>q.id)));
  for(const q of added)d.options[q.id]=shuffle(q.options.map((_,i)=>i));
  d.courseVersion=COURSE_VERSION;
 }
 p.courseVersion=COURSE_VERSION;
 return p;
}
export function csvCell(v){let s=String(v??'');if(/^[\s]*[=+@\-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function toCsv(rows){return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');}
export function summaryRows(p){const rows=[['PM name','Learner ID','Course version','Module','Lesson reviewed at','Status','Best score percent','Submitted attempts','Retake count','Lesson active seconds','Assessment active seconds','Contact hours']];for(const id of UNIT_IDS){const a=attemptsFor(p,id),t=p.time[id]||{lesson:0,assessment:0};rows.push([p.name,p.id,p.courseVersion,id==='final'?'Final assessment':modules.find(m=>m.id===id).title,p.lessons[id]||'',passed(p,id)?'Passed':a.length?'Review needed':p.drafts[id]?'In progress':'Not completed',bestScore(p,id)??'',a.length,Math.max(0,a.length-1),Number(t.lesson.toFixed(3)),Number(t.assessment.toFixed(3)),((t.lesson+t.assessment)/3600).toFixed(4)]);}return rows;}
export function attemptRows(p){return [['PM name','Learner ID','Course version','Assessment','Attempt ID','Attempt number','Retake number','Started at UTC','Submitted at UTC','Correct','Question count','Score percent','Result','Active seconds'],...p.attempts.map(a=>[p.name,p.id,a.courseVersion,a.unit,a.id,a.attemptNumber,a.retakeNumber,a.startedAt,a.submittedAt,a.correct,a.total,a.score,attemptStatus(a),Number(a.activeSeconds.toFixed(3))])];}
