import {createRequire} from 'node:module';
import {mkdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {modules,finalQuestions} from '../docs/course.mjs';
import {STORE_KEY} from '../docs/core.mjs';
const require=createRequire(import.meta.url);
const {chromium}=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright'):require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.TEST_CHROMIUM_PATH||undefined,args:process.env.TEST_CHROMIUM_ARGS?JSON.parse(process.env.TEST_CHROMIUM_ARGS):['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const base=process.env.TEST_URL||'http://localhost:4173/';
const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORE_KEY);
const current=async()=>{const d=await read();return d.profiles.find(p=>p.name==='QA Learner');};
async function route(hash){await page.goto(base+'#'+hash);await page.locator('#main h1').waitFor();}
async function answerAndSubmit(id,n){const qs=id==='final'?finalQuestions:modules.find(m=>m.id===id).quiz;for(let i=0;i<qs.length;i++)await page.locator(`input[name="${qs[i].id}"][value="${i<n?0:1}"]`).check();await page.getByRole('button',{name:'Submit assessment'}).click();await page.locator('.score-panel').waitFor();}
try{
 await page.clock.install();
 await page.goto(base);await page.locator('.hero').waitFor();
 await mkdir('test-output',{recursive:true});
 await page.screenshot({path:'test-output/desktop-overview.png',fullPage:true});
 await page.getByRole('button',{name:'Begin your course'}).click();
 await page.getByLabel('PM name',{exact:true}).fill('QA Learner');
 await page.getByRole('button',{name:'Start or resume'}).click();
 assert.equal((await current()).name,'QA Learner');
 await route('quiz/final');assert.ok(await page.getByRole('heading',{name:'Finish your module checks first.'}).isVisible());
 await route('lesson/handoff');
 await page.mouse.click(700,250);
 await page.clock.runFor(130000);
 const afterIdle=(await current()).time.handoff.lesson;
 assert.ok(afterIdle>=115&&afterIdle<=122,`Idle timer: ${afterIdle}`);
 await page.clock.runFor(10000);assert.equal((await current()).time.handoff.lesson,afterIdle);
 await page.getByRole('button',{name:'Pause time tracking'}).click();
 const paused=(await current()).time.handoff.lesson;await page.clock.runFor(10000);assert.equal((await current()).time.handoff.lesson,paused);
 await page.getByRole('button',{name:'Resume time tracking'}).click();await page.clock.runFor(5000);assert.ok((await current()).time.handoff.lesson>=paused+4);
 await page.getByRole('button',{name:'I’ve reviewed this lesson'}).click();
 await page.getByRole('button',{name:'Start assessment'}).click();
 await page.getByRole('button',{name:'Submit assessment'}).click();assert.ok(await page.getByText('Answer every question before submitting.').isVisible());
 assert.equal((await current()).attempts.length,0);
 await page.locator('input[name="h1"][value="0"]').check();await page.reload();await page.locator('#quiz-form').waitFor();assert.ok(await page.locator('input[name="h1"][value="0"]').isChecked());
 await answerAndSubmit('handoff',3);assert.ok(await page.getByText('60%',{exact:true}).isVisible());
 await page.getByRole('link',{name:'Retake assessment',exact:true}).click();await page.getByRole('button',{name:'Start retake'}).click();await answerAndSubmit('handoff',4);assert.ok(await page.getByText('80%',{exact:true}).isVisible());
 assert.equal((await current()).attempts[1].retakeNumber,1);
 for(const m of modules.slice(1)){await route('lesson/'+m.id);await page.getByRole('button',{name:'I’ve reviewed this lesson'}).click();await page.getByRole('button',{name:'Start assessment'}).click();await answerAndSubmit(m.id,5);}
 await route('quiz/final');await page.getByRole('button',{name:'Start assessment'}).click();await answerAndSubmit('final',15);assert.ok(await page.getByText('75%',{exact:true}).isVisible());
 await page.getByRole('link',{name:'Retake assessment',exact:true}).click();await page.getByRole('button',{name:'Start retake'}).click();await answerAndSubmit('final',16);assert.ok(await page.getByText('Course complete.',{exact:true}).isVisible());
 assert.equal((await current()).attempts.length,15);
 await route('record');assert.ok(await page.getByRole('heading',{name:'QA Learner',exact:true}).isVisible());
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Download backup',exact:true}).click();const download=await dl;const backupPath='test-output/qa-backup.json';await download.saveAs(backupPath);const backup=JSON.parse(await readFile(backupPath,'utf8'));assert.equal(backup.profile.attempts.length,15);
 const csvEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Attempts CSV'}).click();const csv=await csvEvent;await csv.saveAs('test-output/qa-attempts.csv');assert.ok((await readFile('test-output/qa-attempts.csv','utf8')).includes('QA Learner'));
 await page.getByRole('button',{name:'QA Learner',exact:true}).click();await page.getByLabel('PM name',{exact:true}).fill('Second Learner');await page.getByRole('button',{name:'Start or resume'}).click();assert.equal((await read()).profiles.length,2);await route('record');assert.ok(await page.getByRole('heading',{name:'Second Learner',exact:true}).isVisible());
 await page.getByRole('button',{name:'Second Learner',exact:true}).click();await page.locator('.profile-choice').filter({hasText:'QA Learner'}).click();await route('record');assert.ok(await page.getByRole('heading',{name:'QA Learner',exact:true}).isVisible());
 await page.screenshot({path:'test-output/desktop-record.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await route('home');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-output/mobile-overview.png',fullPage:true});
 await page.getByRole('button',{name:'Menu',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded'),'true');await page.locator('#sidebar a[href="#lesson/testing"]').click();await page.locator('#menu-button[aria-expanded="false"]').waitFor();assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-output/mobile-lesson.png',fullPage:true});
 const restoreContext=await browser.newContext();const restore=await restoreContext.newPage();await restore.goto(base);await restore.locator('#restore-file').setInputFiles(backupPath);await restore.getByRole('button',{name:'Restore this record'}).click();await restore.getByRole('heading',{name:'QA Learner',exact:true}).waitFor();const restored=await restore.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORE_KEY);assert.equal(restored.profiles[0].attempts.length,15);
 await restore.locator('#restore-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schema":1,"profile":{"name":"bad"}}')});await restore.getByRole('status').filter({hasText:'Backup not restored'}).waitFor();const still=await restore.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORE_KEY);assert.equal(still.profiles[0].attempts.length,15);await restoreContext.close();
 assert.deepEqual(errors,[]);console.log('PASS: full 12-module journey, 80% grading, final gate, unlimited retry history, active/idle/manual-pause timing, draft resume, learner isolation, CSV/JSON export, restore/rejection, mobile layout and navigation; no browser errors.');
}finally{await browser.close();}
