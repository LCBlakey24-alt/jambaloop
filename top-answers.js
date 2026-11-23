import {randomInt} from 'node:crypto';
import {isConnected} from './room-presence.js';
import {questionHistoryId} from './public/question-history.js';
import {v2Topanswers} from './creative-expansion-v2.js';

// Original, subjective questions. Popularity is only measured from this room's actual choices.
// No external audience, prior poll percentages or fabricated survey scores are implied.
const ask=(prompt,a,b,c,d)=>Object.freeze({prompt,options:Object.freeze([a,b,c,d]),historyId:questionHistoryId(prompt)});
export const topAnswersPrompts=Object.freeze([
  ask('Which snack would disappear fastest at a games night?','Popcorn','Crisps','Chocolate','Biscuits'),
  ask('What would be the best prize for winning tonight?','A trophy','Pizza delivery','A mystery box','A day off'),
  ask('Which pet would be funniest as a TV quiz host?','Cat','Parrot','Dog','Hamster'),
  ask('What is the best topping for a movie-night pizza?','Pepperoni','Extra cheese','Mushrooms','Pineapple'),
  ask('Which everyday activity should become an Olympic event?','Making a bed','Parallel parking','Wrapping presents','Loading a dishwasher'),
  ask('Where would you rather spend a surprise free weekend?','A beach','A city break','The mountains','A theme park'),
  ask('What is the worst thing to forget on holiday?','Passport','Phone charger','Toothbrush','Sunglasses'),
  ask('Which superpower would be most useful for commuting?','Teleporting','Flying','Super speed','Stopping time'),
  ask('Which meal would you happily eat every week?','Pizza','Tacos','Curry','Roast dinner'),
  ask('Which animal would make the funniest security guard?','Goose','Penguin','Pug','Llama'),
  ask('What should a robot learn to do first?','Cook dinner','Wash dishes','Fold laundry','Walk the dog'),
  ask('Which weather would you choose for a picnic?','Sunny','Cloudy but dry','A light breeze','Cool and crisp'),
  ask('Which game-night rule would be most fun?','Double points finale','Mystery bonus round','One free lifeline','Swap places once'),
  ask('What would be the most entertaining thing to find in your garden?','A treasure chest','A tiny door','A secret tunnel','A dinosaur footprint'),
  ask('Which drink makes the best party treat?','Hot chocolate','Lemonade','Milkshake','Fruit smoothie'),
  ask('Which fictional setting would be best for a holiday?','A wizard school','A space station','An underwater city','A floating island'),
  ask('What is the best part of a birthday party?','The cake','The games','The presents','Seeing friends'),
  ask('Which chore would you automate forever?','Vacuuming','Washing up','Doing laundry','Cleaning windows'),
  ask('Which item would you put in a time capsule?','A photograph','A newspaper','A favourite toy','A letter'),
  ask('What would make the funniest mascot for a basketball team?','A dancing banana','A giant duck','A disco robot','A superhero potato'),
  ask('What is the best thing to do on a rainy afternoon?','Play board games','Watch a film','Read a book','Bake something'),
  ask('Which food is the hardest to eat neatly?','Spaghetti','A loaded burger','An ice cream cone','A giant taco'),
  ask('Which costume would you choose for fancy dress?','A pirate','A superhero','An astronaut','A dragon'),
  ask('Which room would you improve first in your dream house?','Games room','Kitchen','Garden','Bedroom'),
  ask('Which invention would improve a long car journey most?','Self-driving seats','Instant snacks','Teleport button','Perfect traffic updates'),
  ask('Which musical instrument would be funniest in a rock band?','Tuba','Kazoo','Bagpipes','Banjo'),
  ask('Which animal would be the best detective?','Fox','Owl','Bloodhound','Raven'),
  ask('Which breakfast would you pick on a weekend?','Pancakes','Full English','Cereal','Toast and jam'),
  ask('What would be the best surprise inside a mystery box?','Concert tickets','New gadget','Board game','A holiday voucher'),
  ask('Where would you rather explore for a day?','Ancient castle','Deep cave','Space museum','Hidden forest'),
  ask('What is the funniest object to bring to a meeting?','A rubber duck','A giant spoon','A magic wand','A traffic cone'),
  ask('Which sport would be funniest played underwater?','Basketball','Football','Badminton','Tennis'),
  ask('Which party game requires the most bravery?','Karaoke','Charades','Dance-off','Truth or dare'),
  ask('Which fictional sidekick would you hire?','A talking cat','A tiny dragon','A friendly robot','An invisible ghost'),
  ask('Which smell makes a house feel most welcoming?','Fresh bread','Coffee','Vanilla','Newly cut grass'),
  ask('What would be best in a treehouse?','Slide','Zip wire','Mini kitchen','Secret lookout'),
  ask('Which thing gets lost most often in a home?','Keys','Remote control','Socks','Phone'),
  ask('What would improve waiting in a queue?','Live music','Free snacks','Trivia questions','A moving walkway'),
  ask('Which shop would you most enjoy having to yourself for an hour?','Bookshop','Toy shop','Electronics shop','Sweet shop'),
  ask('Which flavour would make the best cake?','Chocolate','Lemon','Vanilla','Carrot'),
  ask('Which animal would be most surprising as a bus driver?','Giraffe','Octopus','Elephant','Tortoise'),
  ask('What is the best way to celebrate a team victory?','Pizza party','Dance together','Take a photo','Play a rematch'),
  ask('Which thing would you most like to learn in one hour?','New language','Musical instrument','Magic tricks','Cooking skills'),
  ask('What is the best feature in a future phone?','Week-long battery','Perfect camera','Unbreakable screen','Instant translation'),
  ask('Which magical object would you keep?','Invisibility cloak','Bottomless backpack','Flying carpet','Talking mirror'),
  ask('What would be the funniest thing for a penguin to collect?','Sunglasses','Surfboards','Tropical hats','Sandcastle buckets'),
  ask('Which theme park ride would you try first?','Roller coaster','Water ride','Dark ride','Observation wheel'),
  ask('Which food would you take on a picnic?','Sandwiches','Fruit','Sausage rolls','Cakes'),
  ask('Which job would be most exciting for a day?','Pilot','Film director','Wildlife ranger','Astronaut'),
  ask('Where would you want to teleport for lunch?','Italy','Japan','Mexico','Greece'),
  ask('Which board game piece should become enormous?','Dice','Chess knight','Meeple','Playing card'),
  ask('Which household item should have a voice assistant?','Fridge','Oven','Mirror','Wardrobe'),
  ask('What is the best sound to hear when waking up?','Birdsong','Favourite song','Ocean waves','Complete silence'),
  ask('Which imaginary world would be most fun to explore?','Candy kingdom','Sky islands','Crystal caves','Clockwork city'),
  ask('Which sweet treat would you pick at the cinema?','Popcorn','Ice cream','Chocolate buttons','Pick and mix'),
  ask('What should a friendly dragon do for a living?','Firefighter','Baker','Tour guide','Librarian'),
  ask('Which school subject would make the best game show?','Science','History','Geography','Art'),
  ask('What is the best thing to build from cardboard?','Castle','Robot','Race car','Spaceship'),
  ask('Which item would you want on a deserted island?','Water filter','Tent','Fishing kit','Solar charger'),
  ask('Which food should be served at a festival?','Pizza slices','Noodles','Burgers','Churros'),
  ask('Which unusual pet would be the most entertaining?','Miniature dragon','Talking parrot','Capybara','Giant rabbit'),
  ask('Which game-night decoration would look best?','Neon lights','Bunting','Disco ball','Paper lanterns'),
  ask('What would make a new playground amazing?','Giant slide','Climbing maze','Trampoline zone','Splash pad'),
  ask('Which invention would be most popular at school?','Homework robot','Teleporting locker','Self-cleaning shoes','Instant lunch maker'),
  ask('Which fantasy character would make the best chef?','Wizard','Giant','Elf','Dwarf'),
  ask('Which type of museum would be the most interesting?','Space','Dinosaurs','Video games','Ancient history'),
  ask('Which item would you display on a victory podium?','Golden controller','Shiny trophy','Giant medal','Glittering crown'),
  ask('Which weekend hobby would you try first?','Pottery','Rock climbing','Photography','Archery'),
  ask('Which place would be best for a secret hideout?','Treehouse','Underground bunker','Lighthouse','Mountain cabin'),
  ask('Which sound effect would improve a dramatic entrance?','Drum roll','Thunderclap','Air horn','Epic fanfare'),
  ask('Which colour would you paint a giant robot?','Electric blue','Bright red','Neon green','Metallic gold'),
  ask('Which planet would you rather visit on a sci-fi adventure?','Mars','Saturn','Neptune','Venus'),
  ask('What would be the best surprise at the end of a maze?','Treasure','Ice cream','Fireworks','A secret game room'),
  ask('Which talent would you want for one day?','Perfect singing','Amazing drawing','Lightning-fast typing','Professional dancing'),
  ask('Which silly invention would you actually use?','Self-folding clothes','Socks that never vanish','Shoes that tie themselves','A snack-delivery drone'),
  ask('Which place would make the best indoor party?','Bowling alley','Arcade','Cinema','Swimming pool'),
  ask('Which creature would make the coolest team mascot?','Phoenix','Griffin','Unicorn','Dragon'),
  ask('Which game-show round sounds most exciting?','Mystery envelopes','Speed puzzles','Team challenge','Wheel of surprises'),
  ask('Which object would you most want to see float?','A car','A house','A football','A grand piano'),
  ask('Which food should never be a pizza topping?','Jelly beans','Banana','Marshmallows','Pickles'),
  ...v2Topanswers.map(row=>ask(...row)),
]);

export function chooseTopAnswersPrompt(seen=new Set()) {
  const fresh=topAnswersPrompts.filter(p=>!seen.has(p.historyId)&&!seen.has('topanswers:'+p.prompt));
  const pool=fresh.length?fresh:topAnswersPrompts;
  return pool[randomInt(pool.length)];
}

const shuffleChoices=options=>{
  const choices=[...options];
  for(let i=choices.length-1;i>0;i--){
    const j=randomInt(i+1);
    [choices[i],choices[j]]=[choices[j],choices[i]];
  }
  return choices;
};

const eligible=(room,submissions)=>[...room.players.keys()].filter(key=>submissions.has(key)||isConnected(room,key)).length;

export function startTopAnswersRound(room,publish) {
  const original=chooseTopAnswersPrompt(room.seen);
  // Prevent fixed A/B/C/D positions from influencing the group's own survey.
  const prompt={...original,options:shuffleChoices(original.options)};
  room.seen.add('topanswers:'+prompt.prompt);
  room.seen.add(prompt.historyId);
  room.party={type:'topanswers',prompt, votes:new Map(),predictions:new Map(),counts:null,results:null,roundEarned:null};
  room.phase='top-poll';
  publish(room);
}

export function advanceTopAnswers(room,publish) {
  if(room.phase==='top-poll') {
    room.phase='top-guess';
  } else if(room.phase==='top-guess') {
    const p=room.party;
    p.counts=[0,0,0,0];
    for(const option of p.votes.values())p.counts[option]++;
    const max=Math.max(...p.counts);
    const winners=max>0?p.counts.map((count,index)=>count===max?index:-1).filter(index=>index>=0):[];
    p.results={totalVotes:p.votes.size,leaders:winners,mostVotes:max};
    p.roundEarned=new Map();
    for(const [key,choice] of p.predictions) {
      // Based ONLY on votes cast in this room: no invented surveys or percentages.
      const earned=p.counts[choice]*20+(winners.includes(choice)?100:0);
      const player=room.players.get(key);
      if(!player)continue;
      player.score+=earned;
      if(winners.includes(choice))player.wins++;
      p.roundEarned.set(key,earned);
    }
    room.phase='top-reveal';
  } else if(room.phase==='top-reveal') {
    if(room.index+1>=room.count)room.phase='finished';
    else {room.index++;return startTopAnswersRound(room,publish);}
  } else return false;
  publish(room);
  return true;
}

export function submitTopAnswers(room,key,data,publish) {
  const p=room.party;
  if(!p||p.type!=='topanswers')return [409,'Top Answers is not active.'];
  if(data.index!==room.index)return [409,'The Top Answers round has changed.'];
  if(!room.players.has(key))return [403,'Join as a player to vote and predict.'];
  const voting=room.phase==='top-poll'&&data.action==='poll';
  const guessing=room.phase==='top-guess'&&data.action==='guess';
  if(!voting&&!guessing)return [409,'That Top Answers phase has ended.'];
  if(!Number.isInteger(data.option)||data.option<0||data.option>=p.prompt.options.length)
    return [400,'Choose one of the four answers.'];
  const current=voting?p.votes:p.predictions;
  if(current.has(key))return [409,'Your answer is already locked.'];
  current.set(key,data.option);
  if(current.size&&current.size===eligible(room,current))advanceTopAnswers(room,publish);
  else publish(room);
  return [204];
}

export function publicTopAnswers(room,key) {
  const p=room.party;
  if(!p||p.type!=='topanswers')return undefined;
  const revealed=['top-reveal','finished'].includes(room.phase);
  const guessing=room.phase==='top-guess';
  const current=guessing?p.predictions:p.votes;
  const pollResponseTarget=eligible(room,p.votes);
  const guessResponseTarget=eligible(room,p.predictions);
  return {
    type:'topanswers',prompt:p.prompt.prompt,historyId:p.prompt.historyId,
    options:p.prompt.options,
    pollCount:p.votes.size,predictionCount:p.predictions.size,
    pollResponseTarget,guessResponseTarget,
    ownPoll:p.votes.get(key),ownPrediction:p.predictions.get(key),
    pollLocked:p.votes.has(key),predictionLocked:p.predictions.has(key),
    // All aggregate counts and winners stay hidden through both secret stages.
    ...(revealed?{counts:p.counts,results:p.results,earned:p.roundEarned?.get(key)??0}:{}),
  };
}