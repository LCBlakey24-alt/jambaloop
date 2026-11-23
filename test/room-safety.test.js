import assert from 'node:assert/strict';
import test from 'node:test';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {isRoomMember,normaliseNickname,positiveSetting,readAvatar,requestBudget} from '../room-safety.js';

test('Room guard limits are configurable and use monotonic, bounded per-key budgets',()=>{
 const key='JAMBALOOP_TEST_MAXROOMS';
 const previous=process.env[key];
 try{
   delete process.env[key];
   assert.equal(positiveSetting(key,128),128);
   process.env[key]='24';
   assert.equal(positiveSetting(key,128),24);
   for(const invalid of ['0','-1','1.5','Infinity','abc','99999999999999999999']){
     process.env[key]=invalid;
     assert.throws(()=>positiveSetting(key,128),/positive integer/);
   }
 }finally{
   if(previous===undefined)delete process.env[key];
   else process.env[key]=previous;
 }
 const budget=requestBudget(2,1000,2);
 assert.equal(budget.retryIn('a',1000),0);
 assert.equal(budget.retryIn('a',1005),0);
 assert.equal(budget.retryIn('a',1010),1);
 assert.equal(budget.retryIn('b',1011),0);
 assert.equal(budget.retryIn('c',1012),1,'Bucket exhaustion must fail closed');
 budget.sweep(2011);
 assert.equal(budget.retryIn('c',2012),0);
});
test('Room nickname and avatar validators reject malformed inputs and disguise attacks',()=>{
 assert.equal(normaliseNickname('  Alice  Alice  '),'Alice Alice');
 assert.equal(normaliseNickname('e\u0301'),'\u00e9');
 assert.equal(normaliseNickname('A\u202eB'),'');
 assert.equal(normaliseNickname('A\nB'),'A B');
 assert.equal(normaliseNickname('X'.repeat(25)),'');
 assert.equal(normaliseNickname({}),'');
 // Minimal marker-compliant JPEG bytes. Full browser decoding is tested separately.
 const jpeg=Buffer.from([0xff,0xd8,0xff,0xe0,0,0,0xff,0xd9]);
 const encoded='data:image/jpeg;base64,'+jpeg.toString('base64');
 assert.deepEqual(readAvatar(encoded),jpeg);
 assert.equal(readAvatar('data:image/png;base64,'+jpeg.toString('base64')),undefined);
 assert.equal(readAvatar('data:image/jpeg;base64,'+Buffer.from('not a jpeg').toString('base64')),undefined);
 assert.equal(readAvatar(encoded+'*'),undefined);
 assert.equal(readAvatar(encoded.replace(/=+$/,'')+'x'),undefined);
 const room={host:'host',players:new Map([['p',{}]]),waiting:new Map([['w',{}]])};
 assert.equal(isRoomMember(room,'host'),true);
 assert.equal(isRoomMember(room,'p'),true);
 assert.equal(isRoomMember(room,'w'),true);
 assert.equal(isRoomMember(room,'other'),false);
});
async function withServer(env,run){
 const proc=spawn(process.execPath,['server.js'],{
   cwd:new URL('..',import.meta.url).pathname,
   env:{...process.env,PORT:'0',PUBLIC_URL:'',...env},
   stdio:['ignore','pipe','pipe'],
 });
 let err='';
 proc.stderr.on('data',chunk=>err+=chunk.toString());
 try{
   const [chunk]=await Promise.race([
     once(proc.stdout,'data'),
     once(proc,'exit').then(([code])=>{throw Error('Server died '+code+' '+err)}),
   ]);
   const site=String(chunk).match(/http:\/\/localhost:\d+/)?.[0];
   assert.ok(site,'Server failed to start: '+err);
   const request=async(path,method='GET',body,key)=>{
     const response=await fetch(site+'/api/rooms'+path,{
       method,
       headers:{'content-type':'application/json',...(key?{'x-game-key':key}:{})},
       ...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)}),
       signal:AbortSignal.timeout(5000),
     });
     const payload=response.headers.get('content-type')?.includes('application/json')?
       await response.json():null;
     return {response,payload};
   };
   await run({request,site});
 }finally{proc.kill();}
}
const settings={mode:'classic',format:'choice',category:'mixed',count:5,seconds:20};
test('Anonymous requests cannot keep idle rooms alive and room creation has a bounded budget',async()=>{
 await withServer({ROOMS_PER_MINUTE:'2',MAX_ROOMS:'3'},async({request})=>{
   const one=await request('','POST',settings);
   assert.equal(one.response.status,201,JSON.stringify(one.payload));
   const room=one.payload;
   assert.equal((await request('/'+room.code,'GET')).response.status,403);
   const two=await request('','POST',settings);
   assert.equal(two.response.status,201);
   const limit=await request('','POST',settings);
   assert.equal(limit.response.status,429);
   assert.ok(Number(limit.response.headers.get('retry-after'))>=1);
   const ok=await request('/'+room.code,'GET',undefined,room.host);
   assert.equal(ok.response.status,200);
 });
});
test('Room photos require a member key; invalid JPEG bytes are rejected; nickname spoofing blocked',async()=>{
 await withServer({},async({request})=>{
   const created=await request('','POST',settings);
   assert.equal(created.response.status,201);
   const {code,host}=created.payload;
   const jpeg=Buffer.from([0xff,0xd8,0xff,0xe0,0,0,0xff,0xd9]);
   const photo='data:image/jpeg;base64,'+jpeg.toString('base64');
   const invalid=await request('/'+code+'/join','POST',{name:'Fake',avatar:'data:image/jpeg;base64,'+Buffer.from('javascript').toString('base64')});
   assert.equal(invalid.response.status,400);
   const joined=await request('/'+code+'/join','POST',{name:'  Ålice  ',avatar:photo});
   assert.equal(joined.response.status,201,JSON.stringify(joined.payload));
   const pkey=joined.payload.key;
   const duplicate=await request('/'+code+'/join','POST',{name:'A\u030alice'});
   assert.equal(duplicate.response.status,409);
   const snapshot=await request('/'+code,'GET',undefined,host);
   assert.equal(snapshot.response.status,200);
   const avatar=snapshot.payload.players.find(x=>x.avatar)?.avatar;
   assert.match(avatar,/^\/api\/rooms\/\d{6}\/avatar\/[a-f0-9]{36}$/);
   const denied=await request('/'+code+'/avatar/'+avatar.split('/').at(-1));
   assert.equal(denied.response.status,403);
   const allowed=await request('/'+code+'/avatar/'+avatar.split('/').at(-1),'GET',undefined,pkey);
   assert.equal(allowed.response.status,200);
   assert.equal(allowed.response.headers.get('cross-origin-resource-policy'),'same-origin');
 });
});
test('Invalid JSON produces a JSON API error rather than HTML',async()=>{
 await withServer({},async({request})=>{
   const result=await request('','POST','{invalid');
   assert.equal(result.response.status,400);
   assert.match(result.payload.error,/format/i);
 });
});
test('Old lobby version cannot override a newer configured game',async()=>{
 await withServer({},async({request})=>{
   const room=await request('','POST',settings);
   assert.equal(room.response.status,201);
   const {code,host}=room.payload;
   const state=(await request('/'+code,'GET',undefined,host)).payload;
   const stale=await request('/'+code+'/configure','POST',{...settings,game:state.game,lobbyVersion:state.lobbyVersion-1},host);
   assert.equal(stale.response.status,409);
   assert.match(stale.payload.error,/Lobby settings changed/);
   const fresh=await request('/'+code+'/configure','POST',{...settings,game:state.game,lobbyVersion:state.lobbyVersion},host);
   assert.equal(fresh.response.status,204);
 });
});


test('One player key owns one live update stream; duplicate tabs get an explicit retry and reconnect succeeds',async()=>{
 await withServer({},async({request,site})=>{
   const create=await request('','POST',settings);
   assert.equal(create.response.status,201);
   const {code,host}=create.payload;
   const joined=await request('/'+code+'/join','POST',{name:'Stream Tester'});
   assert.equal(joined.response.status,201);
   const key=joined.payload.key;
   const origin=site+'/api/rooms/'+code+'/live';
   const headers={'x-game-key':key};
   const forbidden=await fetch(origin);
   assert.equal(forbidden.status,403);
   await forbidden.body?.cancel();
   const controller=new AbortController();
   const primary=await fetch(origin,{headers,signal:controller.signal});
   assert.equal(primary.status,200);
   assert.match(primary.headers.get('content-type'),/ndjson/);
   const duplicate=await fetch(origin,{headers});
   assert.equal(duplicate.status,409);
   assert.ok(Number(duplicate.headers.get('retry-after'))>0);
   await duplicate.body?.cancel();
   // A different room member is still entitled to their own connection.
   const hostController=new AbortController();
   const hostStream=await fetch(origin,{headers:{'x-game-key':host},signal:hostController.signal});
   assert.equal(hostStream.status,200);
   hostController.abort();
   controller.abort();
   let reconnected=false;
   for(let attempt=0;attempt<30;attempt++){
     await new Promise(resolve=>setTimeout(resolve,35));
     const again=await fetch(origin,{headers});
     if(again.status===200){
       reconnected=true;
       await again.body.cancel();
       break;
     }
     assert.equal(again.status,409);
     await again.body?.cancel();
   }
   assert.equal(reconnected,true,'Closing the previous stream must free the player seat');
 });
});
