import assert from 'node:assert/strict';
import test from 'node:test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

async function withServer(run) {
  const child=spawn(process.execPath,['server.js'],{
    env:{...process.env,PORT:'0',PUBLIC_URL:''},
    stdio:['ignore','pipe','pipe'],
  });
  try{
    const [output]=await Promise.race([
      once(child.stdout,'data'),
      once(child,'exit').then(([code])=>{throw new Error('server exited '+code);}),
    ]);
    const site=String(output).match(/http:\/\/localhost:\d+/)?.[0];
    assert.ok(site,'server should print its localhost URL');
    const req=async (path,body,key,expected=200)=>{
      const response=await fetch(site+'/api/rooms'+path,{
        method:body===undefined?'GET':'POST',
        headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},
        ...(body===undefined?{}:{body:JSON.stringify(body)}),
      });
      const data=response.status===204?undefined:await response.json();
      assert.equal(response.status,expected,JSON.stringify(data));
      return data;
    };
    const room=async (mode,style,n,count=2,extra={})=>{
      const create=await req('',{mode,playStyle:style,teamCount:count,category:'mixed',
        count:mode==='board'?12:5,seconds:0,...extra},undefined,201);
      const path='/'+create.code;
      const players=[];
      for(let i=0;i<n;i++)players.push(await req(path+'/join',{name:'Family '+i},undefined,201));
      const state=(key=create.host)=>req(path,undefined,key);
      const advance=async()=>{
        const s=await state();
        return req(path+'/advance',{game:s.game,index:s.index,phase:s.phase},create.host,204);
      };
      return {...create,path,players,state,advance};
    };
    await run({req,room});
  } finally{child.kill();}
}

test('3-team Classic Quiz balances 5 players and scores each team by member average',async()=>{
  await withServer(async({req,room})=>{
    const customQuiz={title:'Team test',questions:Array.from({length:2},(_,i)=>({
      type:'boolean',prompt:'Team score check '+i,correct:0,
    }))};
    const r=await room('classic','teams',5,3,{customQuiz});
    const lobby=await r.state();
    assert.equal(lobby.playStyle,'teams');
    assert.deepEqual(lobby.teamPreview.map(x=>x.size),[2,2,1]);
    assert.deepEqual(lobby.teamPreview.flatMap(x=>x.members.map(y=>y.name)).sort(),
      Array.from({length:5},(_,i)=>'Family '+i).sort());
    await r.advance();
    const started=await r.state();
    assert.equal(started.phase,'question');
    assert.deepEqual(started.teams.map(t=>t.size),[2,2,1]);
    const states=await Promise.all(r.players.map(p=>r.state(p.key)));
    assert.deepEqual(states.map(s=>s.player.team),[0,1,2,0,1]);
    for(let i=0;i<r.players.length;i++){
      await req(r.path+'/answer',{game:started.game,index:0,option:i===0||i===3?0:1},r.players[i].key,204);
    }
    await r.advance();
    const after=await r.state();
    assert.equal(after.phase,'reveal');
    assert.deepEqual(after.teams.map(t=>t.score),[1000,0,0]);
    assert.deepEqual(after.teams.map(t=>t.roundPoints),[1000,0,0]);
  });
});

test('Solo Classic Quiz preserves ungrouped play and rejects team-only modes',async()=>{
  await withServer(async({req,room})=>{
    const r=await room('classic','individual',3,2);
    await r.advance();
    const game=await r.state();
    assert.equal(game.teams.length,0);
    assert.equal(game.playStyle,'individual');
    await req('',{mode:'potato',playStyle:'teams',category:'mixed',count:5,
      seconds:0,teamCount:2},undefined,400);
  });
});

test('Board Race individual gives each player a separate piece; the lane is chosen at the junction',async()=>{
  await withServer(async({req,room})=>{
    const r=await room('board','individual',3,4,{boardLength:16});
    assert.equal((await r.state()).teamPreview.length,3);
    await r.advance();
    const game=await r.state();
    assert.equal(game.teams.length,3);
    assert.deepEqual(game.teams.map(t=>t.name),['Family 0','Family 1','Family 2']);
    // Nobody chooses a lane at the start: the choice comes at the junction (the first corner, square 3).
    const early=await req(r.path+'/board-path',{game:game.game,index:game.index,path:'questions'},r.host,409);
    assert.match(early.error,/reaches the junction/);
    await req(r.path+'/roll',{game:game.game,index:game.index},r.host,204);
    const moved=await r.state();
    assert.equal(moved.phase,'rolling');
    assert.ok(moved.motion.to>=1&&moved.motion.to<=3,'an undecided piece never passes the junction');
    assert.equal(moved.motion.junction,moved.motion.die>3?true:undefined,'a long roll stops on the junction');
    assert.equal(moved.motion.reward,moved.motion.die===3?'fifty':undefined,'landing exactly on the first corner collects 50/50');
    assert.ok(!moved.teams[0].pathChoice,'no lane chosen yet');
    assert.equal(moved.boardFork.extra,4);
  });
});

test('Board Race team grouping supports 2 teams; no lane choice before the junction',async()=>{
  await withServer(async({req,room})=>{
    const r=await room('board','teams',4,2,{boardLength:16});
    assert.deepEqual((await r.state()).teamPreview.map(x=>x.size),[2,2]);
    await r.advance();
    const game=await r.state();
    assert.equal(game.teams.length,2);
    assert.deepEqual(game.teams.map(x=>x.size),[2,2]);
    await req(r.path+'/board-path',{game:game.game,index:game.index,path:'power'},r.host,409);
    await req(r.path+'/roll',{game:game.game,index:game.index},r.host,204);
    const moving=await r.state();
    assert.ok(moving.motion.to<=3,'the team stops at the junction until it has chosen');
  });
});

test('Quiz Race teams preserve individual racers plus public team standings',async()=>{
  await withServer(async({room})=>{
    const r=await room('quizrace','teams',4,2,{format:'choice'});
    await r.advance();
    const state=await r.state();
    assert.equal(state.playStyle,'teams');
    assert.equal(state.teams.length,2);
    assert.equal(state.race.racers.length,4);
    assert.equal(state.raceTeams.length,2);
    assert.equal(state.raceTeams[0].size,2);
    assert.equal(state.raceTeams[1].size,2);
  });
});

test('Board Race corners: each gives a different power-up, collected by landing exactly on it',async()=>{
  const {boardCornerPower,boardCorners,boardPowers}=await import('../public/board-route.js');
  for(const spaces of [16,24,32,40]){
    const corners=boardCorners(spaces);
    assert.deepEqual(corners.map(index=>boardCornerPower(spaces,index,'power')),['fifty','skip','points','half']);
    assert.equal(boardCornerPower(spaces,corners[0]+1,'power'),undefined);
  }
  assert.equal(new Set(boardPowers.map(power=>power.id)).size,4);
  await withServer(async({req,room})=>{
    for(let attempt=0;attempt<60;attempt++){
      const r=await room('board','teams',4,2,{boardLength:16});
      await r.advance();
      const game=await r.state();
      assert.deepEqual(game.teams[0].powers,{fifty:0,skip:0,points:0,half:0},'nobody starts with a power-up');
      await req(r.path+'/roll',{game:game.game,index:game.index},r.host,204);
      const rolling=await r.state();
      if(rolling.motion.die!==3)continue;
      assert.equal(rolling.motion.reward,'fifty');
      assert.equal(rolling.teams[rolling.activeTeam].powers.fifty,1);
      let after;
      for(let wait=0;wait<80;wait++){after=await r.state();if(after.phase!=='rolling')break;await new Promise(done=>setTimeout(done,100));}
      assert.equal(after.phase,'question','the corner still asks its question');
      return;
    }
    assert.fail('no first roll of 3 in 60 games');
  });
});

test('Board Race power-ups: any teammate can play one at any time, and each does what it says',async()=>{
  const {spawn}=await import('node:child_process');
  const {once}=await import('node:events');
  const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',PUBLIC_URL:'',BOARD_START_POWERS:'1'},stdio:['ignore','pipe','inherit']});
  try{
    const [output]=await once(server.stdout,'data');
    const origin=String(output).match(/http:\/\/localhost:\d+/)[0];
    const call=async(path,key,data)=>{
      const response=await fetch(origin+'/api/rooms'+path,{method:data===undefined?'GET':'POST',headers:{...(key&&{'x-game-key':key}),'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
      return {status:response.status,body:response.status===204?undefined:await response.json()};
    };
    const {body:{code,host}}=await call('',undefined,{mode:'board',category:'mixed',count:12,seconds:0,playStyle:'teams',teamCount:2,boardLength:24,format:'choice'});
    const path='/'+code;
    const keys=[];
    for(const name of ['Ada','Bo','Cy','Di'])keys.push((await call(path+'/join',undefined,{name})).body.key);
    const state=async key=>(await call(path,key??host)).body;
    const lobby=await state();
    await call(path+'/advance',host,{game:lobby.game,phase:'lobby',index:0,lobbyVersion:lobby.lobbyVersion});
    let s=await state();
    const sides=await Promise.all(keys.map(async key=>(await state(key)).player.team));
    const a=s.activeTeam, b=1-a;
    const active=keys[sides.indexOf(a)], mate=keys[sides.lastIndexOf(a)], rival=keys[sides.indexOf(b)];
    const play=(key,power,target)=>call(path+'/board-power',key,{game:s.game,power,...(target!==undefined&&{target})});
    // The TV host is not on a team.
    assert.equal((await play(host,'points')).status,403);
    assert.equal((await play(active,'nonsense')).status,400);
    // 50/50 and New Question need a live question.
    assert.equal((await play(active,'fifty')).status,409);
    assert.equal((await play(active,'skip')).status,409);
    // Half Points: played on a rival at any time, never on yourself, once per rival.
    assert.equal((await play(active,'half')).status,400,'needs a target');
    assert.equal((await play(active,'half',a)).status,400,'not on your own team');
    assert.equal((await play(active,'half',b)).status,204);
    assert.equal((await play(mate,'half',b)).status,409,'already halved');
    s=await state();
    assert.equal(s.teams[b].halved.by,a);
    assert.equal(s.teams[a].powers.half,0);
    await call(path+'/roll',host,{game:s.game,index:s.index});
    for(let wait=0;wait<80;wait++){s=await state();if(s.phase==='question')break;await new Promise(done=>setTimeout(done,100));}
    assert.equal(s.phase,'question');
    // New Question: a fresh question for everyone, answers so far cleared.
    const first=s.question.prompt;
    await call(path+'/answer',rival,{game:s.game,index:s.index,option:0});
    assert.equal((await play(rival,'skip')).status,204);
    s=await state();
    assert.equal(s.phase,'question');
    assert.notEqual(s.question.prompt,first);
    assert.equal(s.questionRefreshed,s.teams[b].name);
    assert.equal((await state(rival)).selection,undefined,'the old answer is gone');
    assert.equal(s.teams[b].powers.skip,0);
    // 50/50: two wrong answers removed, for that team's phones only.
    assert.equal((await play(active,'fifty')).status,204);
    assert.equal((await play(mate,'fifty')).status,409,'once per question');
    const mine=await state(active), theirs=await state(rival), tv=await state();
    assert.equal(mine.removedOptions.length,2);
    assert.deepEqual((await state(mate)).removedOptions,mine.removedOptions);
    assert.equal(theirs.removedOptions,undefined,'rivals do not see what was removed');
    assert.equal(tv.removedOptions,undefined,'nor does the TV');
    // Double Points: before your team answers, not after.
    const keep=[0,1,2,3].filter(option=>!mine.removedOptions.includes(option));
    await call(path+'/answer',rival,{game:s.game,index:s.index,option:0});
    assert.equal((await play(rival,'points')).status,409,'too late once a teammate has answered');
    assert.equal((await play(active,'points')).status,204);
    assert.equal((await play(active,'points')).status,409,'already in play');
    for(const key of keys)for(const option of keep)await call(path+'/answer',key,{game:s.game,index:s.index,option});
    await call(path+'/advance',host,{game:s.game,phase:'question',index:s.index});
    s=await state();
    assert.equal(s.phase,'reveal');
    assert.ok(keep.includes(s.question.correct),'50/50 never removes the right answer');
    const base=s.motion.points;
    const scoreOf=async key=>(await state(key)).player.score;
    // Everyone ends on one of the two kept answers; at least one of them is right.
    const scores=await Promise.all(keys.map(scoreOf));
    const rightActive=keys.filter((key,i)=>sides[i]===a&&scores[i]>0), rightRival=keys.filter((key,i)=>sides[i]===b&&scores[i]>0);
    for(const key of rightActive)assert.ok(await scoreOf(key)>=base*2,'Double Points doubles a right answer');
    for(const key of rightRival)assert.ok(await scoreOf(key)<base,'Half Points halves the rival');
    assert.equal(s.teams[a].armed.points,false,'spent on that question');
    assert.equal(s.teams[b].halved,undefined);
    assert.equal(s.teams[a].used.points,true);
    assert.equal(s.teams[b].used.halved,true);
  }finally{server.kill();}
});

test('Board Race power-ups work everyone-against-everyone (up to 8) and with 2 to 8 teams',async()=>{
  const {spawn}=await import('node:child_process');
  const {once}=await import('node:events');
  const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',PUBLIC_URL:'',BOARD_START_POWERS:'1',ROOMS_PER_MINUTE:'5000'},stdio:['ignore','pipe','inherit']});
  try{
    const [output]=await once(server.stdout,'data');
    const origin=String(output).match(/http:\/\/localhost:\d+/)[0];
    const call=async(path,key,data)=>{
      const response=await fetch(origin+'/api/rooms'+path,{method:data===undefined?'GET':'POST',headers:{...(key&&{'x-game-key':key}),'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
      return {status:response.status,body:response.status===204?undefined:await response.json()};
    };
    for(const [playStyle,teamCount,people] of [['individual',4,2],['individual',4,3],['individual',4,4],['individual',4,8],['teams',2,5],['teams',3,7],['teams',4,9],['teams',6,13],['teams',8,17]]){
      const label=`${playStyle} ${playStyle==='teams'?teamCount+' teams':people+' players'}`;
      const {body:{code,host}}=await call('',undefined,{mode:'board',category:'mixed',count:12,seconds:0,playStyle,teamCount,boardLength:24,format:'choice'});
      const path='/'+code;
      const keys=[];
      for(let i=0;i<people;i++)keys.push((await call(path+'/join',undefined,{name:'P'+i})).body.key);
      const state=async key=>(await call(path,key??host)).body;
      const lobby=await state();
      assert.equal((await call(path+'/advance',host,{game:lobby.game,phase:'lobby',index:0,lobbyVersion:lobby.lobbyVersion})).status,204,label);
      let s=await state();
      const pieces=playStyle==='teams'?teamCount:people;
      assert.equal(s.teams.length,pieces,label);
      const sides=await Promise.all(keys.map(async key=>(await state(key)).player.team));
      const first=id=>keys[sides.indexOf(id)];
      const play=(key,power,target)=>call(path+'/board-power',key,{game:s.game,power,...(target!==undefined&&{target})});
      for(const team of s.teams)assert.deepEqual(team.powers,{fifty:1,skip:1,points:1,half:1},label);
      // Every side halves the next one round: each rival is a valid target, yourself and strangers are not.
      for(let id=0;id<pieces;id++){
        assert.equal((await play(first(id),'half',id)).status,400,label+': not yourself');
        assert.equal((await play(first(id),'half',pieces)).status,400,label+': not a side that does not exist');
        assert.equal((await play(first(id),'half',(id+1)%pieces)).status,204,label+': any rival');
      }
      s=await state();
      assert.ok(s.teams.every(team=>team.halved&&team.powers.half===0),label);
      await call(path+'/roll',host,{game:s.game,index:s.index});
      for(let wait=0;wait<80;wait++){s=await state();if(s.phase==='question')break;await new Promise(done=>setTimeout(done,100));}
      assert.equal(s.phase,'question',label);
      // A side that is not on turn refreshes the question; every side then takes its own 50/50.
      const prompt=s.question.prompt;
      assert.equal((await play(first((s.activeTeam+1)%pieces),'skip')).status,204,label);
      s=await state();
      assert.notEqual(s.question.prompt,prompt,label);
      for(let id=0;id<pieces;id++)assert.equal((await play(first(id),'fifty')).status,204,label);
      const views=await Promise.all(keys.map(state));
      views.forEach((view,i)=>{
        assert.equal(view.removedOptions.length,2,label);
        // Teammates share one 50/50; nobody is sent another side's.
        assert.deepEqual(view.removedOptions,views[sides.indexOf(sides[i])].removedOptions,label);
      });
      assert.equal((await state()).removedOptions,undefined,label+': TV');
      // Double Points for side 0 only; then everyone answers something their 50/50 kept.
      assert.equal((await play(first(0),'points')).status,204,label);
      for(const [i,key] of keys.entries())for(const option of [0,1,2,3].filter(o=>!views[i].removedOptions.includes(o)))await call(path+'/answer',key,{game:s.game,index:s.index,option});
      assert.equal((await play(first(1),'points')).status,409,label+': too late after answering');
      await call(path+'/advance',host,{game:s.game,phase:'question',index:s.index});
      s=await state();
      assert.equal(s.phase,'reveal',label);
      const base=s.motion.points;
      const scores=await Promise.all(keys.map(async key=>(await state(key)).player.score));
      scores.forEach((score,i)=>{
        if(!score)return;
        // Side 0 is doubled and halved at once (back to normal); everyone else is halved.
        if(sides[i]===0)assert.ok(score>=base,label+': doubled then halved');
      });
      const right=scores.map((score,i)=>score>0?i:-1).filter(i=>i>=0);
      const zero=right.find(i=>sides[i]===0), other=right.find(i=>sides[i]!==0);
      if(zero!==undefined&&other!==undefined)assert.ok(scores[zero]>scores[other],label+': the doubled side out-scores a halved one');
      assert.ok(s.teams.every(team=>!team.halved&&!team.armed.points),label+': all spent');
    }
  }finally{server.kill();}
});

test('Board Race takes up to eight pieces; other team games stay at four teams',async()=>{
  const {pieceOffset}=await import('../public/board-route.js');
  const {teams,maximumTeams}=await import('../public/game-config.js');
  assert.equal(maximumTeams('board'),8);
  assert.equal(maximumTeams('classic'),4);
  assert.equal(new Set(teams.map(([name])=>name)).size,8);
  assert.equal(new Set(teams.map(([,colour])=>colour)).size,8);
  // No two pieces share a spot, and every piece stays inside its space.
  for(let count=1;count<=8;count++){
    const spots=Array.from({length:count},(_,id)=>pieceOffset(id,count));
    for(const [x,z] of spots)assert.ok(Math.abs(x)<=.3&&Math.abs(z)<=.3);
    for(let a=0;a<count;a++)for(let b=a+1;b<count;b++)assert.ok(Math.hypot(spots[a][0]-spots[b][0],spots[a][1]-spots[b][1])>.18,`${count} pieces: ${a} and ${b} overlap`);
  }
  await withServer(async({req})=>{
    const base={category:'mixed',count:12,seconds:0,playStyle:'teams',boardLength:24};
    await req('',{...base,mode:'board',teamCount:8},undefined,201);
    await req('',{...base,mode:'board',teamCount:9},undefined,400);
    await req('',{...base,mode:'classic',count:10,teamCount:5},undefined,400);
  });
});
