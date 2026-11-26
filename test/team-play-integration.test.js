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
    assert.equal(moved.motion.reward,moved.motion.die===3?'double':undefined,'landing exactly on the first corner collects Double Dice');
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
    assert.deepEqual(corners.map(index=>boardCornerPower(spaces,index,'power')),['double','pass','points','leap']);
    assert.equal(boardCornerPower(spaces,corners[0]+1,'power'),undefined);
  }
  assert.equal(new Set(boardPowers.map(power=>power.id)).size,4);
  await withServer(async({req,room})=>{
    for(let attempt=0;attempt<60;attempt++){
      const r=await room('board','teams',4,2,{boardLength:16});
      await r.advance();
      const game=await r.state();
      assert.deepEqual(game.teams[0].powers,{double:0,pass:0,points:0,leap:0},'nobody starts with a power-up');
      await req(r.path+'/roll',{game:game.game,index:game.index},r.host,204);
      const rolling=await r.state();
      if(rolling.motion.die!==3)continue;
      assert.equal(rolling.motion.reward,'double');
      assert.equal(rolling.teams[rolling.activeTeam].powers.double,1);
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
    const {body:{code,host}}=await call('',undefined,{mode:'board',category:'mixed',count:12,seconds:0,playStyle:'teams',teamCount:2,boardLength:24,format:'boolean'});
    const path='/'+code;
    const keys=[];
    for(const name of ['Ada','Bo','Cy','Di'])keys.push((await call(path+'/join',undefined,{name})).body.key);
    const state=async key=>(await call(path,key??host)).body;
    const lobby=await state();
    await call(path+'/advance',host,{game:lobby.game,phase:'lobby',index:0,lobbyVersion:lobby.lobbyVersion});
    let s=await state();
    const teamOf=async key=>(await state(key)).player.team;
    const sides=await Promise.all(keys.map(teamOf));
    const active=keys[sides.indexOf(s.activeTeam)], rival=keys[sides.indexOf(1-s.activeTeam)];
    const play=(key,power)=>call(path+'/board-power',key,{game:s.game,power});
    // The TV host is not on a team; a rival cannot spend your power-ups, only their own.
    assert.equal((await play(host,'leap')).status,403);
    assert.equal((await play(active,'nonsense')).status,400);
    // Leap: three spaces, straight away, even on another team's turn.
    assert.equal((await play(rival,'leap')).status,204);
    s=await state();
    assert.equal(s.teams[1-s.activeTeam].position,3);
    assert.equal(s.teams[1-s.activeTeam].powers.leap,0);
    assert.equal((await play(rival,'leap')).status,409,'a spent power-up cannot be played again');
    // Double Dice: the next roll moves twice as far, but never past the junction (space 5) undecided.
    assert.equal((await play(active,'double')).status,204);
    assert.equal((await play(active,'double')).status,409,'already in play');
    s=await state();
    assert.equal(s.teams[s.activeTeam].armed.double,true);
    await call(path+'/roll',host,{game:s.game,index:s.index});
    s=await state();
    assert.equal(s.motion.doubled,true);
    assert.equal(s.motion.to,Math.min(5,s.motion.die*2));
    assert.equal(s.teams[s.activeTeam].armed.double,false);
    assert.equal((await play(active,'leap')).status,409,'no leaping while the dice are falling');
    // Double Points and Free Pass, played during the roll, apply to the question that follows.
    assert.equal((await play(active,'points')).status,204);
    assert.equal((await play(rival,'pass')).status,204);
    for(let wait=0;wait<80;wait++){s=await state();if(s.phase==='question')break;await new Promise(done=>setTimeout(done,100));}
    assert.equal(s.phase,'question');
    const base=s.motion.points;
    // Nobody answers: the rival team's Free Pass still pays its members the base points.
    await call(path+'/advance',host,{game:s.game,phase:'question',index:s.index});
    s=await state();
    assert.equal(s.phase,'reveal');
    const rivalTeam=s.teams[1-s.activeTeam], activeTeam=s.teams[s.activeTeam];
    assert.equal(rivalTeam.roundPoints,base,'Free Pass: base points for a missed question');
    assert.equal(activeTeam.roundPoints,0,'Double Points doubles what you earn, and nothing is still nothing');
    assert.equal(rivalTeam.armed.pass,false);
    assert.equal(activeTeam.armed.points,false,'both are spent on that question');
    assert.equal((await state(rival)).player.score,base);
  }finally{server.kill();}
});
