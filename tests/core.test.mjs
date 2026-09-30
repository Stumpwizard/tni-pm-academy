import test from 'node:test';
import assert from 'node:assert/strict';
import {modules,finalQuestions} from '../docs/course.mjs';
import {newProfile,grade,makeDraft,finishAttempt,passed,retakeCount,activeDelta,IDLE_MS,validateProfile,summaryRows,toCsv,completedCount,courseComplete,attemptRows,PASS_MARK,ASSESSMENT_POLICY_VERSION} from '../docs/core.mjs';
test('The full curriculum has 12 modules, 60 knowledge checks and 20 final questions',()=>{assert.equal(modules.length,12);assert.equal(modules.flatMap(m=>m.quiz).length,60);assert.equal(finalQuestions.length,20);const qs=[...modules.flatMap(m=>m.quiz),...finalQuestions];assert.equal(new Set(qs.map(q=>q.id)).size,80);for(const q of qs){assert.equal(q.options.length,4);assert.ok(q.explanation);}});
test('100 percent boundary, retry history and duplicate submission protection',()=>{const p=newProfile('Test PM'),unit=modules[0].id,qs=modules[0].quiz;const answer=correct=>Object.fromEntries(qs.map((q,i)=>[q.id,i<correct?0:1]));assert.throws(()=>grade(unit,{}),/every/);assert.equal(grade(unit,answer(4)).passed,false);assert.equal(grade(unit,answer(5)).passed,true);for(const correct of [4,5,3]){p.drafts[unit]=makeDraft(unit);p.drafts[unit].answers=answer(correct);finishAttempt(p,unit);}assert.equal(p.attempts.length,3);assert.equal(retakeCount(p),2);assert.equal(passed(p,unit),true);assert.throws(()=>finishAttempt(p,unit),/already/);});
test('Every module requires 5 of 5 and the final requires 20 of 20',()=>{assert.equal(PASS_MARK,100);for(const m of modules){const a=n=>Object.fromEntries(m.quiz.map((q,i)=>[q.id,i<n?0:1]));assert.equal(grade(m.id,a(4)).passed,false);assert.equal(grade(m.id,a(5)).passed,true);}const a=n=>Object.fromEntries(finalQuestions.map((q,i)=>[q.id,i<n?0:1]));assert.equal(grade('final',a(19)).passed,false);assert.equal(grade('final',a(19)).score,95);assert.equal(grade('final',a(20)).passed,true);});
test('Active clock excludes hidden, idle and suspension periods',()=>{assert.equal(activeDelta({now:1000,lastTick:0,lastActivity:0,eligible:true}),1);assert.equal(activeDelta({now:1000,lastTick:0,lastActivity:0,eligible:false}),0);assert.equal(activeDelta({now:IDLE_MS+1000,lastTick:IDLE_MS-1000,lastActivity:0,eligible:true}),1);assert.equal(activeDelta({now:IDLE_MS+2000,lastTick:IDLE_MS+1000,lastActivity:0,eligible:true}),0);assert.equal(activeDelta({now:60000,lastTick:0,lastActivity:60000,eligible:true}),5);});
test('Import validation rejects invalid answers, altered scores and broken ordering',()=>{const p=newProfile('Test PM'),id=modules[0].id;p.drafts[id]=makeDraft(id);p.drafts[id].answers=Object.fromEntries(modules[0].quiz.map(q=>[q.id,0]));finishAttempt(p,id);assert.equal(validateProfile(p),p);const bad=structuredClone(p);bad.attempts[0].score=80;assert.throws(()=>validateProfile(bad));const bad2=structuredClone(p);bad2.attempts[0].order=['missing'];assert.throws(()=>validateProfile(bad2));const bad3=structuredClone(p);bad3.attempts[0].retakeNumber=20;assert.throws(()=>validateProfile(bad3));});
test('Contact time export includes unsubmitted assessment time and escapes spreadsheet formula names',()=>{const p=newProfile('=Example PM');p.time.handoff={lesson:3600,assessment:1800};const rows=summaryRows(p);assert.equal(rows[1].at(-1),'1.5000');assert.ok(toCsv(rows).includes("'=Example PM"));});
test('Course completion needs all lessons, their passes, and the final',()=>{const p=newProfile('Test PM');for(const m of modules){p.lessons[m.id]=new Date().toISOString();p.drafts[m.id]=makeDraft(m.id);p.drafts[m.id].answers=Object.fromEntries(m.quiz.map(q=>[q.id,0]));finishAttempt(p,m.id);}assert.equal(completedCount(p),12);assert.equal(courseComplete(p),false);p.drafts.final=makeDraft('final');p.drafts.final.answers=Object.fromEntries(finalQuestions.map(q=>[q.id,0]));finishAttempt(p,'final');assert.equal(courseComplete(p),true);assert.equal(validateProfile(p),p);});


function legacyProfile(){
 const p=newProfile('Legacy PM');
 for(const m of modules){p.lessons[m.id]=new Date().toISOString();p.drafts[m.id]=makeDraft(m.id);p.drafts[m.id].answers=Object.fromEntries(m.quiz.map(q=>[q.id,0]));finishAttempt(p,m.id);}
 p.drafts.final=makeDraft('final');p.drafts.final.answers=Object.fromEntries(finalQuestions.map(q=>[q.id,0]));finishAttempt(p,'final');
 delete p.assessmentPolicyVersion;
 for(const a of p.attempts){const qs=a.unit==='final'?finalQuestions:modules.find(m=>m.id===a.unit).quiz;if(a.unit!=='handoff')a.answers[qs.at(-1).id]=1;Object.assign(a,grade(a.unit,a.answers));a.passed=a.score>=80;delete a.passMark;}
 p.time.handoff={lesson:123,assessment:45};p.drafts.final=makeDraft('final');p.drafts.final.answers[finalQuestions[0].id]=0;p.drafts.final.seconds=17;
 return p;
}
test('Legacy history, finals, unfinished drafts and time survive migration to 100 percent',()=>{
 const p=legacyProfile(),before=structuredClone(p);
 assert.equal(validateProfile(p),p);assert.equal(p.assessmentPolicyVersion,ASSESSMENT_POLICY_VERSION);
 assert.equal(completedCount(p),1);assert.equal(courseComplete(p),false);assert.equal(passed(p,'final'),false);
 assert.equal(p.attempts.length,13);assert.deepEqual(p.time,before.time);assert.deepEqual(p.lessons,before.lessons);assert.deepEqual(p.drafts,before.drafts);
 p.attempts.forEach((a,i)=>{const old=before.attempts[i];assert.deepEqual({...a,passMark:undefined,passed:old.passed},{...old,passMark:undefined});assert.equal(a.passMark,80);assert.equal(a.passed,a.score===100);});
 assert.equal(summaryRows(p)[2][5],'Review needed');assert.equal(attemptRows(p)[2][12],'Review needed');
 assert.equal(validateProfile(p),p);assert.deepEqual(validateProfile(JSON.parse(JSON.stringify(p))),p);
 assert.throws(()=>finishAttempt(p,'final'),/100%/);assert.deepEqual(p.drafts,before.drafts);
 for(const m of modules.slice(1)){p.drafts[m.id]=makeDraft(m.id);p.drafts[m.id].answers=Object.fromEntries(m.quiz.map(q=>[q.id,0]));finishAttempt(p,m.id);}
 p.drafts.final.answers=Object.fromEntries(finalQuestions.map(q=>[q.id,0]));const result=finishAttempt(p,'final');assert.equal(result.passMark,100);assert.equal(courseComplete(p),true);assert.equal(validateProfile(p),p);
});
test('Migration rejects corrupted legacy records without modifying them',()=>{
 const p=legacyProfile();p.attempts.at(-1).score=100;const before=structuredClone(p);assert.throws(()=>validateProfile(p));assert.deepEqual(p,before);
 const badFlag=legacyProfile();badFlag.attempts[0].passed=false;assert.throws(()=>validateProfile(badFlag));
 const incomplete=legacyProfile();delete incomplete.lessons.handoff;assert.throws(()=>validateProfile(incomplete),/all module checks/);
 const unknown=legacyProfile();unknown.assessmentPolicyVersion=99;assert.throws(()=>validateProfile(unknown),/policy version/);
});
test('Migrated records retain strict validation of current flags and final prerequisites',()=>{
 const p=validateProfile(legacyProfile());p.attempts[1].passed=true;assert.throws(()=>validateProfile(p));
 const badFinal=validateProfile(legacyProfile());badFinal.attempts.at(-1).passMark=100;assert.throws(()=>validateProfile(badFinal),/all module checks/);
});
