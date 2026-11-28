import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {comparisons} from '../more-less-bank.js';

const site=process.env.SITE||'http://127.0.0.1:32776';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const errors=[];
const api=async(path,key,data)=>{
  const r=await fetch(site+'/api/rooms'+path,{method:data?'POST':'GET',headers:{'content-type':'application/json',...(key&&{'x-game-key':key})},body:data&&JSON.stringify(data)});
  assert.ok(r.ok,await r.clone().text());
  return r.status===204?null:r.json();
};
await mkdir('browser-screenshots',{recursive:true});
try {
 for (const style of ['points','elimination']) {
  const {code,host}=await api('',null,{mode:'moreless',moreLessStyle:style,category:'mixed',format:'choice',count:3,seconds:0});
  const path='/'+code;
  async function screen(key,isHost) {
   const page=await browser.newPage({viewport:isHost?{width:1280,height:720}:{width:390,height:844},isMobile:!isHost,hasTouch:!isHost,reducedMotion:'reduce'});
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(({code,key,isHost})=>{
    sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:isHost}));
    sessionStorage.setItem('jambaloop-welcomed',code);
   },{code,key,isHost});
   await page.goto(site+'/?room='+code);
   return page;
  }
  const tv=await screen(host,true);
  const seats=[];
  for(const name of ['Alex','Morgan','Jo']){
   const {key}=await api(path+'/join',null,{name});
   seats.push({key,page:await screen(key,false)});
  }
  let s=await api(path,host);
  await api(path+'/advance',host,{phase:'lobby',game:s.game,index:0,lobbyVersion:s.lobbyVersion});
  const rounds=style==='points'?3:1;
  for(let i=0;i<rounds;i++) {
   await tv.getByRole('button',{name:'Reveal answer'}).waitFor();
   s=await api(path,host);
   const q=comparisons.find(item=>item.id===s.party.id);
   const values=q.options.map(item=>item.value);
   const wanted=q.direction==='less'?Math.min(...values):Math.max(...values);
   const choice=s.party.options.indexOf(q.options.find(item=>item.value===wanted).label);
   if(i===0 && style==='points')await tv.screenshot({path:'browser-screenshots/more-less-tv.png'});
   for(const [seatIndex,seat] of seats.entries()) {
    const buttons=seat.page.locator('[data-action="moreless-vote"]');
    await buttons.first().waitFor();
    assert.equal(await seat.page.getByText('undefined',{exact:true}).count(),0,'Phone phase label is present');
    const box=await buttons.last().boundingBox();
    assert.ok(box.y>=0 && box.y+box.height<=844,'Both answers fit on the phone');
    if(i===0 && style==='points' && seatIndex===0)await seat.page.screenshot({path:'browser-screenshots/more-less-phone.png'});
    await buttons.nth(style==='elimination'&&seatIndex>0?1-choice:choice).click();
   }
   await tv.getByText('CORRECT',{exact:true}).waitFor();
   await tv.getByRole('button',{name:i===rounds-1?'Final results':'Next question'}).click();
  }
  await tv.getByRole('heading',{name:'Final results'}).waitFor();
  s=await api(path,host);
  assert.equal(s.phase,'finished');
  assert.equal(s.players[0].score,rounds*100);
  for(const page of [tv,...seats.map(seat=>seat.page)]) await page.close();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: More or Less points and elimination on TV and phone, voting and final results');
} finally {await browser.close();}
