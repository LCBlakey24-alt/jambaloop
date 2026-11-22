import assert from 'node:assert/strict';
import test from 'node:test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {forkSentence} from '../public/fork-cards.js';

async function liveServer(action) {
  const child=spawn(process.execPath,['server.js'],{
    env:{...process.env,PORT:'0',PUBLIC_URL:''},stdio:['ignore','pipe','pipe']
  });
  try {
    const [output]=await Promise.race([
      once(child.stdout,'data'),
      once(child,'exit').then(([code])=>{throw new Error('Server exited '+code);}),
    ]);
    const origin=String(output).match(/http:\/\/localhost:\d+/)?.[0];
    assert.ok(origin,'Server must report a local address');
    const request=async (path,key,data,status=200)=>{
      const res=await fetch(origin+'/api/rooms'+path,{
        method:data===undefined?'GET':'POST',
        headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},
        ...(data===undefined?{}:{body:JSON.stringify(data)}),
      });
      const json=res.status===204?undefined:await res.json();
      assert.equal(res.status,status,JSON.stringify(json));
      return json;
    };
    const makeRoom=async (players=4,rounds=5)=>{
      const setup=await request('',undefined,{mode:'tracks',playStyle:'teams',teamCount:2,
        category:'mixed',format:'mixed',count:rounds,seconds:0},201);
      const path='/'+setup.code;
      const keys=[];
      for(let i=0;i<players;i++){
        const joined=await request(path+'/join',undefined,{name:'Guest '+i},201);
        keys.push(joined.key);
      }
      const state=(key=setup.host)=>request(path,key);
      const advance=async(key=setup.host)=>{
        const now=await state();
        return request(path+'/advance',key,{game:now.game,index:now.index,phase:now.phase},204);
      };
      const party=async (key,action,more={},status=204)=>{
        const now=await state(key);
        return request(path+'/party',key,{game:now.game,index:now.index,action,...more},status);
      };
      return {...setup,path,keys,state,advance,party};
    };
    await action({request,makeRoom});
  }finally {child.kill();}
}

test('host-judged two-team trolley builds three coherent cards in correct ownership order',async()=>{
  await liveServer(async({makeRoom})=>{
    const room=await makeRoom(4,5);
    const lobby=await room.state();
    assert.equal(lobby.playStyle,'teams');
    assert.equal(lobby.teamCount,2);
    assert.deepEqual(lobby.teamPreview.map(group=>group.size),[2,2]);
    await room.advance();
    let host=await room.state();
    assert.equal(host.phase,'party-build');
    assert.equal(host.party.type,'fork');
    assert.equal(host.party.step,0);
    assert.equal(host.party.hand,undefined,'Do not leak private card choices to judge');
    const participants=await Promise.all(room.keys.map(key=>room.state(key)));
    assert.deepEqual(participants.map(x=>x.player.team),[0,1,0,1]);
    assert.ok(participants.every(x=>x.party.hand.length===3));
    assert.notDeepEqual(participants[0].party.hand,participants[1].party.hand);
    const ownStart=[participants[0].party.hand[0],participants[1].party.hand[0]];
    for(const key of room.keys) await room.party(key,'card',{step:0,option:0});
    host=await room.state();
    assert.equal(host.phase,'party-build');
    assert.equal(host.party.step,1);
    assert.equal(host.party.placements[0][0],ownStart[0]);
    assert.equal(host.party.placements[1][0],ownStart[1]);
    const sabotage=await Promise.all(room.keys.map(key=>room.state(key)));
    const outgoing=[sabotage[0].party.hand[0],sabotage[1].party.hand[0]];
    for(const key of room.keys) await room.party(key,'card',{step:1,option:0});
    host=await room.state();
    assert.equal(host.party.step,2);
    assert.equal(host.party.placements[0][1],outgoing[1],'Team B sabotage belongs on Track A');
    assert.equal(host.party.placements[1][1],outgoing[0],'Team A sabotage belongs on Track B');
    const defence=await Promise.all(room.keys.map(key=>room.state(key)));
    const extra=[defence[0].party.hand[0],defence[1].party.hand[0]];
    for(const key of room.keys) await room.party(key,'card',{step:2,option:0});
    host=await room.state();
    assert.equal(host.phase,'party-judge');
    assert.equal(host.party.placements[0][2],extra[0]);
    assert.equal(host.party.placements[1][2],extra[1]);
    for(const [i,items] of host.party.placements.entries()){
      assert.ok(items.every(text=>typeof text==='string'&&text.length>10));
      const sentence=forkSentence(items,'AB'[i]);
      assert.match(sentence,/If the trolley takes Track [AB], it will hit .+, .+, and .+\.$/);
    }
    const forbidden=await room.party(room.keys[0],'judge',{track:0},403);
    assert.match(forbidden.error,/Only the host judge/);
    await room.advance();
    assert.equal((await room.state()).phase,'party-judge','Cannot skip impartial judge');
    await room.party(room.host,'judge',{track:0});
    host=await room.state();
    assert.equal(host.phase,'party-reveal');
    assert.equal(host.party.hit,0);
    assert.equal(host.party.saved,1);
    assert.deepEqual(host.teams.map(team=>team.score),[0,1]);
    const after=await Promise.all(room.keys.map(key=>room.state(key)));
    assert.deepEqual(after.map(x=>x.player.score),[0,100,0,100]);
    await room.advance();
    host=await room.state();
    assert.equal(host.index,1);
    assert.equal(host.phase,'party-build');
    assert.equal(host.party.step,0);
    assert.deepEqual(host.teams.map(team=>team.score),[0,1]);
  });
});

test('trolley rounds can run 7 rounds with explicit host control and a winner',async()=>{
  await liveServer(async({makeRoom})=>{
    const r=await makeRoom(3,7);
    await r.advance();
    for(let round=0;round<7;round++){
      let state=await r.state();
      assert.equal(state.index,round);
      for(let stage=0;stage<3;stage++) {
        assert.equal(state.phase,'party-build');
        assert.equal(state.party.step,stage);
        // Judge may progress a stalled team: a complete, grammatical first card is substituted.
        await r.advance();
        state=await r.state();
      }
      assert.equal(state.phase,'party-judge');
      assert.ok(state.party.placements.flat().every(Boolean));
      await r.party(r.host,'judge',{track:round===0?1:0});
      state=await r.state();
      assert.equal(state.phase,'party-reveal');
      await r.advance();
    }
    const finished=await r.state();
    assert.equal(finished.phase,'finished');
    assert.deepEqual(finished.teams.map(team=>team.score),[1,6]);
    assert.deepEqual(finished.teamWinners,[1]);
  });
});

test('invalid team styles/counts and duplicate placements are rejected by the server',async()=>{
  await liveServer(async({request,makeRoom})=>{
    const base={mode:'tracks',category:'mixed',format:'mixed',seconds:0,count:5};
    await request('',undefined,{...base,playStyle:'individual',teamCount:2},400);
    await request('',undefined,{...base,playStyle:'teams',teamCount:3},400);
    await request('',undefined,{...base,playStyle:'teams',teamCount:2,count:10},400);
    const r=await makeRoom(2,3);
    await r.advance();
    await r.party(r.keys[0],'card',{step:0,option:1});
    const duplicate=await r.party(r.keys[0],'card',{step:0,option:2},409);
    assert.match(duplicate.error,/already chosen/);
    const stale=await r.party(r.keys[1],'card',{step:2,option:0},409);
    assert.match(stale.error,/already ended/);
    const early=await r.party(r.host,'judge',{track:0},409);
    assert.match(early.error,/not available/);
    const captainAdvance=await r.state(r.keys[0]);
    const denied=await request(r.path+'/advance',r.keys[0],{
      phase:captainAdvance.phase,game:captainAdvance.game,index:captainAdvance.index},403);
    assert.match(denied.error,/host judge/);
    await r.party(r.keys[1],'card',{step:0,option:0});
    assert.equal((await r.state()).party.step,1);
  });
});
