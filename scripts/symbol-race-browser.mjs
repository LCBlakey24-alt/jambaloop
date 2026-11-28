// Symbol Dash on a phone and a TV: tap the matching symbol, the grid reshuffles, the kart speeds up,
// and the phone shows the view from your own kart.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
try{
  const api=await browser.newContext();
  const bad=await api.request.post(site+'/api/rooms',{data:{mode:'quizrace',category:'mixed',count:5,seconds:0,format:'choice',raceStyle:'karts'}});
  assert.equal(bad.status(),400,'an unknown race type is refused');
  const {code,host}=await (await api.request.post(site+'/api/rooms',{data:{mode:'quizrace',category:'mixed',count:5,seconds:0,format:'choice',raceLength:'medium',raceStyle:'symbols',raceDifficulty:'medium'}})).json();
  const players=[];for(const name of ['Ada','Bo','Cy'])players.push(await (await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name}})).json());
  const snap=async key=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}})).json();
  const open=async(key,isHost,options)=>{const ctx=await browser.newContext(options);await ctx.addInitScript(({code,key,isHost})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:isHost})),{code,key,isHost});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(site,{waitUntil:'domcontentloaded'});return p;};
  const tv=await open(host,true,{viewport:{width:1280,height:720}});
  const phone=await open(players[0].key,false,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const s=await snap(host);
  await api.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':host},data:{game:s.game,phase:s.phase,index:s.index,lobbyVersion:s.lobbyVersion}});
  await phone.locator('.race-symbol-grid [data-action="race-answer"]').first().waitFor({timeout:20000});
  assert.equal(await phone.locator('.race-symbol-grid [data-action="race-answer"]').count(),9,'a medium grid has nine squares');
  assert.equal(await phone.locator('[data-action="race-pass"]').count(),0);
  assert.match(await tv.locator('.race-broadcast .eyebrow').innerText(),/SYMBOL DASH/i);
  // The driver's-eye window is drawn (not a blank canvas).
  const painted=await phone.evaluate(()=>{const c=document.querySelector('[data-race-cockpit]');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;const seen=new Set();for(let i=0;i<d.length;i+=4*997)seen.add(d[i]+','+d[i+1]+','+d[i+2]);return seen.size;});
  assert.ok(painted>4,'the cockpit shows a scene: '+painted+' colours');
  // Tap the right square, as the server deals it, eight times: every tap brings a new grid.
  let previous;
  for(let i=0;i<8;i++){
    const own=(await snap(players[0].key)).race.own;
    if(!own.question){await phone.waitForTimeout(120);i--;continue;}
    if(own.question.id===previous){await phone.waitForTimeout(80);i--;continue;}
    previous=own.question.id;
    const index=own.question.symbols.tiles.indexOf(own.question.symbols.target);
    await phone.locator(`.race-symbol-round[data-question-id="${own.question.id}"] [data-race-option="${index}"]`).tap({timeout:6000});
    if(i===2)await phone.screenshot({path:'browser-screenshots/symbol-race-phone.png'});
  }
  const after=await snap(players[0].key);
  assert.ok(after.race.own.correct>=7,'right taps counted: '+after.race.own.correct);
  assert.ok(after.race.racers[0].name==='Ada','tapping correctly puts Ada in front');
  // A wrong square brakes.
  let wrong;
  for(let tries=0;tries<40&&!wrong;tries++){const own=(await snap(players[0].key)).race.own;if(own.question&&own.question.id!==previous)wrong=own.question;else await phone.waitForTimeout(100);}
  const miss=(wrong.symbols.tiles.indexOf(wrong.symbols.target)+1)%wrong.symbols.tiles.length;
  await phone.locator(`.race-symbol-round[data-question-id="${wrong.id}"] [data-race-option="${miss}"]`).tap();
  await phone.waitForFunction(()=>/SLOWED/.test(document.querySelector('[data-race-speed]')?.textContent??''),null,{timeout:6000});
  assert.equal((await snap(players[0].key)).race.own.wrong,1);
  const size=await phone.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));assert.ok(size.doc<=size.view+1,'no sideways scroll');
  await tv.screenshot({path:'browser-screenshots/symbol-race-tv.png'});
  // The grid and powers fit a small phone without the grid being pushed off screen.
  await phone.setViewportSize({width:360,height:640});
  await phone.locator('.race-symbol-grid [data-action="race-answer"]').first().waitFor({timeout:8000});
  const fit=await phone.evaluate(()=>{const g=document.querySelector('.race-symbol-grid').getBoundingClientRect();return {top:g.top,bottom:g.bottom,height:innerHeight};});
  await phone.screenshot({path:'browser-screenshots/symbol-race-phone-small.png'});
  assert.ok(fit.top>=0&&fit.bottom<=fit.height+1,'the whole grid is on screen at 360x640: '+JSON.stringify(fit));
  assert.deepEqual(errors,[],'no page errors');
  console.log('PASS: Symbol Dash: nine-square grid, new grid on every tap, right taps lead, a wrong tap slows, cockpit drawn');
}finally{await browser.close();}
