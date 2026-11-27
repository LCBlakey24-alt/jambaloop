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


test('four players rotate the driver, choose one of three cards, and place coherent tracks',async()=>{
  await liveServer(async({makeRoom})=>{
    const room=await makeRoom(4,5);
    const lobby=await room.state();
    assert.deepEqual(lobby.teamPreview.map(group=>group.size),[2,2]);
    await room.advance();
    let host=await room.state();
    assert.equal(host.total,4,'Exactly one trolley round per player');
    assert.equal(host.phase,'party-build');
    assert.equal(host.party.hand,undefined);
    const first=await Promise.all(room.keys.map(key=>room.state(key)));
    const driverIndex=first.findIndex(x=>x.party.driverTurn);
    assert.ok(driverIndex>=0);
    assert.equal(first[driverIndex].party.hand,undefined,'Driver must not see team cards');
    assert.deepEqual(first.map(x=>x.player.team).filter(x=>x!==undefined).sort(),[0,0,1]);
    const byTeam=stageStates=>new Map(stageStates.filter(x=>!x.party.driverTurn)
      .map(x=>[x.player.team,x.party.hand[0]]));
    const firstCards=byTeam(first);
    assert.ok(first.filter(x=>!x.party.driverTurn).every(x=>x.party.hand.length===3));
    for(let i=0;i<room.keys.length;i++) if(i!==driverIndex)
      await room.party(room.keys[i],'card',{step:0,option:0});
    host=await room.state();
    assert.equal(host.phase,'party-placed','each placement is revealed before play moves on');
    assert.equal(host.party.placed,0);
    assert.equal((await room.state(room.keys[(driverIndex+1)%room.keys.length])).party.hand,undefined,'no new hand during the reveal');
    await room.advance();
    host=await room.state();
    assert.equal(host.party.step,1);
    assert.equal(host.party.placements[0][0],firstCards.get(0));
    assert.equal(host.party.placements[1][0],firstCards.get(1));
    const second=await Promise.all(room.keys.map(key=>room.state(key)));
    const badCards=byTeam(second);
    for(let i=0;i<room.keys.length;i++) if(i!==driverIndex)
      await room.party(room.keys[i],'card',{step:1,option:0});
    host=await room.state();
    assert.equal(host.phase,'party-placed','each placement is revealed before play moves on');
    assert.equal(host.party.placed,1);
    assert.equal((await room.state(room.keys[(driverIndex+1)%room.keys.length])).party.hand,undefined,'no new hand during the reveal');
    await room.advance();
    host=await room.state();
    assert.equal(host.party.step,2);
    assert.equal(host.party.placements[0][1],badCards.get(1));
    assert.equal(host.party.placements[1][1],badCards.get(0));
    const third=await Promise.all(room.keys.map(key=>room.state(key)));
    const finalCards=byTeam(third);
    for(let i=0;i<room.keys.length;i++) if(i!==driverIndex)
      await room.party(room.keys[i],'card',{step:2,option:0});
    host=await room.state();
    assert.equal(host.phase,'party-placed','each placement is revealed before play moves on');
    assert.equal(host.party.placed,2);
    assert.equal((await room.state(room.keys[(driverIndex+1)%room.keys.length])).party.hand,undefined,'no new hand during the reveal');
    await room.advance();
    host=await room.state();
    assert.equal(host.phase,'party-judge');
    assert.equal(host.party.placements[0][2],finalCards.get(0));
    assert.equal(host.party.placements[1][2],finalCards.get(1));
    for(const [i,cards] of host.party.placements.entries())
      assert.match(forkSentence(cards,'AB'[i]),/If the trolley takes Track [AB], it will hit .+, .+, and .+\.$/);
    const denied=await room.party(room.host,'judge',{track:0},403);
    assert.match(denied.error,/current Trolley Driver/);
    await room.party(room.keys[driverIndex],'judge',{track:0});
    host=await room.state();
    assert.equal(host.phase,'party-reveal');
    assert.equal(host.party.saved,1);
    const scored=await Promise.all(room.keys.map(key=>room.state(key)));
    for(const p of scored) assert.equal(p.player.score,p.player.team===1?100:0);
    await room.advance();
    const next=await Promise.all(room.keys.map(key=>room.state(key)));
    assert.equal(next[0].index,1);
    assert.equal(next.filter(x=>x.party.driverTurn).length,1);
    assert.notEqual(next.findIndex(x=>x.party.driverTurn),driverIndex);
  });
});

test('every joined player drives once before the game ends',async()=>{
  await liveServer(async({makeRoom})=>{
    const room=await makeRoom(3,7);
    await room.advance();
    const driven=new Set();
    for(let round=0;round<3;round++){
      let states=await Promise.all(room.keys.map(key=>room.state(key)));
      assert.equal(states[0].total,3);
      const driver=states.findIndex(x=>x.party.driverTurn);
      assert.ok(driver>=0);
      assert.ok(!driven.has(driver),'Driver must never repeat in a standard game');
      driven.add(driver);
      for(let stage=0;stage<3;stage++){
        states=await Promise.all(room.keys.map(key=>room.state(key)));
        for(let i=0;i<room.keys.length;i++) if(i!==driver)
          await room.party(room.keys[i],'card',{step:stage,option:0});
        assert.equal((await room.state()).phase,'party-placed');
        await room.advance();
      }
      assert.equal((await room.state()).phase,'party-judge');
      await room.party(room.keys[driver],'judge',{track:round%2});
      assert.equal((await room.state()).phase,'party-reveal');
      await room.advance();
    }
    assert.equal(driven.size,3);
    const finished=await room.state();
    assert.equal(finished.phase,'finished');
    assert.equal(finished.playerCount,3);
  });
});

test('invalid configuration, too few players, duplicate choices and premature judging are rejected',async()=>{
  await liveServer(async({request,makeRoom})=>{
    const base={mode:'tracks',category:'mixed',format:'mixed',seconds:0,count:5};
    await request('',undefined,{...base,playStyle:'individual',teamCount:2},400);
    await request('',undefined,{...base,playStyle:'teams',teamCount:3},400);
    await request('',undefined,{...base,playStyle:'teams',teamCount:2,count:10},400);
    const room=await makeRoom(3,3);
    await room.advance();
    const state=await Promise.all(room.keys.map(key=>room.state(key)));
    const voters=room.keys.filter((_,i)=>!state[i].party.driverTurn);
    await room.party(voters[0],'card',{step:0,option:1});
    const dupe=await room.party(voters[0],'card',{step:0,option:2},409);
    assert.match(dupe.error,/already chosen/);
    const stale=await room.party(voters[1],'card',{step:2,option:0},409);
    assert.match(stale.error,/already ended/);
    const early=await room.party(voters[1],'judge',{track:0},409);
    assert.match(early.error,/not available/);
    const now=await room.state(voters[0]);
    const denied=await request(room.path+'/advance',voters[0],{
      phase:now.phase,game:now.game,index:now.index},403);
    assert.match(denied.error,/TV host/);
    await room.party(voters[1],'card',{step:0,option:0});
    assert.equal((await room.state()).phase,'party-placed');
    await room.advance();
    assert.equal((await room.state()).party.step,1);
  });
});

test('After Dark is an adults-only deck for the trolley game: off by default, never mixed with the family deck',async()=>{
  const {afterDarkGood,afterDarkBad,afterDarkScenes,afterDarkStages}=await import('../fork-after-dark.js');
  const {forkGoodCards,forkBadCards}=await import('../public/fork-cards.js');
  const v2=await import('../creative-expansion-v2.js'), v4=await import('../creative-expansion-v4.js'), v5=await import('../creative-expansion-v5.js');
  const family=new Set([...forkGoodCards,...forkBadCards,...v2.v2ForkGood,...v2.v2ForkBad,...v4.forkGoodV4,...v4.forkBadV4,...v5.forkGoodV5,...v5.forkBadV5]);
  const adult=new Set([...afterDarkGood,...afterDarkBad]);
  assert.ok(afterDarkGood.length>=40&&afterDarkBad.length>=40);
  assert.equal(adult.size,afterDarkGood.length+afterDarkBad.length,'no repeats');
  for(const card of adult){
    assert.ok(!family.has(card),'not in the family deck: '+card);
    assert.ok(card.length>=4&&card.length<=70&&!/[.?!]$/.test(card),'a short phrase that fits the sentence: '+card);
  }
  assert.equal(afterDarkStages.length,3);
  assert.deepEqual(afterDarkStages.map(stage=>stage.kind),['good','bad','good']);
  assert.ok(afterDarkScenes.length>=5);
  await liveServer(async({request,makeRoom})=>{
    const base={playStyle:'teams',teamCount:2,category:'mixed',format:'mixed',count:5,seconds:0};
    // Only the trolley game may ask for it, and only with a real boolean.
    await request('',undefined,{...base,mode:'classic',playStyle:'individual',format:'choice',afterDark:true},400);
    await request('',undefined,{...base,mode:'tracks',afterDark:'yes'},400);
    // Family by default.
    const plain=await makeRoom(4,5);
    assert.equal((await plain.state()).afterDark,undefined);
    await plain.advance();
    const hands=[];
    for(const key of plain.keys){const view=await plain.state(key);assert.equal(view.party.afterDark,false);if(view.party.hand)hands.push(...view.party.hand);}
    assert.ok(hands.length>0&&hands.every(card=>family.has(card)&&!adult.has(card)),'the family room deals family cards only');
    // Switched on by the host.
    const setup=await request('',undefined,{...base,mode:'tracks',afterDark:true},201);
    const path='/'+setup.code;const keys=[];
    for(let i=0;i<4;i++)keys.push((await request(path+'/join',undefined,{name:'Adult '+i},201)).key);
    let now=await request(path,setup.host);
    assert.equal(now.afterDark,true,'the lobby says so');
    await request(path+'/advance',setup.host,{game:now.game,index:now.index,phase:now.phase},204);
    now=await request(path,setup.host);
    assert.equal(now.party.afterDark,true);
    assert.ok(afterDarkScenes.includes(now.party.scene));
    const dealt=[];
    for(const key of keys){const view=await request(path,key);if(view.party.hand){dealt.push(...view.party.hand);assert.equal(view.party.stage.title,afterDarkStages[0].title);}}
    assert.ok(dealt.length>0&&dealt.every(card=>afterDarkGood.includes(card)),'the first placement deals from the After Dark deck');
  });
});
