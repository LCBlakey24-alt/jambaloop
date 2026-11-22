import { modes } from './game-config.js';
import { answerGuide, helpTypes, specialAnswer } from './answer-controls.js';

const summaries = {
  classic: 'Choose a topic, answer on your phone, and compete for the highest score.',
  wheel: 'The host spins for a category before each question. Everyone answers on their phone.',
  board: 'Roll the die from your phone. Its face sets the move, base points and difficulty. The space you land on sets the genre.',
  dice: 'A pair of dice sets the multiplier for the whole room. Totals of 2–6 score ×1, 7–10 score ×2, and 11–12 score ×3.',
  punchline: 'Write a short funny reply. Vote for anonymous entries. Each vote earns its writer 100 points.',
  cards: 'Pick the funniest phrase from your private hand. Vote on anonymous entries to award points.',
  tracks: 'Read a silly dilemma, then choose between two tracks. The TV reveals the group’s vote.',
  bluff: 'Everyone writes a reply, but one phone gets no prompt. The TV shows the replies. Vote for the player you think was bluffing.',
  potato: 'One phone at a time has the potato. Get a question right to pass it. Whoever holds it when the shared two-minute timer ends loses.',
  showdown: 'Join a balanced team and answer on your own phone. Each team scores the average of its players’ points. The highest team score wins.',
  knockout: 'Start with three lives. Wrong or missed answers cost a life. For number questions, the closest guesses keep their lives.',
  quizrace: 'Everyone races on a curving track. Correct answers boost your speed; quick answers boost more. Wrong answers and Pass slow you down. First to finish wins.',
  brain: 'Start with two lives, solve fresh logic puzzles, and climb five, seven or ten increasingly difficult levels. Every wrong or missed answer costs a life. Correct answers are worth more points on higher levels.',
  samepage: 'Everyone privately types an answer to a prompt. Matching answers earn points when revealed together.',
  spotlight: 'The wheel chooses a topic and a player expert. The expert suggests an answer privately, then the contestant makes the final choice. Everyone takes a turn.',
  topanswers: 'First choose the option you truly prefer. Your room anonymously votes to create real popularity data. Then secretly predict the top choice. Earn 20 points per real vote for that answer, plus 100 for choosing an option tied for most votes.',
  rare: 'Each player privately types a valid answer to the same prompt. Rare valid answers win: 200 points if unique, 100 each for an answer chosen by exactly two, 50 each for answers shared by three or more, zero for invalid. The TV host reviews any missing catalogue entries before reveal.',
};

export function explainer(mode, play) {
  const title = modes.find(([id]) => id === mode)[1];
  if(['quizrace','brain','samepage','spotlight','topanswers','rare'].includes(mode))return `<details class="mode-explainer" ${play?'open':''}><summary>How to play ${title}</summary><p>${summaries[mode]}</p></details>`;
  return `<details class="mode-explainer" ${play ? 'open' : ''}><summary>Watch how to play ${title}</summary>
    <video aria-label="How to play ${title}" controls playsinline muted preload="none" poster="/videos/${mode}.jpg"
      ${play && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'autoplay' : ''}>
      <source src="/videos/${mode}.mp4" type="video/mp4">
    </video><p>${summaries[mode]}</p></details>`;
}

export const samples = {
  choice: { type: 'choice', prompt: 'Which of these is a fruit?', options: ['Carrot', 'Apple', 'Celery'], correct: 1 },
  boolean: { type: 'boolean', prompt: 'A triangle has three sides.', options: ['True', 'False'], correct: 0 },
  estimate: { type: 'estimate', prompt: 'How many minutes are in an hour?', unit: 'minutes', min: 0, max: 100, correct: 60 },
  order: { type: 'order', prompt: 'Put these numbers in order, smallest first.', options: ['Eight', 'Two', 'Five'], correct: [1, 2, 0] },
};

export function practiceView(practice, escape) {
  const { sample, draft } = practice;
  const types = helpTypes.map(id => `<button class="button outline small" data-action="practice-type" data-type="${id}" aria-pressed="${sample.type === id}">${answerGuide(id)[0]}</button>`).join('');
  const editor = sample.type === 'choice' || sample.type === 'boolean'
    ? `<div class="practice-choices">${sample.options.map((option, index) => `<button type="button" class="button outline" data-action="practice-choice" data-option="${index}">${option}</button>`).join('')}</div>`
    : specialAnswer(sample, { draft }, escape);
  return `<div class="eyebrow">PRACTICE</div><h2>How to answer</h2><div class="practice-types">${types}</div>
    <p>${answerGuide(sample.type)[1]}</p><div class="practice-demo"><h3>${sample.prompt}</h3>${editor}
    <p class="practice-feedback" role="status">Try it here before the game starts.</p></div>`;
}

const demonstrations = {
  board: [
    ['Your team is up', 'A roll moves your piece and tells you how many points this question is worth.', ['Roll the practice die']],
    ['You rolled a 4', 'Your piece moves four spaces and the landing tile picks the genre. It’s a level 4 question worth four base points.', ['Try an answer']],
  ],
  wheel: [
    ['Start with the wheel', 'The host or captain spins to choose the next category.', ['Spin the practice wheel']],
    ['Science & Nature', 'Everyone gets a question from the category shown on the wheel.', ['Try an answer']],
  ],
  dice: [
    ['Roll for the multiplier', 'The total sets the points multiplier for the room.', ['Roll the practice dice']],
    ['You rolled 2 + 5', 'A total of seven doubles the points for the next correct answer.', ['Try an answer']],
  ],
  bluff: [
    ['Your private prompt', 'Name an awkward thing to carry on a bus. The bluff has to invent a reply without seeing this prompt.', 'write'],
    ['Who was bluffing?', 'Ari wrote “a huge birthday cake”. Sam wrote “at 6 pm”. Casey wrote “a cello”. Tap the reply that seems out of place.', ['Vote Ari', 'Vote Sam', 'Vote Casey']],
    ['Bluff revealed', 'Sam was the bluff. In a real game everyone’s votes decide whether the bluff is caught.', []],
  ],
  punchline: [
    ['Write a punchline', 'What should a dragon never say at a job interview? Try a short reply.', 'write'],
    ['Vote for a favourite', 'The replies are anonymous. The writer of the one you choose would earn 100 points.', ['“I work well under fire.”', '“Your office is delicious.”']],
    ['Vote locked in', 'The TV reveals the names and the points after voting closes.', []],
  ],
  cards: [
    ['Play a phrase', 'The talent show ended with ____. Choose a card from this practice hand.', ['A tap-dancing cactus', 'A parade of shopping trolleys', 'An invisible sandwich']],
    ['Vote for a favourite', 'In the real game you pick one of the other entries. This is a sample ballot.', ['A tiny disco ball', 'A very polite ghost']],
    ['Vote locked in', 'Each vote earns the player who submitted that entry 100 points.', []],
  ],
  tracks: [
    ['Choose a track', 'What should the town’s new festival be?', ['A parade with floats made of cake', 'A silent disco in the supermarket']],
    ['Vote locked in', 'The TV reveals how many people chose each track after voting ends.', []],
  ],
  topanswers: [
    ['Cast your secret vote', 'Which snack would you choose tonight? Everyone privately selects the option they truly prefer.', ['Popcorn','Crisps','Chocolate','Biscuits']],
    ['Make your prediction', 'Now predict which of those four snacks the most people in your room will choose. You cannot see their votes yet.', ['Popcorn','Crisps','Chocolate','Biscuits']],
    ['Real votes revealed', 'In a real game, only the actual votes submitted by your room produce the TV percentages. There are no real poll results in this practice, and no points are awarded here.', []],
  ],
  brain: [
    ['Your first rung', 'Which number comes next? 2, 4, 6, 8, ?', ['10', '12', '16', '18']],
    ['You climbed!', '10 is correct: the pattern adds two each time. Correct answers earn points; two wrong or missed answers eliminate you, but you can still spectate.', []],
  ],
  potato: [
    ['You have the potato!', 'Which animal builds dams? A skip gives you a new question while you keep the potato.', ['Otter', 'Beaver', 'Skip question']],
    ['You passed the potato', 'Beaver is correct. Another player now has the potato. The shared two-minute timer keeps ticking.', []],
  ],
};

export function hasDemo(mode) {
  return Object.hasOwn(demonstrations, mode);
}

export function demoView(practice, vars, escape) {
  const { mode, step, feedback } = practice;
  const name = modes.find(([id]) => id === mode)[1];
  const [heading, description, actions] = demonstrations[mode][step];
  return `<div class="eyebrow">PRACTICE · ${name}</div><h2 id="dialog-title">${heading}</h2>
    <div class="practice-scene" style="${vars}"><p>${feedback ? escape(feedback) : description}</p>
      ${actions === 'write' ? '<form id="demo-form"><label>Your practice reply<textarea name="reply" maxlength="100" rows="2" required></textarea></label><button class="button primary" type="submit">Lock in reply</button></form>'
        : `<div class="practice-choices">${actions.map((label, index) => `<button class="button outline" data-action="demo-answer" data-option="${index}">${label}</button>`).join('')}</div>`}
      ${actions.length === 0 ? '<button class="button outline small" data-action="demo-reset">Try again</button>' : ''}
    </div><p class="lobby-rule">This practice stays on your device and scores no points.</p>`;
}
