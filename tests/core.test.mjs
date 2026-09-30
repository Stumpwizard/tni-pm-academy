import test from 'node:test';
import assert from 'node:assert/strict';
import {modules,finalQuestions,COURSE_VERSION} from '../docs/course.mjs';
import {newProfile,grade,makeDraft,finishAttempt,passed,retakeCount,activeDelta,IDLE_MS,validateProfile,summaryRows,toCsv,completedCount,courseComplete,attemptRows,PASS_MARK,ASSESSMENT_POLICY_VERSION,LEGACY_COURSE_VERSION,questionSet,bestScore,attemptStatus} from '../docs/core.mjs';
const answers=(unit,n=questionSet(unit).length,version=COURSE_VERSION)=>Object.fromEntries(questionSet(unit,version).map((q,i)=>[q.id,i<n?q.correct:(q.correct+1)%q.options.length]));
function submit(p,unit,n=questionSet(unit).length){p.drafts[unit]=makeDraft(unit);p.drafts[unit].answers=answers(unit,n);return finishAttempt(p,unit);}
function completeModules(p){for(const m of modules){p.lessons[m.id]=new Date().toISOString();submit(p,m.id);}}

test('The curriculum has ten questions in each module and an unchanged twenty-question final',()=>{
 assert.equal(modules.length,12);assert.equal(modules.flatMap(m=>m.quiz).length,120);assert.equal(finalQuestions.length,20);
 const qs=[...modules.flatMap(m=>m.quiz),...finalQuestions];assert.equal(new Set(qs.map(q=>q.id)).size,140);assert.equal(new Set(qs.map(q=>q.prompt)).size,140);
 for(const m of modules){assert.equal(m.quiz.length,10);assert.equal(questionSet(m.id,LEGACY_COURSE_VERSION).length,5);}
 for(const q of qs){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.ok(q.explanation);assert.ok(q.correct>=0&&q.correct<4);}
});
test('Every module requires 10 of 10 and the final requires 20 of 20',()=>{
 assert.equal(PASS_MARK,100);
 for(const m of modules){assert.equal(grade(m.id,answers(m.id,9)).score,90);assert.equal(grade(m.id,answers(m.id,9)).passed,false);assert.equal(grade(m.id,answers(m.id,10)).passed,true);assert.throws(()=>grade(m.id,answers(m.id,5,LEGACY_COURSE_VERSION)),/every/);}
 assert.equal(grade('final',answers('final',19)).passed,false);assert.equal(grade('final',answers('final',19)).score,95);assert.equal(grade('final',answers('final',20)).passed,true);
});
test('Retry history retains a 10/10 pass after a lower score and prevents duplicate submission',()=>{
 const p=newProfile('Test PM'),unit=modules[0].id;assert.throws(()=>grade(unit,{}),/every/);
 for(const n of [9,10,8])submit(p,unit,n);
 assert.equal(p.attempts.length,3);assert.equal(retakeCount(p),2);assert.equal(passed(p,unit),true);assert.equal(bestScore(p,unit),100);assert.throws(()=>finishAttempt(p,unit),/already/);
});
test('Active clock excludes hidden, idle and suspension periods',()=>{
 assert.equal(activeDelta({now:1000,lastTick:0,lastActivity:0,eligible:true}),1);assert.equal(activeDelta({now:1000,lastTick:0,lastActivity:0,eligible:false}),0);assert.equal(activeDelta({now:IDLE_MS+1000,lastTick:IDLE_MS-1000,lastActivity:0,eligible:true}),1);assert.equal(activeDelta({now:IDLE_MS+2000,lastTick:IDLE_MS+1000,lastActivity:0,eligible:true}),0);assert.equal(activeDelta({now:60000,lastTick:0,lastActivity:60000,eligible:true}),5);
});
test('Import validation rejects invalid answers, altered scores and broken ordering',()=>{
 const p=newProfile('Test PM'),id=modules[0].id;submit(p,id);assert.equal(validateProfile(p),p);
 for(const mutate of [p=>p.attempts[0].score=90,p=>p.attempts[0].order=['missing'],p=>p.attempts[0].retakeNumber=20,p=>p.attempts[0].passed=false,p=>p.attempts[0].answers.h1=9]){const bad=structuredClone(p);mutate(bad);assert.throws(()=>validateProfile(bad));}
});
test('Contact time export includes unsubmitted assessment time and escapes spreadsheet formula names',()=>{
 const p=newProfile('=Example PM');p.time.handoff={lesson:3600,assessment:1800};const rows=summaryRows(p);assert.equal(rows[1].at(-1),'1.5000');assert.ok(toCsv(rows).includes("'=Example PM"));
});
test('Course completion and final submission require all expanded module checks',()=>{
 const p=newProfile('Test PM');p.drafts.final=makeDraft('final');p.drafts.final.answers=answers('final');assert.throws(()=>finishAttempt(p,'final'),/100%/);
 completeModules(p);assert.equal(completedCount(p),12);assert.equal(courseComplete(p),false);finishAttempt(p,'final');assert.equal(courseComplete(p),true);assert.equal(validateProfile(p),p);
});
function legacyProfile({policy=80,perfect=false}={}){
 const p=newProfile('Legacy PM');p.courseVersion=LEGACY_COURSE_VERSION;if(policy===80)delete p.assessmentPolicyVersion;
 const stamp=new Date().toISOString();
 for(const unit of [...modules.map(m=>m.id),'final']){
  const qs=questionSet(unit,LEGACY_COURSE_VERSION);if(unit!=='final')p.lessons[unit]=stamp;
  const response=answers(unit,perfect||unit==='handoff'?qs.length:qs.length-1,LEGACY_COURSE_VERSION),g=grade(unit,response,LEGACY_COURSE_VERSION);
  const a={id:crypto.randomUUID(),unit,courseVersion:LEGACY_COURSE_VERSION,startedAt:stamp,submittedAt:stamp,activeSeconds:30,attemptNumber:1,retakeNumber:0,...g,passed:g.score>=policy,answers:response,order:qs.map(q=>q.id)};
  if(policy===100)a.passMark=100;p.attempts.push(a);
 }
 for(const unit of ['handoff','final']){
  const qs=questionSet(unit,LEGACY_COURSE_VERSION),d=makeDraft(unit);delete d.courseVersion;d.order=qs.map(q=>q.id).reverse();d.options=Object.fromEntries(qs.map(q=>[q.id,[2,0,3,1]]));d.answers={[qs[0].id]:0};d.seconds=17;p.drafts[unit]=d;
 }
 p.time.handoff={lesson:123,assessment:45};return p;
}
test('Five-question records from the original 80% policy migrate without losing history or time',()=>{
 const p=legacyProfile(),before=structuredClone(p);assert.equal(validateProfile(p),p);assert.equal(p.courseVersion,COURSE_VERSION);assert.equal(p.assessmentPolicyVersion,ASSESSMENT_POLICY_VERSION);
 assert.equal(completedCount(p),0);assert.equal(courseComplete(p),false);assert.equal(passed(p,'handoff'),false);assert.equal(passed(p,'final'),false);assert.equal(bestScore(p,'handoff'),null);
 assert.equal(p.attempts.length,13);assert.deepEqual(p.time,before.time);assert.deepEqual(p.lessons,before.lessons);
 p.attempts.forEach((a,i)=>{const old=before.attempts[i];assert.deepEqual({...a,passMark:undefined,passed:old.passed},{...old,passMark:undefined});assert.equal(a.passMark,80);assert.equal(a.passed,a.score===100);});
 assert.equal(summaryRows(p)[1][5],'Review needed');assert.equal(summaryRows(p)[1][6],'');assert.equal(attemptRows(p)[1][12],'Earlier 5-question assessment');
 assert.equal(validateProfile(p),p);assert.deepEqual(validateProfile(JSON.parse(JSON.stringify(p))),p);
 assert.throws(()=>finishAttempt(p,'final'),/100%/);
});
test('Five-question records under the 100% policy require expanded modules but retain an unchanged perfect final',()=>{
 const p=legacyProfile({policy:100,perfect:true}),before=structuredClone(p);validateProfile(p);
 assert.deepEqual(p.attempts,before.attempts);assert.equal(completedCount(p),0);assert.equal(passed(p,'final'),true);assert.equal(courseComplete(p),false);
 completeModules(p);assert.equal(completedCount(p),12);assert.equal(courseComplete(p),true);assert.equal(validateProfile(p),p);
 assert.equal(retakeCount(p),12);assert.equal(bestScore(p,'handoff'),100);assert.equal(attemptStatus(p.attempts.at(-1)),'Passed');
});
test('Saved five-question drafts gain five questions and preserve answers, option order and accrued time',()=>{
 const p=legacyProfile({policy:100,perfect:true}),before=structuredClone(p);validateProfile(p);
 const d=p.drafts.handoff,old=before.drafts.handoff;assert.equal(d.id,old.id);assert.equal(d.startedAt,old.startedAt);assert.equal(d.seconds,old.seconds);assert.deepEqual(d.answers,old.answers);assert.deepEqual(d.order.slice(0,5),old.order);
 assert.equal(d.order.length,10);assert.equal(new Set(d.order).size,10);assert.equal(d.courseVersion,COURSE_VERSION);
 for(const id of old.order)assert.deepEqual(d.options[id],old.options[id]);
 for(const id of d.order)assert.deepEqual([...d.options[id]].sort(),[0,1,2,3]);
 assert.deepEqual({...p.drafts.final,courseVersion:undefined},{...before.drafts.final,courseVersion:undefined});
 const snapshot=structuredClone(p);validateProfile(p);assert.deepEqual(p,snapshot);
 d.answers=answers('handoff');const a=finishAttempt(p,'handoff');assert.equal(a.total,10);assert.equal(a.activeSeconds,17);assert.equal(passed(p,'handoff'),true);
});
test('Legacy migrations reject corrupt scores, question sets, flags and versions before making changes',()=>{
 for(const mutate of [p=>p.attempts.at(-1).score=100,p=>p.attempts[0].passed=false,p=>p.attempts[0].order.push('h6'),p=>delete p.lessons.handoff,p=>p.assessmentPolicyVersion=99,p=>p.courseVersion='9.0.0',p=>p.drafts.handoff.answers.h6=0]){
  const p=legacyProfile();mutate(p);const before=structuredClone(p);assert.throws(()=>validateProfile(p));assert.deepEqual(p,before);
 }
});
test('Current final history cannot be validated using only old five-question module passes',()=>{
 const p=validateProfile(legacyProfile({policy:100,perfect:true}));p.attempts.at(-1).courseVersion=COURSE_VERSION;assert.throws(()=>validateProfile(p),/all module checks/);
});
