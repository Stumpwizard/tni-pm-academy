import test from 'node:test';
import assert from 'node:assert/strict';
import {modules,finalQuestions,legacyFinalQuestions,FINAL_QUESTION_COUNT,COURSE_VERSION} from '../docs/course.mjs';
import {newProfile,grade,makeDraft,finishAttempt,passed,retakeCount,activeDelta,IDLE_MS,validateProfile,summaryRows,toCsv,completedCount,courseComplete,attemptRows,PASS_MARK,ASSESSMENT_POLICY_VERSION,LEGACY_COURSE_VERSION,PREVIOUS_COURSE_VERSION,questionSet,questionCount,assessmentQuestions,bestScore,attemptStatus} from '../docs/core.mjs';
const answers=(unit,n=questionCount(unit),version=COURSE_VERSION,order)=>Object.fromEntries((order?assessmentQuestions(unit,version,order):questionSet(unit,version)).map((q,i)=>[q.id,i<n?q.correct:(q.correct+1)%q.options.length]));
function submit(p,unit,n=questionCount(unit)){p.drafts[unit]=makeDraft(unit);p.drafts[unit].answers=answers(unit,n,COURSE_VERSION,p.drafts[unit].order);return finishAttempt(p,unit);}
function completeModules(p){for(const m of modules){p.lessons[m.id]=new Date().toISOString();submit(p,m.id);}}

test('The curriculum has ten questions per module and all 140 questions in the final bank',()=>{
 assert.equal(modules.length,12);assert.equal(modules.flatMap(m=>m.quiz).length,120);assert.equal(finalQuestions.length,140);assert.equal(legacyFinalQuestions.length,20);assert.equal(FINAL_QUESTION_COUNT,30);
 const qs=finalQuestions;assert.equal(new Set(qs.map(q=>q.id)).size,140);assert.equal(new Set(qs.map(q=>q.prompt)).size,140);
 for(const m of modules){assert.equal(m.quiz.length,10);assert.equal(questionSet(m.id,LEGACY_COURSE_VERSION).length,5);}
 for(const q of qs){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.ok(q.explanation);assert.ok(q.correct>=0&&q.correct<4);}
});
test('Every module requires 10 of 10 and the final requires 30 of 30',()=>{
 assert.equal(PASS_MARK,100);
 for(const m of modules){assert.equal(grade(m.id,answers(m.id,9)).score,90);assert.equal(grade(m.id,answers(m.id,9)).passed,false);assert.equal(grade(m.id,answers(m.id,10)).passed,true);assert.throws(()=>grade(m.id,answers(m.id,5,LEGACY_COURSE_VERSION)),/every/);}
 const d=makeDraft('final');const g=n=>grade('final',answers('final',n,COURSE_VERSION,d.order),COURSE_VERSION,d.order);assert.equal(g(29).passed,false);assert.equal(g(29).score,97);assert.equal(g(30).passed,true);assert.throws(()=>grade('final',{}),/question order/);
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
 const p=newProfile('Test PM');p.drafts.final=makeDraft('final');p.drafts.final.answers=answers('final',30,COURSE_VERSION,p.drafts.final.order);assert.throws(()=>finishAttempt(p,'final'),/100%/);
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
 p.drafts.final=makeDraft('final');assert.throws(()=>finishAttempt(p,'final'),/100%/);
});
test('Earlier five-question modules and 20-question finals remain history without completing the new course',()=>{
 const p=legacyProfile({policy:100,perfect:true}),before=structuredClone(p);validateProfile(p);
 assert.deepEqual(p.attempts,before.attempts);assert.equal(completedCount(p),0);assert.equal(passed(p,'final'),false);assert.equal(courseComplete(p),false);
 completeModules(p);assert.equal(completedCount(p),12);assert.equal(courseComplete(p),false);submit(p,'final');assert.equal(courseComplete(p),true);assert.equal(validateProfile(p),p);
 assert.equal(retakeCount(p),13);assert.equal(bestScore(p,'handoff'),100);assert.equal(attemptStatus(p.attempts.at(-1)),'Passed');
});
test('Saved five-question drafts gain five questions and preserve answers, option order and accrued time',()=>{
 const p=legacyProfile({policy:100,perfect:true}),before=structuredClone(p);validateProfile(p);
 const d=p.drafts.handoff,old=before.drafts.handoff;assert.equal(d.id,old.id);assert.equal(d.startedAt,old.startedAt);assert.equal(d.seconds,old.seconds);assert.deepEqual(d.answers,old.answers);assert.deepEqual(d.order.slice(0,5),old.order);
 assert.equal(d.order.length,10);assert.equal(new Set(d.order).size,10);assert.equal(d.courseVersion,COURSE_VERSION);
 for(const id of old.order)assert.deepEqual(d.options[id],old.options[id]);
 for(const id of d.order)assert.deepEqual([...d.options[id]].sort(),[0,1,2,3]);
 assert.equal(p.drafts.final,undefined);assert.equal(p.archivedDrafts.length,1);assert.deepEqual({...p.archivedDrafts[0],courseVersion:undefined},{...before.drafts.final,courseVersion:undefined});
 const snapshot=structuredClone(p);validateProfile(p);assert.deepEqual(p,snapshot);
 d.answers=answers('handoff');const a=finishAttempt(p,'handoff');assert.equal(a.total,10);assert.equal(a.activeSeconds,17);assert.equal(passed(p,'handoff'),true);
});
test('Legacy migrations reject corrupt scores, question sets, flags and versions before making changes',()=>{
 for(const mutate of [p=>p.attempts.at(-1).score=100,p=>p.attempts[0].passed=false,p=>p.attempts[0].order.push('h6'),p=>delete p.lessons.handoff,p=>p.assessmentPolicyVersion=99,p=>p.courseVersion='9.0.0',p=>p.drafts.handoff.answers.h6=0]){
  const p=legacyProfile();mutate(p);const before=structuredClone(p);assert.throws(()=>validateProfile(p));assert.deepEqual(p,before);
 }
});
test('Current final history cannot be validated using only old five-question module passes',()=>{
 const p=validateProfile(legacyProfile({policy:100,perfect:true})),current=newProfile('Current PM');completeModules(current);p.attempts[p.attempts.length-1]=submit(current,'final');assert.throws(()=>validateProfile(p),/all module checks/);
});

test('Final draws contain 30 unique questions and can sample every part of the full bank',()=>{
 const original=Math.random;let first,last;
 try{Math.random=()=>0;first=makeDraft('final');Math.random=()=>0.999999;last=makeDraft('final');}finally{Math.random=original;}
 for(const d of [first,last]){assert.equal(d.order.length,30);assert.equal(new Set(d.order).size,30);assert.equal(Object.keys(d.options).length,30);assert.ok(d.order.every(id=>finalQuestions.some(q=>q.id===id)));}
 assert.notDeepEqual(new Set(first.order),new Set(last.order));
 assert.equal(finalQuestions.length,140);assert.deepEqual(new Set(finalQuestions.map(q=>q.id)),new Set([...modules.flatMap(m=>m.quiz),...legacyFinalQuestions].map(q=>q.id)));
 // Shuffle inputs that place each question first verify that none of the bank is excluded.
 for(const q of finalQuestions){const order=[q.id,...finalQuestions.filter(x=>x.id!==q.id).slice(0,29).map(x=>x.id)];assert.equal(assessmentQuestions('final',COURSE_VERSION,order)[0].id,q.id);}
});
test('Reload and JSON restore preserve the exact final sample, options and partial answers',()=>{
 const p=newProfile('Resume PM');completeModules(p);const d=makeDraft('final');p.drafts.final=d;d.answers=Object.fromEntries(d.order.slice(0,7).map(id=>[id,0]));d.seconds=87;p.time.final={lesson:0,assessment:87};
 const before=structuredClone(p);validateProfile(p);assert.deepEqual(p,before);
 const restored=validateProfile(JSON.parse(JSON.stringify(p)));assert.deepEqual(restored,before);
 d.answers=answers('final',30,COURSE_VERSION,d.order);const a=finishAttempt(p,'final');assert.equal(a.total,30);assert.equal(a.activeSeconds,87);assert.deepEqual(a.order,before.drafts.final.order);assert.deepEqual(assessmentQuestions(a.unit,a.courseVersion,a.order).map(q=>q.id),a.order);assert.equal(validateProfile(p),p);
});
test('Final validation rejects malformed samples, answers outside the sample and altered scores without mutation',()=>{
 const base=newProfile('Validate PM');completeModules(base);base.drafts.final=makeDraft('final');
 for(const mutate of [p=>p.drafts.final.order.pop(),p=>p.drafts.final.order[1]=p.drafts.final.order[0],p=>p.drafts.final.order[0]='missing',p=>delete p.drafts.final.order,p=>p.drafts.final.answers[finalQuestions.find(q=>!p.drafts.final.order.includes(q.id)).id]=0,p=>p.drafts.final.options[p.drafts.final.order[0]]=[0,0,2,3]]){const p=structuredClone(base);mutate(p);const before=structuredClone(p);assert.throws(()=>validateProfile(p));assert.deepEqual(p,before);}
 const p=structuredClone(base);p.drafts.final.answers=answers('final',29,COURSE_VERSION,p.drafts.final.order);const a=finishAttempt(p,'final');assert.equal(a.correct,29);assert.equal(a.score,97);assert.equal(a.passed,false);assert.equal(courseComplete(p),false);validateProfile(p);
 for(const mutate of [p=>p.attempts.at(-1).score=100,p=>p.attempts.at(-1).passed=true,p=>p.attempts.at(-1).total=140,p=>delete p.attempts.at(-1).order]){const bad=structuredClone(p);mutate(bad);assert.throws(()=>validateProfile(bad));}
});
test('Version 1.1 module passes survive while old finals and unfinished final drafts remain historical',()=>{
 const p=newProfile('Existing PM');completeModules(p);p.courseVersion=PREVIOUS_COURSE_VERSION;for(const a of p.attempts)a.courseVersion=PREVIOUS_COURSE_VERSION;
 const stamp=new Date().toISOString(),response=answers('final',20,PREVIOUS_COURSE_VERSION),order=legacyFinalQuestions.map(q=>q.id);
 p.attempts.push({id:crypto.randomUUID(),unit:'final',courseVersion:PREVIOUS_COURSE_VERSION,passMark:100,startedAt:stamp,submittedAt:stamp,activeSeconds:33,attemptNumber:1,retakeNumber:0,...grade('final',response,PREVIOUS_COURSE_VERSION,order),answers:response,order});
 p.drafts.final={id:crypto.randomUUID(),unit:'final',courseVersion:PREVIOUS_COURSE_VERSION,startedAt:stamp,seconds:42,answers:{f01:0},order:[...order].reverse(),options:Object.fromEntries(order.map(id=>[id,[2,0,3,1]]))};p.time.final={lesson:0,assessment:75};delete p.archivedDrafts;
 const before=structuredClone(p);validateProfile(p);assert.equal(completedCount(p),12);assert.equal(passed(p,'final'),false);assert.equal(courseComplete(p),false);assert.equal(bestScore(p,'final'),null);assert.equal(attemptStatus(p.attempts.at(-1)),'Earlier 20-question assessment');assert.deepEqual(p.attempts,before.attempts);assert.deepEqual(p.time,before.time);assert.deepEqual(p.archivedDrafts,[before.drafts.final]);assert.equal(p.drafts.final,undefined);
 assert.deepEqual(validateProfile(JSON.parse(JSON.stringify(p))),p);const snapshot=structuredClone(p);validateProfile(p);assert.deepEqual(p,snapshot);
 const a=submit(p,'final');assert.equal(a.attemptNumber,2);assert.equal(a.retakeNumber,1);assert.equal(a.total,30);assert.equal(courseComplete(p),true);assert.equal(validateProfile(p),p);assert.equal(attemptRows(p).at(-1)[10],30);
});
