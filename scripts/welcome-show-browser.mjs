// The Jambaloop welcome: once a captain is in, the TV plays Max and Poppy's
// animated intro through every scene, closes itself, can be replayed, and
// steps aside as soon as the captain starts browsing games.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
try{
  const tv=await (await browser.newContext({viewport:{width:1280,height:720}})).newPage();
  tv.on('pageerror',e=>errors.push(e.message)); tv.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text());});
  await tv.goto(site,{waitUntil:'domcontentloaded'}); await tv.locator('[data-action="party"]').first().click(); await tv.locator('[data-picker-tv]').waitFor({timeout:15000});
  assert.equal(await tv.locator('.welcome-show').count(),0,'waits for players');
  const {code}=JSON.parse(await tv.evaluate(()=>sessionStorage.getItem('quizmas-session')));
  const api=await browser.newContext();
  const ada=await (await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name:'Ada'}})).json();
  await tv.locator('.welcome-show').waitFor({timeout:8000});
  for(const scene of ['hello','devices','join','captain','play','shows','ready']){
    await tv.waitForFunction(s=>document.querySelector('.welcome-stage')?.dataset.scene===s,scene,{timeout:40000});
    assert.ok((await tv.locator('.duo-caption').innerText()).length>3,`${scene} has a caption`);
  }
  await tv.locator('.welcome-show').waitFor({state:'detached',timeout:20000});
  console.log('PASS: the welcome plays every scene with captions and closes itself');
  await tv.reload(); await tv.locator('[data-picker-tv]').waitFor({timeout:15000}); await tv.waitForTimeout(1500);
  assert.equal(await tv.locator('.welcome-show').count(),0,'plays once per room');
  await tv.locator('[data-action="welcome-play"]').click(); await tv.locator('.welcome-show').waitFor();
  const s=await (await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':ada.key}})).json();
  await api.request.post(site+'/api/rooms/'+code+'/browse',{headers:{'x-game-key':ada.key},data:{mode:'wheel',game:s.game}});
  await tv.locator('.welcome-show').waitFor({state:'detached',timeout:5000});
  assert.equal(await tv.locator('.duo-caption').count(),0,'captions clear');
  console.log('PASS: replayable, plays once per room, and steps aside when the captain browses');
  assert.deepEqual(errors,[],'no console errors');
}finally{await browser.close();}
