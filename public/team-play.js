import { teams, modes } from './game-config.js';

// Modes whose existing rules produce meaningful points, survival or a finish.
// Bluff, Hot Potato and Fork in the Tracks are outcome/vote games; a team
// win-condition needs a separate rules pass rather than simply adding colours.
export const teamPlayModes = Object.freeze([
  'classic','wheel','board','dice','knockout','punchline','cards','quizrace','showdown',
]);
export const defaultPlayStyle = mode => ['board','showdown'].includes(mode) ? 'teams' : 'individual';
export function validPlayStyle(mode,style) {
  return modes.some(([id])=>id===mode) &&
    (style==='individual' || (style==='teams' && teamPlayModes.includes(mode)));
}
export function requiredPlayers(mode,style,teamCount,minimum) {
  return style==='teams' ? Math.max(minimum,teamCount) : minimum;
}

// Deterministic balanced round-robin allocation. Stable by lobby join order.
// For Board Race Individual, each person receives a separate pawn (max four).
export function teamAssignments(entries, mode, style, teamCount, {allowUnfilled=false} = {}) {
  const players=[...entries];
  if (!validPlayStyle(mode,style)) throw new Error('This play style is not available for this game.');
  const boardSolo=mode==='board' && style==='individual';
  const grouped=style==='teams' || boardSolo;
  if (!grouped) return {groups:[],ids:new Map()};
  const total=boardSolo ? players.length : teamCount;
  if (!Number.isInteger(total) || total<1 || total>4 || (style==='teams' && total<2)) {
    throw new Error('Choose 2 to 4 teams, or up to four individual board racers.');
  }
  if (!allowUnfilled && players.length<total) throw new Error('At least one player must join each team.');
  const ids=new Map();
  const groups=Array.from({length:total},(_,index)=>({
    id:index,
    name:boardSolo ? players[index][1].name : teams[index][0],
    color:teams[index][1],
    size:0,score:0,roundPoints:0,
    members:[],
    ...(mode==='board'?{position:0,pathChoice:null}:{}),
  }));
  players.forEach(([key,player],index)=>{
    const id=index%total;
    ids.set(key,id);
    groups[id].size+=1;
    groups[id].members.push({id:player.id,name:player.name});
  });
  return {groups,ids};
}

export function refreshGroupScores(room) {
  if (!room.teams?.length || room.mode==='board' || room.mode==='quizrace') return;
  const byGroup=new Map(room.teams.map(t=>[t.id,{sum:0,n:0}]));
  for(const player of room.players.values()) {
    const data=byGroup.get(player.team);
    if (!data) continue;
    data.sum+=player.score;
    data.n++;
  }
  for(const group of room.teams) {
    const data=byGroup.get(group.id);
    group.score=data?.n ? Math.round(data.sum/data.n*100)/100 : 0;
  }
}
