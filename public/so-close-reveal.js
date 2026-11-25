// Shared deterministic reveal clock. The server owns the start and skip state.
export function revealPlan(count){
  const batch=Math.max(1,Math.ceil(count/10));
  const groups=Math.ceil(count/batch);
  return {batch,groups,opening:1000,step:900,suspense:1800,actual:1700,duration:1000+groups*900+1800+1700};
}
export function revealFrame(reveal,now){
  const plan=revealPlan(reveal.count);
  const elapsed=Math.max(0,now-reveal.starts);
  if(reveal.skipped || elapsed>=plan.duration)return {kind:'winner',shown:reveal.count};
  if(elapsed<plan.opening)return {kind:'opening',shown:0};
  const afterOpening=elapsed-plan.opening;
  if(afterOpening<plan.groups*plan.step){
    const group=Math.floor(afterOpening/plan.step);
    return {kind:'guesses',shown:Math.min(reveal.count,(group+1)*plan.batch),from:group*plan.batch};
  }
  const afterGuesses=afterOpening-plan.groups*plan.step;
  return {kind:afterGuesses<plan.suspense?'suspense':'actual',shown:reveal.count};
}
// The server releases the actual value, then the results, at fixed stages.
// A client whose clock runs slightly ahead holds the previous frame until the
// matching state arrives, so it never shows an empty answer or winner.
export function stageFrame(frame,reveal){
  const stage=reveal?.stage??'results';
  if(stage==='guesses'&&(frame.kind==='actual'||frame.kind==='winner'))return {kind:'suspense',shown:reveal.count};
  if(stage==='answer'&&frame.kind==='winner')return {kind:'actual',shown:reveal.count};
  return frame;
}
