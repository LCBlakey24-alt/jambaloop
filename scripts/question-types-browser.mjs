// Question-type picker: the TV host and the captain's phone can tick any mix
// of multiple choice, true/false, closest number and put in order; at least
// one stays ticked; the game then asks only the ticked types.
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
const box=(form,id)=>form.locator(`#format-field input[value="${id}"]`);
const ticked=form=>form.locator('#format-field input:checked').evaluateAll(inputs=>inputs.map(input=>input.value));

try{
  // 1. TV host: all four start ticked; untick to a pair; the last one can't be unticked.
  const tv=await browser.newContext({viewport:{width:1366,height:768}});
  const setup=await tv.newPage();
  watch(setup);
  await setup.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  await setup.locator('#game-carousel .carousel-card, .game-tile').first().waitFor({timeout:15000});
  if(await setup.locator('[data-action="carousel-view"]').isVisible())await setup.locator('[data-action="carousel-view"]').click();
  await setup.locator('.game-tile[data-mode="classic"]').click();
  await setup.locator('#game-preview [data-action="host"]').click();
  const form=setup.locator('#host-form');
  assert.deepEqual(await ticked(form),['choice','boolean','estimate','order'],'every type starts ticked');
  assert.equal(await form.locator('input[name="format"]').inputValue(),'mixed');
  await form.locator('#format-field label',{hasText:'Closest number'}).click();
  await form.locator('#format-field label',{hasText:'Put in order'}).click();
  await form.locator('#format-field label',{hasText:'Multiple choice'}).click();
  await form.locator('#format-field label',{hasText:'True or false'}).click();
  assert.deepEqual(await ticked(form),['boolean'],'the last ticked type stays ticked');
  assert.match(await form.locator('#format-note').innerText(),/at least one/i);
  await box(form,'choice').check();
  assert.equal(await form.locator('#format-note').innerText(),'','note clears once a choice is valid');
  assert.equal(await form.locator('input[name="format"]').inputValue(),'choice+boolean');
  await form.locator('#format-field').screenshot({path:'browser-screenshots/question-types-tv.png'});
  // Picking a game with fixed types hides the picker.
  await form.locator('input[name="mode"][value="quizrace"]').check({force:true});
  assert.equal(await form.locator('#format-field').isVisible(),false,'Quiz Race uses its own question rules');
  await form.locator('input[name="mode"][value="classic"]').check({force:true});
  assert.equal(await form.locator('#format-field').isVisible(),true);
  assert.equal(await form.locator('input[name="format"]').inputValue(),'choice+boolean','your ticks survive a detour');
  await form.locator('button[type="submit"]').click();
  await setup.waitForFunction(()=>sessionStorage.getItem('quizmas-session'),null,{timeout:15000});
  const {code,key:hostKey}=JSON.parse(await setup.evaluate(()=>sessionStorage.getItem('quizmas-session')));
  const api=await browser.newContext();
  const snap=async key=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}})).json();
  assert.equal((await snap(hostKey)).format,'choice+boolean');
  console.log('PASS: TV host ticks question types');

  // 2. Captain's phone: the first player is captain and can change the ticks from the lobby.
  const joined=await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name:'Cap'}});
  assert.equal(joined.status(),201);
  const captain=await joined.json();
  await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name:'Pip'}});
  const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await phone.addInitScript(({code,key})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false})),{code,key:captain.key});
  const mobile=await phone.newPage();
  watch(mobile);
  await mobile.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  await mobile.locator('[data-action="configure"]').first().click({timeout:15000});
  const configure=mobile.locator('#configure-form');
  // Phones page through setup; step forward until the picker is on screen.
  for(let page=0;page<12&&!await configure.locator('.format-picks-grid').isVisible();page++)
    await mobile.locator('#dialog [data-deck-next], dialog [data-deck-next]').first().click();
  assert.ok(await configure.locator('.format-picks-grid').isVisible(),'the picker is reachable on the phone');
  assert.deepEqual(await ticked(configure),['choice','boolean'],'the phone shows the room’s current ticks');
  await configure.locator('#format-field label',{hasText:'Multiple choice'}).click();
  await configure.locator('#format-field label',{hasText:'Closest number'}).click();
  await configure.locator('#format-field').scrollIntoViewIfNeeded();
  const size=await mobile.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));
  assert.ok(size.doc<=size.view+1,'no sideways scroll on the phone: '+JSON.stringify(size));
  await configure.locator('#format-field').screenshot({path:'browser-screenshots/question-types-phone.png'});
  await configure.locator('button[type="submit"]').click();
  await mobile.locator('#configure-form').waitFor({state:'detached',timeout:15000}).catch(()=>{});
  await new Promise(resolve=>setTimeout(resolve,500));
  assert.equal((await snap(hostKey)).format,'boolean+estimate');
  console.log('PASS: captain changes question types from the phone');

  // 3. Start: every question in the game is one of the ticked types.
  const advance=async state=>{
    const response=await api.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':hostKey},
      data:{game:state.game,phase:state.phase,index:state.index,lobbyVersion:state.lobbyVersion}});
    assert.ok(response.ok(),await response.text());
  };
  await advance(await snap(hostKey));
  const seen=[];
  for(let step=0;step<60;step++){
    const state=await snap(hostKey);
    if(state.phase==='finished')break;
    if(state.phase==='question'&&state.question)seen.push(state.question.type);
    await advance(state);
  }
  assert.equal(seen.length,10,'played all ten questions: '+seen);
  assert.ok(seen.every(type=>['boolean','estimate'].includes(type)),'only ticked types: '+seen);
  assert.deepEqual([...new Set(seen)].sort(),['boolean','estimate'],'both ticked types appear');
  console.log('PASS: only ticked question types are asked ('+seen.join(', ')+')');
  assert.deepEqual(errors,[],'no console errors');
}finally{
  await browser.close();
}
