// Immersive TV: the game owns the screen once play starts. Checks hidden
// chrome (summoned by mouse or keyboard), large question type, full-height 3D
// stages, the 3D Quiz Race circuit and its SVG fallback without WebGL.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const site=process.env.SITE||'http://127.0.0.1:32000';
const launch=args=>chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage',...args]});
await mkdir('browser-screenshots',{recursive:true});
const errors=[];

async function room(browser,mode,size,extra={}){
  const api=await browser.newContext();
  const created=await api.request.post(site+'/api/rooms',{data:{mode,category:'mixed',format:'choice',count:mode==='board'?12:5,seconds:mode==='classic'?20:0,...extra}});
  assert.equal(created.status(),201,await created.text());
  const {code,host}=await created.json();
  const keys=[];
  for(const name of ['Ada','Bo','Cy']) keys.push((await (await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name}})).json()).key);
  const snap=async key=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}})).json();
  const context=await browser.newContext({viewport:size});
  await context.addInitScript(({code,key})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:true})),{code,key:host});
  const tv=await context.newPage();
  tv.on('pageerror',error=>errors.push(mode+': '+error.message));
  await tv.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  await tv.locator('.roster-panel').waitFor({timeout:15000});
  const advance=async()=>{const s=await snap(host);const r=await api.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':host},data:{phase:s.phase,index:s.index,game:s.game}});assert.equal(r.status(),204);};
  return {tv,advance,snap,host,keys,api,code};
}
const chromeShown=tv=>tv.evaluate(()=>getComputedStyle(document.querySelector('.game-top')).opacity==='1');

const browser=await launch([]);
try{
  for(const size of [{width:1280,height:720},{width:1920,height:1080}]){
    const {tv,advance}=await room(browser,'classic',size);
    assert.equal(await tv.locator('.game.immersive').count(),0,'The lobby keeps its join controls');
    await advance();
    await tv.locator('.game.immersive .question-panel').waitFor({timeout:15000});
    await tv.waitForTimeout(1200);
    assert.equal(await chromeShown(tv),false,'Host controls hide during play');
    assert.equal(await tv.locator('.tv-leaders:visible').count(),0,'No scoreboard column');
    const type=await tv.evaluate(()=>{const h=getComputedStyle(document.querySelector('.question-panel h2'));return {size:parseFloat(h.fontSize),spacing:parseFloat(h.letterSpacing)};});
    assert.ok(type.size>=32,'Question type is large: '+type.size);
    assert.ok(type.spacing>0,'Question letters are spaced: '+type.spacing);
    const fill=await tv.evaluate(()=>{const r=document.querySelector('.question-panel').getBoundingClientRect();return {h:r.height/innerHeight,w:r.width/innerWidth,doc:document.scrollingElement.scrollHeight<=innerHeight+2};});
    assert.ok(fill.h>0.85&&fill.w>0.9&&fill.doc,'Question card fills the TV: '+JSON.stringify(fill));
    await tv.screenshot({path:`browser-screenshots/tv-immersive-classic-${size.width}x${size.height}.png`});
    await tv.mouse.move(200,200);await tv.mouse.move(260,240);
    await tv.waitForFunction(()=>getComputedStyle(document.querySelector('.game-top')).opacity==='1',null,{timeout:3000});
    await tv.waitForFunction(()=>getComputedStyle(document.querySelector('.game-top')).opacity==='0',null,{timeout:6000});
    // Keyboard users reach the controls with Tab.
    await tv.locator('.game-top [data-action="leave"]').focus();
    assert.equal(await chromeShown(tv)||await tv.evaluate(()=>document.querySelector('.game-top').matches(':focus-within')),true);
    await tv.context().close();
    console.log(`PASS: immersive Classic Quiz ${size.width}x${size.height}`);
  }
  {
    const {tv,advance}=await room(browser,'board',{width:1366,height:768},{playStyle:'teams',teamCount:2});
    await advance();
    await tv.locator('#board-stage[data-rendered="true"]').waitFor({timeout:20000});
    const share=await tv.evaluate(()=>document.querySelector('#board-stage').getBoundingClientRect().height/innerHeight);
    assert.ok(share>0.75,'3D board fills the TV height: '+share);
    await tv.screenshot({path:'browser-screenshots/tv-immersive-board-1366x768.png'});
    await tv.context().close();
    console.log('PASS: full-height 3D Board Race table');
  }
  {
    const {tv,advance}=await room(browser,'quizrace',{width:1920,height:1080},{raceLength:'short'});
    await advance();
    await tv.locator('.race-track-wrap[data-race3d="ready"] canvas.race-3d-canvas').waitFor({timeout:20000});
    await tv.waitForTimeout(1500);
    const canvas=await tv.locator('.race-3d-canvas').boundingBox();
    assert.ok(canvas.width>1000&&canvas.height>500,'3D circuit fills the stage: '+JSON.stringify(canvas));
    // The race view re-renders as the karts load, so a node read at a fixed moment can be a detached one
    // (its computed visibility is then empty). Wait for the scene on the page to be hidden instead.
    await tv.waitForFunction(()=>{const scene=document.querySelector('.quiz-race-scene');return scene&&getComputedStyle(scene).visibility==='hidden';},null,{timeout:8000})
      .catch(()=>assert.fail('the flat race scene is hidden once the 3D circuit is showing'));
    await tv.screenshot({path:'browser-screenshots/tv-race-3d-1920x1080.png'});
    await tv.context().close();
    console.log('PASS: 3D Quiz Race circuit on the TV');
  }
}finally{ await browser.close(); }

// Without WebGL the SVG circuit remains, with no errors.
const plain=await launch(['--disable-webgl','--disable-3d-apis']);
try{
  const {tv,advance}=await room(plain,'quizrace',{width:1280,height:720},{raceLength:'short'});
  await advance();
  await tv.locator('.race-broadcast .quiz-race-svg').waitFor({timeout:15000});
  await tv.waitForTimeout(2500);
  assert.equal(await tv.locator('.race-track-wrap[data-race3d]').count(),0);
  assert.equal(await tv.locator('.quiz-race-scene').evaluate(node=>getComputedStyle(node).visibility),'visible');
  await tv.context().close();
  console.log('PASS: SVG race fallback without WebGL');
}finally{ await plain.close(); }

assert.deepEqual(errors,[],'Browser errors: '+errors.join('; '));
console.log('PASS: no browser errors');
