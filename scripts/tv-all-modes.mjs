// Snapshot the actual game-start TV stage for every Jambaloop mode.
// Diagnostic audit: old modes with layout warnings still produce screenshots.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {modes,minimumPlayers} from '../public/game-config.js';

const site=process.env.SITE||'http://127.0.0.1:32000';
const browser=await chromium.launch({
  headless:true, executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage'],
});
await mkdir('browser-screenshots',{recursive:true});
const report=[];

async function stageFor(mode,width,height) {
  const setup={mode,format:mode==='soclose'?'estimate':'choice',category:'mixed',
    count:mode==='board'?12:mode==='spotlight'?1:['tracks','samepage'].includes(mode)?3:5,
    seconds:mode==='quizrace'||['tracks','samepage'].includes(mode)?0:20,
    ...(mode==='board'||mode==='tracks'||mode==='showdown'?{playStyle:'teams',teamCount:2}:{playStyle:'individual'}),
  };
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  try {
    const created=await context.request.post(site+'/api/rooms',{data:setup});
    assert.equal(created.status(),201,mode+' setup returned '+await created.text());
    const {code,host:hostKey}=await created.json();
    const number=Math.max(3,minimumPlayers(mode));
    for(let i=0;i<number;i++){
      const joined=await context.request.post(site+'/api/rooms/'+code+'/join',{data:{name:'Audience '+i}});
      assert.equal(joined.status(),201,mode+' player '+i+' could not join: '+await joined.text());
    }
    await context.addInitScript(({code,key})=>{
      sessionStorage.setItem('quizmas-session',JSON.stringify({code,key,host:true}));
    },{code,key:hostKey});
    const page=await context.newPage();
    const javascriptErrors=[];
    page.on('pageerror',err=>javascriptErrors.push(err.message));
    await page.goto(site,{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('.game.host-screen').waitFor({timeout:15000});
    const started=await context.request.post(site+'/api/rooms/'+code+'/advance',{
      headers:{'x-game-key':hostKey},data:{phase:'lobby',index:0,game:1},
    });
    assert.equal(started.status(),204,mode+' could not start: '+await started.text());
    await page.waitForFunction(()=>document.querySelector('section.game')?.dataset.phase!=='lobby',{
      timeout:15000,
    });
    await page.evaluate(()=>document.fonts.ready);
    // Measure the settled layout: finite entrance animations move panels with transforms.
    await page.evaluate(()=>Promise.race([
      Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))),
      new Promise(resolve=>setTimeout(resolve,2500)),
    ]));
    const metrics=await page.evaluate(()=>{
      const root=document.querySelector('section.game');
      const panels=[...root.querySelectorAll('.game-panel')].map(panel=>{
        const rect=panel.getBoundingClientRect();
        return {width:Math.round(rect.width),height:Math.round(rect.height),
          left:Math.round(rect.left),right:Math.round(rect.right),
          bottom:Math.round(rect.bottom)};
      });
      return {
        phase:root.dataset.phase,
        scrollWidth:document.scrollingElement.scrollWidth,
        scrollHeight:document.scrollingElement.scrollHeight,
        gameBottom:Math.round(root.getBoundingClientRect().bottom),
        panels,
      };
    });
    const warning=[];
    if(metrics.scrollWidth>width+2)warning.push('horizontal document overflow');
    if(metrics.scrollHeight>height+2)warning.push('vertical document overflow');
    if(metrics.gameBottom>height+3)warning.push('game stage exceeds viewport');
    if(javascriptErrors.length)warning.push('JavaScript errors: '+javascriptErrors.join('; '));
    const file=`browser-screenshots/tv-${mode}-${width}x${height}.png`;
    await page.screenshot({path:file,fullPage:false});
    report.push({mode,width,height,...metrics,warning,file});
    console.log(`${warning.length?'REVIEW':'PASS'}: TV ${mode} ${width}x${height} · ${metrics.phase}${warning.length?' · '+warning.join(', '):''}`);
  } finally {await context.close();}
}

try {
  for(const [width,height] of [[1280,720],[1920,1080]]) {
    for(const [mode] of modes) await stageFor(mode,width,height);
  }
} finally {
  await writeFile('browser-screenshots/tv-all-modes-audit.json',JSON.stringify(report,null,2));
  await browser.close();
}
const sketch=report.filter(x=>x.mode==='sketch');
assert.equal(sketch.length,2,'Sketch Sprint must be captured at both TV resolutions');
assert.ok(sketch.every(x=>!x.warning.length),'Sketch Sprint TV must fit 720p and 1080p: '+JSON.stringify(sketch));
const samePage=report.filter(x=>x.mode==='samepage');
assert.equal(samePage.length,2);
assert.ok(samePage.every(x=>!x.warning.length),
  'New Same Page TV layout must fit 720p and 1080p without JS errors: '+JSON.stringify(samePage));

const soClose=report.filter(x=>x.mode==='soclose');
assert.equal(soClose.length,2,'So Close must be captured at both TV resolutions');
assert.ok(soClose.every(x=>!x.warning.length),'So Close TV must fit 720p and 1080p: '+JSON.stringify(soClose));
