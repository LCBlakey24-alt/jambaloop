// Compact touch-friendly sketch transport. The server is the authority for every stroke.
// All event listeners are delegated so TV updates do not duplicate controls.
let colour='#17223d';
let weight=4;
let send=()=>Promise.resolve();
let active=null;
let queue=Promise.resolve();
const scaleY=680/1000;
function drawSegment(ctx,stroke){
  const points=stroke.points;if(!points?.length)return;
  ctx.strokeStyle=stroke.colour;ctx.lineWidth=stroke.weight*2.3;
  ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
  ctx.moveTo(points[0][0],points[0][1]*scaleY);
  for(const [x,y] of points.slice(1))ctx.lineTo(x,y*scaleY);
  if(points.length===1)ctx.lineTo(points[0][0]+.1,points[0][1]*scaleY+.1);
  ctx.stroke();
}
export function paintSketchBoard(p){
 const canvas=document.querySelector('#sketch-board');if(!canvas||!p)return;
 if(active?.canvas===canvas)return;
 const key=p.strokes.length+':'+(p.inkVersion??0);
 if(canvas.dataset.sketchKey===key)return;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
 for(const stroke of p.strokes)drawSegment(ctx,stroke);
 canvas.dataset.sketchKey=key;
}
function pointAt(canvas,e){
 const rect=canvas.getBoundingClientRect();
 return [Math.max(0,Math.min(1000,Math.round((e.clientX-rect.left)*1000/rect.width))),
  Math.max(0,Math.min(1000,Math.round((e.clientY-rect.top)*1000/rect.height)))];
}
function pushSegment(item){
 // Sequential delivery preserves stroke order if mobile connection is slow.
 queue=queue.catch(()=>{}).then(()=>send({action:'stroke',colour:item.colour,weight:item.weight,points:item.points}))
  .catch(error=>{const message=document.querySelector('#game-error');if(message)message.textContent='Drawing connection issue: '+error.message;});
}
function flush(){
 if(!active)return;
 const points=active.points;
 if(points.length>1){pushSegment({colour:active.colour,weight:active.weight,points:[...points]});active.points=[points.at(-1)];}
}
export function connectSketchPainter(sender){
 send=sender;
 document.addEventListener('pointerdown',e=>{
  const canvas=e.target.closest?.('canvas[data-sketch-interactive="true"]');
  if(!canvas||active)return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();canvas.setPointerCapture(e.pointerId);
  active={canvas,pointer:e.pointerId,points:[pointAt(canvas,e)],colour,weight,time:Date.now()};
 });
 document.addEventListener('pointermove',e=>{
  if(!active||e.pointerId!==active.pointer)return;
  e.preventDefault();const pt=pointAt(active.canvas,e),last=active.points.at(-1);
  if(pt[0]===last[0]&&pt[1]===last[1])return;
  const ctx=active.canvas.getContext('2d');drawSegment(ctx,{colour:active.colour,weight:active.weight,points:[last,pt]});
  active.points.push(pt);
  if(active.points.length>=24||(active.points.length>=3&&Date.now()-active.time>140)){
    flush();active.time=Date.now();
  }
 });
 const end=e=>{
  if(!active||e.pointerId!==active.pointer)return;
  e.preventDefault();
  if(active.points.length===1)active.points.push(active.points[0]);
  flush();
  try{active.canvas.releasePointerCapture(e.pointerId);}catch{}
  active=null;
 };
 document.addEventListener('pointerup',end);
 document.addEventListener('pointercancel',end);
 document.addEventListener('click',e=>{
  const el=e.target.closest?.('[data-action="sketch-colour"],[data-action="sketch-weight"]');if(!el)return;
  if(el.dataset.action==='sketch-colour')colour=el.dataset.colour;
  if(el.dataset.action==='sketch-weight')weight=Number(el.dataset.weight);
  document.querySelectorAll('.sketch-colour').forEach(b=>{b.classList.toggle('selected',b.dataset.colour===colour);b.setAttribute('aria-pressed',String(b.dataset.colour===colour));});
  document.querySelectorAll('[data-action="sketch-weight"]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.weight)===weight)));
 });
}
