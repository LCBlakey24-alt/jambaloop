// The captain's phone keeps hidden buttons hidden: So Close holds back its Next button until the winner is
// shown, and the lobby's paged phone layout hides what is on another page. (A phone-wide button style once
// overrode both; this guards against that coming back.)
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
try{
  const api=await browser.newContext();
  const room=async data=>{
    const {code,host}=await (await api.request.post(site+'/api/rooms',{data})).json();
    const players=[];for(const name of ['Ada','Bo','Cy'])players.push(await (await api.request.post(site+'/api/rooms/'+code+'/join',{data:{name}})).json());
    const snap=async key=>(await api.request.get(site+'/api/rooms/'+code,{headers:{'x-game-key':key}})).json();
    const captain=(await Promise.all(players.map(async p=>((await snap(p.key)).isCaptain?p:undefined)))).find(Boolean);
    return {code,host,players,snap,captain};
  };
  const open=async(code,key,size)=>{const ctx=await browser.newContext({viewport:size,isMobile:true,hasTouch:true});await ctx.addInitScript(({code,key})=>sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:false})),{code,key});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(site,{waitUntil:'domcontentloaded'});return p;};
  // 1. Lobby on tall phones: anything the paged layout puts on another page is not displayed.
  for(const size of [{width:390,height:844},{width:360,height:740}]){
    const r=await room({mode:'classic',category:'mixed',count:5,seconds:20,format:'choice'});
    const phone=await open(r.code,r.captain.key,size);
    await phone.locator('[data-action="advance"]').first().waitFor({state:'attached',timeout:15000});
    await phone.waitForTimeout(600);
    const leaks=await phone.evaluate(()=>[...document.querySelectorAll('[data-deck-hidden]')].filter(el=>getComputedStyle(el).display!=='none').map(el=>el.className||el.tagName));
    assert.deepEqual(leaks,[],`paged-away parts of the lobby stay hidden at ${size.width}x${size.height}`);
    // The captain's own lobby buttons keep their compact layout: on a 390x844 phone Settings is on the first page,
    // as it always was (on shorter phones the paged lobby has always put it on the next page).
    if(size.height>=844)assert.ok(await phone.locator('[data-action="configure"]').first().isVisible(),`Settings is on the captain's first page at ${size.width}x${size.height}`);
  }
  console.log('PASS: the captain phone lobby keeps paged-away parts hidden');
  // 2. So Close reveal on a tall phone: the captain's Next button stays hidden until the winner frame.
  const r=await room({mode:'soclose',category:'mixed',count:5,seconds:0,format:'estimate'});
  const phone=await open(r.code,r.captain.key,{width:390,height:844});
  let s=await r.snap(r.host);
  await api.request.post(site+'/api/rooms/'+r.code+'/advance',{headers:{'x-game-key':r.host},data:{game:s.game,phase:s.phase,index:s.index,lobbyVersion:s.lobbyVersion}});
  for(let i=0;i<40;i++){s=await r.snap(r.host);if(s.phase==='question')break;await new Promise(res=>setTimeout(res,250));}
  for(const p of r.players){const own=await r.snap(p.key);await api.request.post(site+'/api/rooms/'+r.code+'/answer',{headers:{'x-game-key':p.key},data:{game:own.game,index:own.index,option:7}});}
  s=await r.snap(r.host);
  if(s.phase==='question')await api.request.post(site+'/api/rooms/'+r.code+'/advance',{headers:{'x-game-key':r.host},data:{game:s.game,phase:s.phase,index:s.index}});
  await phone.locator('.so-close-reveal-actions').waitFor({timeout:15000});
  const shown=await phone.evaluate(()=>{const b=document.querySelector('.so-close-reveal-actions [data-action="advance"]');return {hidden:b.hidden,display:getComputedStyle(b).display};});
  assert.equal(shown.hidden,true,'the reveal starts with Next held back');
  assert.equal(shown.display,'none','a hidden Next button is not displayed during the staged reveal');
  await phone.screenshot({path:'browser-screenshots/phone-captain-soclose-reveal.png'});
  console.log('PASS: So Close keeps the captain\'s Next button hidden during the staged reveal');
  assert.deepEqual(errors,[],'no page errors');
}finally{await browser.close();}
