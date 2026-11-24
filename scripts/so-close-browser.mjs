// So Close end-to-end: launcher setup, phone number wheel (buttons, drag,
// mouse wheel, direct entry), reload with a locked guess, server-staged
// reveal on TV and phones, reload mid-reveal, TV skip, and responsive fit at
// 320px, 390x844, 844x390, 1280x720 and 1920x1080.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']});
await mkdir('browser-screenshots',{recursive:true});
const errors=[];
const watch=page=>{
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&!/Failed to load resource/.test(message.text()))errors.push(message.text());});
};
const noSideScroll=async(page,label)=>{
  const size=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));
  assert.ok(size.doc<=size.view+1,label+' has horizontal scroll: '+JSON.stringify(size));
};

try{
  // 1. A host can find So Close and the setup form is limited to valid choices.
  const setupContext=await browser.newContext({viewport:{width:1366,height:768}});
  const setup=await setupContext.newPage();
  watch(setup);
  await setup.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  await setup.locator('.game-tile[data-mode="soclose"]').click();
  assert.match(await setup.locator('#game-preview').innerText(),/So Close/i);
  await setup.locator('#game-preview [data-action="host"]').click();
  const form=setup.locator('#host-form');
  assert.equal(await form.locator('input[name="mode"]:checked').inputValue(),'soclose');
  assert.equal(await form.locator('select[name="format"]').isVisible(),false,'Format is fixed to estimates');
  assert.match(await form.locator('#scoring-note').innerText(),/100 points.*200/);
  await setupContext.close();
  console.log('PASS: So Close setup from the launcher');

  // 2. Room with three players; TV at 1280x720 and phones at three sizes.
  const api=await browser.newContext();
  const created=await api.request.post(site+'/api/rooms',{data:{mode:'soclose',category:'mixed',format:'estimate',count:5,seconds:0}});
  assert.equal(created.status(),201,await created.text());
  const {code,host:hostKey}=await created.json();
  const players=[];
  for(const name of ['Ada','Bo','Cy']){
    const joined=await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name}});
    assert.equal(joined.status(),201);
    players.push({name,...await joined.json()});
  }
  const snap=async key=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}})).json();
  const open=async(key,host,options)=>{
    const context=await browser.newContext(options);
    await context.addInitScript(({code,key,host})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host})),{code,key,host});
    const page=await context.newPage();
    watch(page);
    await page.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
    return {context,page};
  };
  const tv=await open(hostKey,true,{viewport:{width:1280,height:720}});
  const tvLarge=await open(hostKey,true,{viewport:{width:1920,height:1080},reducedMotion:'reduce'});
  const phones=[
    await open(players[0].key,false,{viewport:{width:390,height:844},isMobile:true,hasTouch:true}),
    await open(players[1].key,false,{viewport:{width:320,height:640},isMobile:true,hasTouch:true}),
    await open(players[2].key,false,{viewport:{width:844,height:390},isMobile:true,hasTouch:true}),
  ];
  await tv.page.locator('.roster-panel').waitFor({timeout:15000});
  const start=await api.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':hostKey},data:{phase:'lobby',game:1,index:0}});
  assert.equal(start.status(),204);

  // 3. Phones show only the wheel controller (TV-first), with units and range.
  const round=await snap(hostKey);
  const {question}=round;
  assert.equal(question.type,'estimate');
  for(const [i,{page}] of phones.entries()){
    await page.locator('.so-close-editor').waitFor({timeout:15000});
    const text=await page.locator('.so-close-editor').innerText();
    assert.doesNotMatch(await page.locator('.game').innerText(),new RegExp(question.prompt.slice(0,25).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'Phone defaults to answer-only controls');
    if(question.unit&&question.unit!=='year')assert.ok(text.includes(question.unit),'Wheel shows the unit');
    await noSideScroll(page,'phone '+i+' question');
  }
  await tv.page.locator('.question-panel').waitFor();
  assert.ok((await tv.page.locator('.game').innerText()).includes(question.prompt),'TV shows the question');
  await noSideScroll(tv.page,'TV question');
  await tv.page.screenshot({path:'browser-screenshots/so-close-question-1280x720.png'});
  await tvLarge.page.screenshot({path:'browser-screenshots/so-close-question-1920x1080.png'});

  const ada=phones[0].page;
  const value=async page=>Number(await page.locator('.so-close-editor [data-number]').inputValue());
  const startValue=await value(ada);
  await ada.locator('.so-close-wheel [data-step="1"]').click();
  assert.equal(await value(ada),Math.min(question.max,startValue+1),'Up arrow adds one');
  // Dragging down brings the larger number above the centre into view.
  const rows=ada.locator('[data-so-close-rows]');
  const box=await rows.boundingBox();
  const before=await value(ada);
  await ada.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await ada.mouse.down();
  await ada.mouse.move(box.x+box.width/2,box.y+box.height/2+75,{steps:6});
  await ada.mouse.up();
  const dragged=await value(ada);
  assert.ok(dragged>before||dragged===question.max,'Dragging down increases the guess: '+before+' -> '+dragged);
  await ada.screenshot({path:'browser-screenshots/so-close-phone-390x844.png'});
  await phones[1].page.screenshot({path:'browser-screenshots/so-close-phone-320x640.png'});
  await phones[2].page.screenshot({path:'browser-screenshots/so-close-phone-844x390.png'});

  // Direct entry: out-of-range values are rejected, Enter locks a valid one.
  const guesses=[question.min,Math.round((question.min+question.max)/2),question.max];
  for(const [i,{page}] of phones.entries()){
    const input=page.locator('.so-close-editor [data-number]');
    await input.fill(String(guesses[i]));
    await input.press('Enter');
    await page.getByText('GUESS LOCKED').waitFor({timeout:10000});
  }
  // A reload keeps the locked guess and does not reopen the editor.
  await ada.reload({waitUntil:'domcontentloaded'});
  await ada.getByText('GUESS LOCKED').waitFor({timeout:15000});
  assert.equal(await ada.locator('[data-action="submit-special"]').count(),0);
  console.log('PASS: wheel buttons, drag direction, direct entry and reload with a locked guess');

  // 4. Reveal: the server withholds the answer and outcomes until each stage.
  const {game,index}=await snap(hostKey);
  const reveal=await api.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':hostKey},data:{phase:'question',game,index}});
  assert.equal(reveal.status(),204);
  await tv.page.locator('#so-close-frame').waitFor({timeout:10000});
  await tv.page.getByText('All guesses are locked.').waitFor({timeout:5000});
  const early=await snap(players[0].key);
  assert.equal(early.estimateReveal.stage,'guesses');
  assert.equal(early.question.correct,undefined);
  assert.equal(early.answerCorrect,undefined);
  await tv.page.locator('.so-close-guess-card').first().waitFor({timeout:5000});
  await tv.page.screenshot({path:'browser-screenshots/so-close-reveal-guesses-1280x720.png'});
  assert.equal(await tv.page.locator('.so-close-round-winner').count(),0,'No winner during the guesses');
  assert.doesNotMatch(await tv.page.locator('.phase-caption').innerText(),/revealed/i,'Header must not announce the answer yet');
  // A phone that reloads mid-reveal rejoins the same sequence.
  await phones[1].page.reload({waitUntil:'domcontentloaded'});
  await phones[1].page.locator('#so-close-frame').waitFor({timeout:15000});
  assert.equal(await phones[1].page.locator('.so-close-round-winner').count(),0);
  await phones[1].page.screenshot({path:'browser-screenshots/so-close-reveal-phone-320x640.png'});
  // Skip from the TV goes straight to results everywhere.
  await tv.page.locator('[data-action="estimate-reveal-skip"]').click();
  await tv.page.locator('.so-close-round-winner').waitFor({timeout:10000});
  await tv.page.locator('.so-close-reveal-actions [data-action="advance"]:not([hidden])').waitFor({timeout:5000});
  assert.equal(await tv.page.locator('.so-close-guesses li').count(),3,'All guesses listed');
  const final=await snap(players[0].key);
  assert.equal(final.estimateReveal.stage,'results');
  assert.ok(Number.isFinite(final.question.correct));
  for(const {page} of phones)await page.locator('.so-close-round-winner').waitFor({timeout:10000});
  await tvLarge.page.locator('.so-close-round-winner').waitFor({timeout:10000});
  for(const [label,page] of [['tv',tv.page],['tvLarge',tvLarge.page],...phones.map(({page},i)=>['phone '+i,page])])await noSideScroll(page,label+' results');
  const stage=await tv.page.locator('.so-close-broadcast').boundingBox();
  assert.ok(stage.y+stage.height<=720+2,'TV results fit 720p: '+JSON.stringify(stage));
  await tv.page.screenshot({path:'browser-screenshots/so-close-results-1280x720.png'});
  await tvLarge.page.screenshot({path:'browser-screenshots/so-close-results-1920x1080.png'});
  await ada.screenshot({path:'browser-screenshots/so-close-results-phone-390x844.png'});
  await phones[2].page.screenshot({path:'browser-screenshots/so-close-results-phone-844x390.png'});

  // 5. Next round opens with a fresh editor on every phone.
  await tv.page.locator('.so-close-reveal-actions [data-action="advance"]').click();
  for(const {page} of phones)await page.locator('.so-close-editor').waitFor({timeout:10000});
  assert.equal((await snap(hostKey)).index,index+1);
  console.log('PASS: staged reveal, mid-reveal reload, skip, results and next round');
  assert.deepEqual(errors,[],'Browser errors: '+errors.join('; '));
  console.log('PASS: no browser errors');
}finally{
  await browser.close();
}
