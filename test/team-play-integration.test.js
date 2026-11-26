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
    assert.equal(moved.motion.bonus,moved.motion.die===3?true:undefined,'landing exactly on a corner is a bonus roll');
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

test('Board Race corner bonus: landing exactly on a corner skips the question and the same team rolls again',async()=>{
  await withServer(async({req,room})=>{
    // A 16-space board has its first corner on space 3, so a first roll of 3 lands on it.
    for(let attempt=0;attempt<60;attempt++){
      const r=await room('board','teams',4,2,{boardLength:16});
      await r.advance();
      const game=await r.state();
      await req(r.path+'/roll',{game:game.game,index:game.index},r.host,204);
      const rolling=await r.state();
      if(rolling.motion.die!==3)continue;
      assert.equal(rolling.motion.bonus,true);
      assert.equal(rolling.motion.to,3);
      let after;
      for(let wait=0;wait<80;wait++){after=await r.state();if(after.phase!=='rolling')break;await new Promise(done=>setTimeout(done,100));}
      assert.equal(after.phase,'ready','no question is asked');
      assert.equal(after.index,game.index,'it is still the same turn');
      assert.equal(after.activeTeam,game.activeTeam,'and the same team');
      assert.equal(after.cornerBonus,1);
      // The corner is also the junction, so the team now chooses a lane and rolls again.
      await req(r.path+'/board-path',{game:after.game,index:after.index,path:'power'},r.host,204);
      await req(r.path+'/roll',{game:after.game,index:after.index},r.host,204);
      assert.equal((await r.state()).motion.from,3);
      return;
    }
    assert.fail('no first roll of 3 in 60 games');
  });
});
