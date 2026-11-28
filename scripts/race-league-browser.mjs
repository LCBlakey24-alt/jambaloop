// A Quiz Race league played through on a TV and a phone: three races on three circuits,
// the table between races, and a champion on points. Starts its own server with very
// short races (RACE_LENGTH_SCALE), so it does not need the shared test server.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=process.env.LEAGUE_PORT||'32011';
const site='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,PORT:port,PUBLIC_URL:'',RACE_LENGTH_SCALE:'0.05'},stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch(site)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errors=[];
try{
  const api=await browser.newContext();
  const {code,host}=await (await api.request.post(site+'/api/rooms',{data:{mode:'quizrace',category:'mixed',count:5,seconds:0,format:'choice',raceLength:'long',raceTrack:'desert',raceLeague:true}})).json();
  const players=[];for(const name of ['Ada','Bo','Cy'])players.push(await (await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name}})).json());
  const snap=async key=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}})).json();
  const open=async(key,isHost,options)=>{const ctx=await browser.newContext(options);await ctx.addInitScript(({code,key,isHost})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:isHost})),{code,key,isHost});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(site,{waitUntil:'domcontentloaded'});return p;};
  const tv=await open(host,true,{viewport:{width:1280,height:720}});
  const phone=await open(players[1].key,false,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await tv.locator('.lobby-game').waitFor({timeout:15000});
  assert.match(await tv.locator('.lobby-game').innerText(),/league of 3 races/i,'the lobby says it is a league');
  const s=await snap(host);
  await api.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':host},data:{game:s.game,phase:s.phase,index:s.index,lobbyVersion:s.lobbyVersion}});
  const circuits=['short','medium','long'],themes=['desert','snow','jungle'];
  let pointsSoFar=0;
  for(let race=1;race<=3;race++){
    await tv.waitForFunction(n=>new RegExp('LEAGUE RACE '+n+' OF 3').test(document.querySelector('.race-broadcast .eyebrow')?.textContent??''),race,{timeout:20000});
    const running=await snap(host);
    assert.deepEqual([running.race.course,running.race.track],[circuits[race-1],themes[race-1]],'race '+race+' is on its own circuit and theme');
    await tv.waitForSelector('[data-race3d="ready"]',{timeout:30000});
    if(race===3) await tv.screenshot({path:'browser-screenshots/race-league-long.png'});
    // Every race is a fresh grid: three nudges again.
    await phone.waitForFunction(()=>/3 left/.test(document.querySelector('.race-power.is-ram')?.innerText??''),null,{timeout:20000});
    if(race<3){
      await tv.waitForFunction(n=>new RegExp('RACE '+n+' OF 3 DONE').test(document.querySelector('.race-league-panel .eyebrow')?.textContent??''),race,{timeout:60000});
      const table=(await snap(host)).league;
      assert.equal(table.round,race);
      assert.equal(table.next,circuits[race]);
      const total=table.table.reduce((sum,row)=>sum+row.points,0);
      assert.equal(total-pointsSoFar,10+8+6,'ten, eight and six points handed out');
      pointsSoFar=total;
      assert.deepEqual(table.table.map(row=>row.points),[...table.table.map(row=>row.points)].sort((a,b)=>b-a),'the table is in points order');
      assert.equal(await tv.locator('.race-league > div').count(),3);
      await phone.waitForFunction(()=>/YOUR LEAGUE POSITION/i.test(document.body.innerText),null,{timeout:8000});
      assert.equal(await phone.locator('[data-action="advance"]').count(),(await snap(players[1].key)).isCaptain?1:0,'only the captain or the TV starts the next race');
      if(race===1){await tv.waitForTimeout(1600);await tv.screenshot({path:'browser-screenshots/race-league-table.png'});await phone.screenshot({path:'browser-screenshots/race-league-phone.png'});}
      await tv.locator('.race-league-panel [data-action="advance"]').click();
    }
  }
  await tv.waitForFunction(()=>/wins the league!/.test(document.querySelector('.race-league-panel h1')?.textContent??''),null,{timeout:60000});
  const final=await snap(host);
  assert.equal(final.phase,'finished');
  assert.equal(final.league.table.reduce((sum,row)=>sum+row.points,0),72,'three races scored');
  const champion=final.league.table[0];
  assert.match(await tv.locator('.race-league-panel h1').innerText(),new RegExp(champion.name+' wins the league','i'));
  assert.equal(await tv.locator('.race-league-panel [data-action="advance"]').count(),0,'no fourth race');
  await tv.waitForTimeout(1600);await tv.screenshot({path:'browser-screenshots/race-league-final.png'});
  await phone.waitForFunction(()=>/League complete!|You won the league!/i.test(document.body.innerText),null,{timeout:8000});
  const size=await phone.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));assert.ok(size.doc<=size.view+1,'no sideways scroll');
  console.log('PASS: three league races on three circuits, the table between them, and a champion on points ('+champion.name+', '+champion.points+')');
  assert.deepEqual(errors,[],'no page errors');
}finally{await browser.close();server.kill();}
