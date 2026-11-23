// Reusable guards for public rooms. Extracted and adapted from the older unmerged PR #2.
export function positiveSetting(name,fallback){
 const raw=process.env[name];
 if(raw===undefined)return fallback;
 if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)<1)
   throw new Error(name+' must be a positive integer.');
 return Number(raw);
}
export function requestBudget(limit,windowMs=60_000,bucketLimit=4096){
 const buckets=new Map();
 function sweep(now=Date.now()){
   for(const [key,value] of buckets)if(value.expires<=now)buckets.delete(key);
 }
 function retryIn(key,now=Date.now()){
   const current=buckets.get(key);
   if(current?.expires>now){
     if(current.count>=limit)return Math.ceil((current.expires-now)/1000);
     current.count++;
     return 0;
   }
   if(buckets.size>=bucketLimit)sweep(now);
   if(buckets.size>=bucketLimit)return Math.ceil(windowMs/1000);
   buckets.set(key,{count:1,expires:now+windowMs});
   return 0;
 }
 return {retryIn,sweep};
}
export function isRoomMember(room,key){
 return key===room.host||room.players.has(key)||room.waiting.has(key);
}
export function normaliseNickname(value){
 if(typeof value!=='string')return '';
 const name=value.normalize('NFC').trim().replace(/\s+/g,' ');
 if(!name||[...name].length>24||/[\p{Cc}\p{Bidi_Control}]/u.test(name))return '';
 return name;
}
export function readAvatar(value){
 if(typeof value!=='string'||value.length>14_000)return;
 const match=/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
 if(!match)return;
 const bytes=Buffer.from(match[1],'base64');
 if(bytes.length<8||bytes.toString('base64')!==match[1])return;
 if(bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff||bytes.readUInt16BE(bytes.length-2)!==0xffd9)return;
 return bytes;
}
