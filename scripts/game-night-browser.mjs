import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

const site=process.env.SITE||'http://127.0.0.1:32000';
const jpeg='/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAACAAIDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAB//EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAVAQEBAAAAAAAAAAAAAAAAAAAGCP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AFAwQU//2Q==';
const browser=await chromium.launch({
  headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage'],
});
await mkdir('browser-screenshots',{recursive:true});
try{
  const context=await browser.newContext({viewport:{width:1280,height:720}});
  const errors=[];
  const created=await context.request.post(site+'/api/rooms',{data:{
    mode:'classic',category:'mixed',format:'choice',count:1,seconds:0,playStyle:'individual',
    customQuiz:{title:'Game night browser check',questions:[{type:'boolean',prompt:'This is the final round.',correct:0}]},
  }});
  assert.equal(created.status(),201,await created.text());
  const {code,host}=await created.json();
  const players=[];
  for(const [index,name] of ['Alex','Bailey','Charlie'].entries()){
    const joined=await context.request.post(site+'/api/rooms/'+code+'/join',{data:{
      name,seenQuestions:[],...(index===0?{avatar:'data:image/jpeg;base64,'+jpeg}:{}),
    }});
    assert.equal(joined.status(),201,await joined.text());
    players.push((await joined.json()).key);
  }
  const state=async key=>{
    const response=await context.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key||host}});
    assert.equal(response.status(),200);
    return response.json();
  };
  await context.addInitScript(session=>sessionStorage.setItem('quizmas-session',JSON.stringify(session)),{code,key:host,host:true});
  const tv=await context.newPage();
  tv.on('pageerror',error=>errors.push(error.message));
  await tv.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  await tv.locator('.roster-panel').waitFor({timeout:15000});
  const lobbyPhoto=tv.locator('img.player-avatar').first();
  await lobbyPhoto.waitFor({timeout:10000});
  assert.ok(await lobbyPhoto.evaluate(node=>node.src.startsWith('blob:')&&node.complete&&node.naturalWidth>0));
  let snapshot=await state();
  let response=await context.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':host},data:{game:1,index:0,phase:'lobby'}});
  assert.equal(response.status(),204,await response.text());
  snapshot=await state();
  for(const [index,key] of players.entries()){
    response=await context.request.post(site+'/api/rooms/'+code+'/answer',{headers:{'x-game-key':key},data:{game:1,index:0,option:index?1:0}});
    assert.equal(response.status(),204,await response.text());
  }
  response=await context.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':host},data:{game:1,index:0,phase:'question'}});
  assert.equal(response.status(),204,await response.text());
  response=await context.request.post(site+'/api/rooms/'+code+'/advance',{headers:{'x-game-key':host},data:{game:1,index:0,phase:'reveal'}});
  assert.equal(response.status(),204,await response.text());
  await tv.locator('.night-standings').waitFor({timeout:15000});
  const standings=await tv.locator('.night-standings').innerText();
  assert.match(standings,/Alex[\s\S]*3 ★/);
  assert.match(standings,/Bailey[\s\S]*2 ★/);
  const anonymous=await context.request.get(new URL((await state()).players.find(player=>player.name==='Alex').avatar,site).href);
  assert.equal(anonymous.status(),403);
  const bounds=await tv.evaluate(()=>({height:document.scrollingElement.scrollHeight,width:document.scrollingElement.scrollWidth}));
  assert.ok(bounds.width<=1282,'TV results overflow horizontally: '+JSON.stringify(bounds));
  await tv.screenshot({path:'browser-screenshots/game-night-standings-1280x720.png'});

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await mobile.addInitScript(session=>sessionStorage.setItem('quizmas-session',JSON.stringify(session)),{code,key:players[0],host:false});
  const phone=await mobile.newPage();
  phone.on('pageerror',error=>errors.push(error.message));
  await phone.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
  await phone.locator('.results').waitFor({timeout:15000});
  assert.ok((await phone.evaluate(()=>document.scrollingElement.scrollWidth))<=392);
  await phone.screenshot({path:'browser-screenshots/game-night-phone-390x844.png'});
  assert.deepEqual(errors,[]);
  await mobile.close();
  await context.close();
  console.log('PASS: protected avatars and normalized game-night standings at 1280x720 and 390x844');
}finally{await browser.close();}
