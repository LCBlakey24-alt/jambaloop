import {randomInt} from 'node:crypto';
import {makeQuestions, verifiedSourceFor} from './questions.js';
import {questionHistoryId} from './public/question-history.js';
import {wheelCategories} from './public/game-config.js';

// Spotlight Wheel is an original Jambaloop contestant-and-helper game.
// The host is the broadcaster, not a contestant or expert.
const topics = wheelCategories(false).map(([id,name])=>({id,name}));
const pick = values => values[randomInt(values.length)];

export function startSpotlightGame(room,publish) {
  room.spotlightOrder = [...room.players.keys()];
  for(let i=room.spotlightOrder.length-1;i>0;i--){
    const j=randomInt(i+1);
    [room.spotlightOrder[i],room.spotlightOrder[j]]=[room.spotlightOrder[j],room.spotlightOrder[i]];
  }
  room.spotlightTopicTurns = new Map();
  room.spotlightExpertTurns = new Map(room.spotlightOrder.map(key=>[key,0]));
  room.count = room.spotlightOrder.length;
  return startSpotlightRound(room,publish);
}

export function startSpotlightRound(room,publish) {
  const contestantKey=room.spotlightOrder?.[room.index];
  if (!contestantKey || !room.players.has(contestantKey)) {
    room.phase='finished';
    publish(room);
    return;
  }
  room.party = {
    type:'spotlight',
    contestantKey,expertKey:null,category:null,question:null,
    advice:null,choice:null,points:0,expertPoints:0,
    playedCount:room.index+1,
  };
  room.phase='spotlight-ready';
  publish(room);
}

function beginSpotlightQuestion(room,publish) {
  const p=room.party;
  const candidates=[...room.players.keys()].filter(key=>key!==p.contestantKey);
  const fewest=Math.min(...candidates.map(key=>room.spotlightExpertTurns.get(key)||0));
  const fair=candidates.filter(key=>(room.spotlightExpertTurns.get(key)||0)===fewest);
  p.expertKey=pick(fair);
  room.spotlightExpertTurns.set(p.expertKey,(room.spotlightExpertTurns.get(p.expertKey)||0)+1);
  const least=Math.min(...topics.map(topic=>room.spotlightTopicTurns.get(topic.id)||0));
  const category=pick(topics.filter(topic=>(room.spotlightTopicTurns.get(topic.id)||0)===least));
  room.spotlightTopicTurns.set(category.id,(room.spotlightTopicTurns.get(category.id)||0)+1);
  p.category=category;
  p.question=makeQuestions(category.id,1,room.seen,'choice',false)[0];
  if (!p.question) throw new Error('No question is available for this Spotlight Wheel topic.');
  room.seen.add(p.question.prompt);
  room.seen.add(questionHistoryId(p.question.prompt));
  room.phase='spotlight-expert';
  publish(room);
}

function finishSpotlightQuestion(room,publish) {
  const p=room.party;
  const correct=p.question.correct;
  p.points=p.choice===correct?100:0;
  p.expertPoints=p.advice===correct?40:0;
  const contestant=room.players.get(p.contestantKey);
  const expert=room.players.get(p.expertKey);
  if (contestant) {
    contestant.score+=p.points;
    if(p.points) contestant.wins++;
  }
  if (expert) {
    expert.score+=p.expertPoints;
    if(p.expertPoints) expert.wins++;
  }
  room.phase='spotlight-reveal';
  publish(room);
}

export function advanceSpotlight(room,publish) {
  if (room.phase==='spotlight-ready') return beginSpotlightQuestion(room,publish);
  if (room.phase==='spotlight-expert') {
    room.phase='spotlight-answer';
    publish(room);
    return;
  }
  if (room.phase==='spotlight-answer') return finishSpotlightQuestion(room,publish);
  if (room.phase==='spotlight-reveal') {
    if(room.index+1>=room.count) {
      room.phase='finished';
      publish(room);
      return;
    }
    room.index++;
    return startSpotlightRound(room,publish);
  }
}

export function submitSpotlight(room,key,data,publish) {
  if (!room.party || room.party.type!=='spotlight') return [409,'Spotlight Wheel is not active.'];
  if (data.index!==room.index) return [409,'This Spotlight round has changed.'];
  const p=room.party;
  const option=data.option;
  if (room.phase==='spotlight-expert' && data.action==='advice') {
    if(key!==p.expertKey) return [403,'Only the selected expert may offer advice.'];
    if(p.advice!==null) return [409,'Your expert advice is already locked.'];
    if(!Number.isInteger(option)||option<0||option>=p.question.options.length) return [400,'Choose an available answer.'];
    p.advice=option;
    room.phase='spotlight-answer';
    publish(room);
    return [204];
  }
  if (room.phase==='spotlight-answer' && data.action==='answer') {
    if(key!==p.contestantKey) return [403,'Only the current contestant may answer.'];
    if(p.choice!==null) return [409,'Your answer has already been submitted.'];
    if(!Number.isInteger(option)||option<0||option>=p.question.options.length) return [400,'Choose an available answer.'];
    p.choice=option;
    finishSpotlightQuestion(room,publish);
    return [204];
  }
  return [409,'This Spotlight action is no longer available.'];
}

const playerCard=(room,key)=> {
  const player=room.players.get(key);
  return player?{id:player.id,name:player.name,avatar:player.avatar}:undefined;
};

export function publicSpotlight(room,key) {
  const p=room.party;
  if(!p||p.type!=='spotlight') return undefined;
  const reveal=['spotlight-reveal','finished'].includes(room.phase);
  const asking=['spotlight-expert','spotlight-answer','spotlight-reveal','finished'].includes(room.phase);
  const question=asking && p.question ? {
    category:p.category.id,historyId:questionHistoryId(p.question.prompt),
    prompt:p.question.prompt,options:p.question.options,
    ...(reveal?{correct:p.question.correct,source:verifiedSourceFor(p.question.prompt)}:{}),
  }:undefined;
  const adviceVisible=reveal || key===p.expertKey ||
    (key===p.contestantKey && room.phase==='spotlight-answer');
  const answerVisible=reveal || key===p.contestantKey;
  return {
    type:'spotlight',
    contestant:playerCard(room,p.contestantKey),
    expert:p.expertKey?playerCard(room,p.expertKey):undefined,
    roster:room.spotlightOrder.map(id=>playerCard(room,id)).filter(Boolean),
    topic:p.category?.name, question,
    contestantTurn:key===p.contestantKey,
    expertTurn:key===p.expertKey,
    expertSubmitted:p.advice!==null,
    contestantSubmitted:p.choice!==null,
    advice:adviceVisible?p.advice:undefined,
    choice:answerVisible?p.choice:undefined,
    points:reveal?p.points:undefined,
    expertPoints:reveal?p.expertPoints:undefined,
  };
}
