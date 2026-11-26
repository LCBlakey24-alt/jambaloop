// Guest commentators: Baz and Clive call Knockout; Vince calls Quiz Race.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const errors=[];
try{
  const api=await browser.newContext();
  const room=async data=>{const {code,host}=await (await api.request.post(site+'/api/rooms',{data})).json();
    const players=[];for(const name of ['Ada','Bo','Cy'])players.push(await (await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name}})).json());
    const snap=async()=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':host}})).json();
    const advance=async()=>{const s=await snap();await api.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':host},data:{game:s.game,phase:s.phase,index:s.index,lobbyVersion:s.lobbyVersion}});};
    const ctx=await browser.newContext({viewport:{width:1280,height:720}});
    await ctx.addInitScript(({code,host})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key:host,host:true})),{code,host});
    const tv=await ctx.newPage();tv.on('pageerror',e=>errors.push(e.message));
    await tv.goto(site,{waitUntil:'domcontentloaded'});await tv.locator('[data-action="sound"]').waitFor({timeout:15000});await tv.locator('[data-action="sound"]').click();
    return {code,host,players,snap,advance,tv};};
  const speaker=tv=>tv.locator('.duo-caption').getAttribute('data-host');

  // Knockout: everyone misses, and the ringside team calls it.
  const quiz={title:'Ringside',questions:Array.from({length:4},(_,i)=>({type:'boolean',prompt:'Ringside question '+(i+1),correct:0}))};
  const ko=await room({mode:'knockout',category:'mixed',count:4,seconds:0,customQuiz:quiz});
  await ko.advance();await ko.tv.locator('.game[data-phase="question"]').waitFor();
  for(const p of ko.players){const s=await ko.snap();await api.request.post(site+'/api/rooms/'+ko.code+'/answer',{headers:{'x-game-key':p.key},data:{game:s.game,index:s.index,option:1}});}
  await ko.advance();
  await ko.tv.locator('.duo-caption').waitFor({timeout:12000});
  assert.equal(await speaker(ko.tv),'baz','Baz leads the call');
  await ko.tv.waitForFunction(()=>document.querySelector('.duo-caption')?.dataset.host==='clive',null,{timeout:10000});
  console.log('PASS: Baz and Clive call a Knockout round');

  // Quiz Race: Vince calls the start.
  const race=await room({mode:'quizrace',category:'mixed',count:5,seconds:0,format:'choice',raceLength:'short'});
  await race.advance();
  await race.tv.waitForFunction(()=>document.querySelector('.duo-caption')?.dataset.host==='vince',null,{timeout:15000});
  assert.match(await race.tv.locator('.duo-caption').innerText(),/away we go|they're off/i);
  console.log('PASS: Vince calls the race start');
  assert.deepEqual(errors,[],'no page errors');
}finally{await browser.close();}
