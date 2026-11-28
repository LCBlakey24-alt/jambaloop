// The action replay after a race: the TV plays the whole race back on the same 3D track, sped up with the
// finish in slow motion; phones point at the TV; the captain can skip it and the TV can watch it again.
// Starts its own server with very short races (RACE_LENGTH_SCALE), so it does not need the shared test server.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=process.env.REPLAY_PORT||'32012';
const site='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,PORT:port,PUBLIC_URL:'',RACE_LENGTH_SCALE:'0.08'},stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(site)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errors=[];
try{
  const api=await browser.newContext();
  const {code,host}=await (await api.request.post(site+'/api/rooms',{data:{mode:'quizrace',category:'mixed',count:5,seconds:0,format:'choice',raceLength:'medium',raceStyle:'symbols',raceDifficulty:'easy'}})).json();
  const players=[];for(const name of ['Ada','Bo','Cy'])players.push(await (await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name}})).json());
  const snap=async key=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}})).json();
  const open=async(key,isHost,options)=>{const ctx=await browser.newContext(options);await ctx.addInitScript(({code,key,isHost})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:isHost})),{code,key,isHost});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(site,{waitUntil:'domcontentloaded'});return p;};
  const tv=await open(host,true,{viewport:{width:1280,height:720}});
  const captainKey=(await Promise.all(players.map(async p=>((await snap(p.key)).isCaptain?p.key:undefined)))).find(Boolean);
  const phone=await open(captainKey,false,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const s=await snap(host);
  await api.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':host},data:{game:s.game,phase:s.phase,index:s.index,lobbyVersion:s.lobbyVersion}});
  // Ada taps every right tile, Bo every other one, Cy sits still: a race with a winner and a straggler.
  let state;
  for(let i=0;i<600;i++){
    state=await snap(host);
    if(['finished'].includes(state.phase))break;
    for(const [index,player] of players.entries()){
      if(index===2)continue;
      const q=(await snap(player.key)).race?.own?.question;
      if(state.phase!=='race'||!q?.symbols)continue;
      const right=q.symbols.tiles.indexOf(q.symbols.target);
      const option=index===0||i%2?right:(right+1)%q.symbols.tiles.length;
      await api.request.post(site+'/api/rooms/'+code+'/race-answer',{headers:{'x-game-key':player.key},data:{game:1,questionId:q.id,option}});
    }
    await new Promise(r=>setTimeout(r,40));
  }
  assert.equal(state.phase,'finished');
  // The replay starts on its own.
  await tv.locator('.race-replay-panel').waitFor({timeout:10000});
  assert.match(await tv.locator('.race-replay-panel h1').innerText(),/Action replay/i);
  await tv.waitForSelector('.race-replay-panel .race-track-wrap[data-race3d="ready"]',{timeout:30000});
  assert.equal(await tv.locator('.results-winner-banner, .game-night').count(),0,'no results or Game Night panel during the replay');
  await phone.locator('.race-replay-phone').waitFor({timeout:10000});
  assert.match(await phone.locator('.race-replay-phone').innerText(),/Watch the TV/i);
  // It plays: the progress strip moves, and the finish is in slow motion.
  const width=()=>tv.evaluate(()=>parseFloat(document.querySelector('[data-replay-progress]')?.style.width??'0'));
  const first=await width();
  await tv.waitForTimeout(1500);
  assert.ok(await width()>first,'the replay moves on');
  await tv.waitForFunction(()=>document.querySelector('[data-replay-slow]')?.hidden===false,null,{timeout:20000});
  await tv.screenshot({path:'browser-screenshots/race-replay-tv.png'});
  await phone.screenshot({path:'browser-screenshots/race-replay-phone.png'});
  // The captain skips it from the phone: the results come up on the TV.
  await phone.locator('[data-action="replay-skip"]').click();
  await tv.locator('.race-finish-panel').waitFor({timeout:10000});
  assert.match(await tv.locator('.race-finish-panel h1').innerText(),/Ada wins/i);
  await phone.locator('.race-phone-finish:not(.race-replay-phone)').waitFor({timeout:10000});
  // Watch it again from the TV, and this time let it run to the end.
  await tv.locator('[data-action="replay-again"]').click();
  await tv.locator('.race-replay-panel').waitFor({timeout:10000});
  const replay=await snap(host);
  const remaining=replay.raceReplay.until-replay.now;
  assert.ok(remaining>3000&&remaining<60000,'the replay runs for a while but well under a minute: '+remaining);
  await phone.locator('.race-replay-phone').waitFor({timeout:10000});
  await tv.locator('.race-finish-panel').waitFor({timeout:remaining+8000});
  // Phones move on by themselves when the replay ends, not only the TV.
  await phone.locator('.race-phone-finish:not(.race-replay-phone)').waitFor({timeout:8000});
  await tv.waitForTimeout(800);
  await tv.screenshot({path:'browser-screenshots/race-replay-after-tv.png'});
  assert.equal(await tv.locator('.race-replay-panel').count(),0);
  assert.deepEqual(errors,[],'no page errors');
  console.log('PASS: action replay plays on the TV after the race (sped up, slow-motion finish), phones point at the TV, captain skips, TV watches it again');
}finally{await browser.close();server.kill();}
