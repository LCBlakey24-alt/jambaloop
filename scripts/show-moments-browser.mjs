// Show moments end to end: lock-in stamps land on the TV as phones lock in;
// the reveal holds the answer through a drum-roll on the TV and the phones,
// drops the wrong answers, then flares the right one; leaderboard rows slide
// with their gains; the last five seconds get a heartbeat; reduced motion
// shows the final state at once.
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
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

try{
  const api=await browser.newContext();
  const created=await api.request.post(site+'/api/rooms',{data:{mode:'classic',category:'mixed',format:'choice',count:5,seconds:20}});
  assert.equal(created.status(),201,await created.text());
  const {code,host}=await created.json();
  const players=[];
  for(const name of ['Ada','Bo','Cy']){
    const joined=await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name}});
    players.push({name,...await joined.json()});
  }
  const snap=async key=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}})).json();
  const advance=async()=>{
    const s=await snap(host);
    const response=await api.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':host},data:{game:s.game,phase:s.phase,index:s.index,lobbyVersion:s.lobbyVersion}});
    assert.ok(response.ok(),await response.text());
  };
  const answer=async(player,option)=>{
    const s=await snap(player.key);
    await api.request.post(site+'/api/rooms/'+code+'/answer',{headers:{'x-game-key':player.key},data:{game:s.game,index:s.index,option}});
  };
  const open=async(key,isHost,options)=>{
    const context=await browser.newContext(options);
    await context.addInitScript(({code,key,isHost})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:isHost})),{code,key,isHost});
    const page=await context.newPage();
    watch(page);
    await page.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
    return page;
  };
  const tv=await open(host,true,{viewport:{width:1280,height:720}});
  const phone=await open(players[0].key,false,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const calm=await open(host,true,{viewport:{width:1280,height:720},reducedMotion:'reduce'});

  // 1. Lock-in stamps.
  await advance();
  await tv.locator('.game[data-phase="question"] .answers').waitFor({timeout:15000});
  await phone.locator('.answers .answer').first().waitFor({timeout:15000});
  await answer(players[1],0);
  await tv.locator('.lock-stamp').first().waitFor({timeout:5000});
  assert.equal(await tv.locator('.lock-stamp.is-fresh').count(),1,'the first stamp lands with a bounce');
  await phone.locator('.answers .answer').nth(1).click();
  await answer(players[2],2);
  await tv.waitForFunction(()=>document.querySelectorAll('.lock-stamp').length===3,null,{timeout:5000});
  assert.equal(await tv.locator('.lock-rail [data-option], .lock-rail .answer').count(),0,'stamps carry faces, not choices');
  await pause(700);
  await tv.screenshot({path:'browser-screenshots/moments-1-lockins.png'});
  console.log('PASS: three lock-in stamps landed on the TV');

  // 2. Staged reveal: nothing marked during the drum-roll on TV or phone.
  await advance();
  await tv.locator('.game[data-phase="reveal"]').waitFor({timeout:5000});
  await phone.locator('.game[data-phase="reveal"]').waitFor({timeout:5000});
  assert.equal(await tv.locator('.answers[data-stage="drumroll"]').count(),1,'TV drum-roll');
  assert.equal(await tv.locator('.answers .answer.correct').count(),0,'TV holds the right answer back');
  assert.equal(await tv.locator('.lock-rail[data-verdicts="hold"]').count(),1,'stamps hold their verdicts');
  assert.equal(await phone.locator('.game[data-verdict-hold]').count(),1,'phone holds its verdict');
  assert.equal(await phone.locator('.answers .answer.correct').count(),0,'phone holds the right answer back');
  await tv.screenshot({path:'browser-screenshots/moments-2-drumroll.png'});
  await pause(1300);
  assert.ok(await tv.locator('.answers .answer.is-out').count()>=1,'wrong answers drop out one by one');
  await tv.screenshot({path:'browser-screenshots/moments-3-dropping.png'});
  await tv.locator('.answers .answer.correct.is-flare').waitFor({timeout:3000});
  await phone.waitForFunction(()=>!document.querySelector('.game[data-verdict-hold]'),null,{timeout:3000});
  assert.equal(await phone.locator('.answers .answer.correct').count(),1,'phone shows the right answer after the beat');
  await pause(400);
  await tv.screenshot({path:'browser-screenshots/moments-4-flare.png'});
  await tv.locator('.lock-rail[data-verdicts="on"]').waitFor({timeout:3000});
  assert.equal(await tv.locator('.lock-stamp[data-verdict]').count(),3,'every stamp gets a verdict');
  await pause(1500);
  await tv.screenshot({path:'browser-screenshots/moments-5-standings.png'});
  await phone.screenshot({path:'browser-screenshots/moments-phone-verdict.png'});
  // Reduced motion: final state at once.
  await calm.locator('.game[data-phase="reveal"] .answers .answer.correct').waitFor({timeout:5000});
  assert.equal(await calm.locator('.answers[data-stage]').count(),0,'reduced motion skips the drum-roll');
  console.log('PASS: staged reveal on TV and phone; reduced motion shows it at once');

  // 3. Round two: climbers and gains, then the final-seconds heartbeat.
  await advance();
  await tv.locator('.game[data-phase="question"]').waitFor({timeout:5000});
  const s=await snap(host);
  await tv.waitForFunction(()=>document.querySelector('.game[data-final-seconds]'),null,{timeout:(s.ends-Date.now())+2000});
  assert.equal(await tv.locator('.tension-vignette').count(),1,'red edge glow in the last five seconds');
  await tv.screenshot({path:'browser-screenshots/moments-6-final-seconds.png'});
  await phone.screenshot({path:'browser-screenshots/moments-phone-final-seconds.png'});
  console.log('PASS: last five seconds heartbeat and vignette');

  // 4. Scoreboard break: gains pop beside new totals; a hat-trick earns a flame.
  const quiz={title:'Moments check',questions:Array.from({length:4},(_,index)=>({type:'boolean',prompt:'Moments question '+(index+1),correct:0}))};
  const board=await api.request.post(site+'/api/rooms',{data:{mode:'classic',category:'mixed',format:'choice',count:4,seconds:0,scoreInterval:3,customQuiz:quiz}});
  assert.equal(board.status(),201,await board.text());
  const room2=await board.json();
  const racers=[];
  for(const name of ['Dee','Eli']) racers.push(await (await api.request.post(site+'/api/rooms/'+room2.code+'/join',{data:{name}})).json());
  const look=async key=>(await api.request.get(site+'/api/rooms/'+room2.code,{headers:{'x-game-key':key}})).json();
  const step=async()=>{const r=await look(room2.host);await api.request.post(site+'/api/rooms/'+room2.code+'/advance',{headers:{'x-game-key':room2.host},data:{game:r.game,phase:r.phase,index:r.index,lobbyVersion:r.lobbyVersion}});};
  const tv2=await (async()=>{const context=await browser.newContext({viewport:{width:1280,height:720}});
    await context.addInitScript(({code,key})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:true})),{code:room2.code,key:room2.host});
    const page=await context.newPage();watch(page);await page.goto(site,{waitUntil:'domcontentloaded'});return page;})();
  await step();
  for(let round=0;round<3;round++){
    const r=await look(racers[0].key);
    await api.request.post(site+'/api/rooms/'+room2.code+'/answer',{headers:{'x-game-key':racers[0].key},data:{game:r.game,index:r.index,option:0}});
    await api.request.post(site+'/api/rooms/'+room2.code+'/answer',{headers:{'x-game-key':racers[1].key},data:{game:r.game,index:r.index,option:round===1?0:1}});
    await step();
    await step();
  }
  assert.equal((await look(room2.host)).phase,'score-break');
  await tv2.locator('.score-break-gain').first().waitFor({timeout:15000});
  await tv2.locator('.streak-flame').first().waitFor({timeout:15000});
  assert.match(await tv2.locator('.streak-flame').first().innerText(),/3/,'Dee is on a three-answer streak');
  await pause(3500);
  await tv2.screenshot({path:'browser-screenshots/moments-7-scoreboard.png'});
  console.log('PASS: scoreboard gains and streak flame');
  assert.deepEqual(errors,[],'no console errors');
}finally{
  await browser.close();
}
