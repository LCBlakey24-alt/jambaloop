// Complete a four-person match, keeping all phones live and voting through the controller.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox']});
const errors=[];
async function api(path,key,data){
 const response=await fetch(site+'/api/rooms'+path,{method:data?'POST':'GET',headers:{'content-type':'application/json',...(key&&{'x-game-key':key})},body:data&&JSON.stringify(data)});
 assert.ok(response.ok,await response.clone().text());
 return response.status===204?null:response.json();
}
await mkdir('browser-screenshots',{recursive:true});
try{
 const {code,host}=await api('',null,{mode:'debate',category:'mixed',format:'choice',count:1,seconds:0});
 const path='/'+code;
 async function screen(key,isHost,viewport){
   const page=await browser.newPage({viewport,isMobile:!isHost,hasTouch:!isHost,reducedMotion:'reduce'});
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({code,key,isHost})=>{
     sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:isHost}));
     sessionStorage.setItem('jambaloop-welcomed',code);
   },{code,key,isHost});
   await page.goto(site+'/?room='+code);
   return page;
 }
 const tv=await screen(host,true,{width:1280,height:720});
 const seats=[];
 for(const [i,name] of ['Alex','Morgan','Jo','Sam'].entries()){
   const {key}=await api(path+'/join',null,{name});
   seats.push({name,key,page:await screen(key,false,i%2?{width:390,height:844}:{width:320,height:568})});
 }
 let s=await api(path,host);
 await api(path+'/advance',host,{phase:'lobby',game:s.game,index:0,lobbyVersion:s.lobbyVersion});
 for(let i=0;i<4;i++){
   await tv.getByRole('button',{name:'Next speaker'}).waitFor();
   if(i===0)await tv.screenshot({path:'browser-screenshots/floor-time-tv.png'});
   await tv.getByRole('button',{name:'Next speaker'}).click();
   await tv.getByRole('button',{name:'Open ballot'}).click();
   s=await api(path,host);
   assert.equal(s.phase,'debate-vote');
   for(const seat of seats){
     const vote=seat.page.locator('[data-action="debate-vote"]');
     if(s.party.speakers.includes(seat.name)){assert.equal(await vote.count(),0);continue;}
     await vote.first().waitFor();
     const box=await vote.last().boundingBox();
     assert.ok(box.y>=0 && box.y+box.height<=seat.page.viewportSize().height,'Ballot fits the phone');
     if(i===0)await seat.page.screenshot({path:'browser-screenshots/floor-time-phone.png'});
     await vote.first().click();
   }
   assert.equal((await api(path,host)).phase,'debate-reveal');
   await tv.getByRole('button',{name:i===3?'Final standings':'Next debate'}).click();
 }
 await tv.getByRole('heading',{name:'Final verdict'}).waitFor();
 assert.equal((await api(path,host)).phase,'finished');
 assert.deepEqual(errors,[]);
 console.log('PASS: four debates on five connected screens, secret voting, results and phone reachability');
}finally{await browser.close();}
