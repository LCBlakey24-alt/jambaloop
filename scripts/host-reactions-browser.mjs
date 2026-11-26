// Host reactions: with Sound on, Max or Poppy reacts on the TV when nobody
// gets a question right, and announces the final question. Sound off: silent.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const errors=[];
try{
  const api=await browser.newContext();
  const quiz={title:'Reactions',questions:Array.from({length:3},(_,i)=>({type:'boolean',prompt:'Reaction question '+(i+1),correct:0}))};
  const run=async soundOn=>{
    const {code,host}=await (await api.request.post(site+'/api/rooms',{data:{mode:'classic',category:'mixed',count:3,seconds:0,customQuiz:quiz}})).json();
    const players=[];for(const name of ['Ada','Bo','Cy'])players.push(await (await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name}})).json());
    const snap=async()=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':host}})).json();
    const advance=async()=>{const s=await snap();await api.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':host},data:{game:s.game,phase:s.phase,index:s.index,lobbyVersion:s.lobbyVersion}});};
    const ctx=await browser.newContext({viewport:{width:1280,height:720}});
    await ctx.addInitScript(({code,host})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key:host,host:true})),{code,host});
    const tv=await ctx.newPage();tv.on('pageerror',e=>errors.push(e.message));
    await tv.goto(site,{waitUntil:'domcontentloaded'});await tv.locator('[data-action="sound"]').waitFor({timeout:15000});
    if(soundOn)await tv.locator('[data-action="sound"]').click();
    await advance();await tv.locator('.game[data-phase="question"]').waitFor();
    for(const p of players){const s=await snap();await api.request.post(site+'/api/rooms/'+code+'/answer',{headers:{'x-game-key':p.key},data:{game:s.game,index:s.index,option:1}});}
    await advance();await tv.locator('.answers .answer.correct.is-flare').waitFor({timeout:8000});
    return {tv,advance};
  };
  const loud=await run(true);
  await loud.tv.locator('.duo-caption').waitFor({timeout:6000});
  assert.match(await loud.tv.locator('.duo-caption').innerText(),/Nobody got that one|Not a single one|clean sweep/i);
  console.log('PASS: a host reacts when nobody is right');
  await loud.tv.locator('.duo-caption').waitFor({state:'detached',timeout:15000});
  await loud.advance();await loud.advance();await loud.advance();
  await loud.tv.waitForFunction(()=>/Reaction question 3/.test(document.body.innerText),null,{timeout:8000});
  await loud.tv.locator('.duo-caption').waitFor({timeout:6000});
  assert.match(await loud.tv.locator('.duo-caption').innerText(),/Last question|Final question/i);
  console.log('PASS: the final question is announced');
  const quiet=await run(false);
  await quiet.tv.waitForTimeout(3500);
  assert.equal(await quiet.tv.locator('.duo-caption').count(),0,'Sound off: no reactions');
  console.log('PASS: silent when Sound is off');
  assert.deepEqual(errors,[],'no page errors');
}finally{await browser.close();}
