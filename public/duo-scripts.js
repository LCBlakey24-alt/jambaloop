// "Double Act" intros: two original Jambaloop hosts take turns explaining each
// game. Every line is pre-recorded (public/audio/duo/<mode>-<n>.mp3, generated
// by scripts/generate-duo-voices.mjs) and shown word for word as a caption, so
// the game is always playable with sound off. The hosts are original
// characters voiced with ElevenLabs library voices (not impersonations of any
// real presenter). Max matches the existing Jambaloop announcer recordings.
export const hosts = {
  max: { name: 'Max', voice: 'nrD2uNU2IUYtedZegcGx' },   // "Mark Munroe – British Radio Presenter" (upbeat)
  poppy: { name: 'Poppy', voice: 'V0cljQmo7wpx8LTdbqfJ' }, // "Vicky Cowan – Pro British Radio Presenter" (upbeat)
};
/** Model and settings for an upbeat, matching double act. */
export const duoVoice = { model: 'eleven_v4', settings: { stability: .35, similarity_boost: .8, style: .45, use_speaker_boost: true } };

export const duoIntros = {
  classic: [
    ['max', 'Good evening, and welcome to Classic Quiz!'],
    ['poppy', 'Pick a topic, answer on your phone, and the faster you get it right, the more you score.'],
    ['max', 'No pressure, but I have already polished the trophy.'],
    ['poppy', 'He polishes it every night. Let\'s play!'],
  ],
  wheel: [
    ['poppy', 'Roll up, roll up, it\'s Spin the Wheel!'],
    ['max', 'Before every question, we spin for a brand new category.'],
    ['poppy', 'Science, sport, history... the wheel decides, not us.'],
    ['max', 'It never listens to me anyway. Spin it!'],
  ],
  board: [
    ['max', 'Welcome to Board Race!'],
    ['poppy', 'Roll the dice, land on a square, and answer its question to keep moving.'],
    ['max', 'Choose your path wisely. Some shortcuts are worth it...'],
    ['poppy', '...and some really are not. First to the finish wins!'],
  ],
  dice: [
    ['poppy', 'Welcome to the Dice Rally salon.'],
    ['max', 'Two dice set the points multiplier for every question.'],
    ['poppy', 'A lucky roll makes it bigger, but only a right answer cashes it in.'],
    ['max', 'So be clever, and maybe a little bit lucky.'],
  ],
  knockout: [
    ['max', 'Ladies and gentlemen, it\'s Knockout!'],
    ['poppy', 'Everyone starts with three hearts. A wrong or missed answer costs you one.'],
    ['max', 'Lose all three, and you are out of the ring.'],
    ['poppy', 'Last player standing takes the title. Gloves on!'],
  ],
  punchline: [
    ['poppy', 'Welcome to Punchline Party!'],
    ['max', 'You get a silly prompt. Write the funniest reply you can, on your phone.'],
    ['poppy', 'Then everyone votes for their favourite. Anonymously.'],
    ['max', 'So if nobody laughs at yours, nobody needs to know.'],
  ],
  cards: [
    ['max', 'It\'s Fill the Blank!'],
    ['poppy', 'You\'ve got a private hand of ridiculous phrase cards.'],
    ['max', 'Play the one that finishes the sentence best, then vote for the winner.'],
    ['poppy', 'We don\'t judge. The voters do.'],
  ],
  tracks: [
    ['poppy', 'All aboard Fork in the Tracks!'],
    ['max', 'Two teams pick cards: good ones for their own track, sabotage for the other.'],
    ['poppy', 'Then the Trolley Driver pulls the lever. Everyone gets a turn driving.'],
    ['max', 'Mind the gap, everybody!'],
  ],
  bluff: [
    ['max', 'Welcome to Spot the Bluff.'],
    ['poppy', 'Everyone sees the secret prompt and writes an answer. Everyone except one player.'],
    ['max', 'They are bluffing. Read the replies and vote for the faker.'],
    ['poppy', 'And if the bluffer is you... act natural.'],
  ],
  potato: [
    ['poppy', 'It\'s Hot Potato, and things are heating up!'],
    ['max', 'Whoever holds the potato gets a question. Answer it right to pass it on.'],
    ['poppy', 'There is one shared two minute timer.'],
    ['max', 'Do not be holding it when time runs out!'],
  ],
  quizrace: [
    ['max', 'Start your engines! It\'s Quiz Race!'],
    ['poppy', 'Right answers speed you up. Wrong answers and passes slow you down.'],
    ['max', 'Up to twelve racers. One finish line.'],
    ['poppy', 'Put your foot down!'],
  ],
  showdown: [
    ['poppy', 'Welcome to Team Showdown!'],
    ['max', 'You play in teams, but everyone answers on their own phone.'],
    ['poppy', 'Each round, your team scores the average of its players\' points.'],
    ['max', 'So no passengers! Let the showdown begin.'],
  ],
  samepage: [
    ['max', 'Welcome to Same Page.'],
    ['poppy', 'Read the prompt, and write the first thing that pops into your head.'],
    ['max', 'Every player who writes the same as you earns you points.'],
    ['poppy', 'Great minds think alike. Let\'s see if yours do.'],
  ],
  spotlight: [
    ['poppy', 'Welcome to Spotlight Wheel!'],
    ['max', 'Everyone takes a turn as the contestant. The wheel picks a topic, and an expert.'],
    ['poppy', 'Your expert suggests an answer first. Trust them, or go it alone.'],
    ['max', 'Either way, the spotlight is on you.'],
  ],
  brain: [
    ['max', 'Welcome to Brain Ladder.'],
    ['poppy', 'Every level is an original puzzle, and each one is tougher than the last.'],
    ['max', 'You have two lives. A wrong or missed answer costs one.'],
    ['poppy', 'Think carefully, and see how high you can climb.'],
  ],
  topanswers: [
    ['poppy', 'Welcome to Top Answers!'],
    ['max', 'First, vote for the answer you genuinely like best.'],
    ['poppy', 'Then predict what most of this room picked.'],
    ['max', 'No mystery survey. Just you lot!'],
  ],
  rare: [
    ['max', 'Welcome to Rare Find.'],
    ['poppy', 'Give a correct answer you think nobody else will think of.'],
    ['max', 'A unique answer scores the most. The more people match you, the less you score.'],
    ['poppy', 'So dig deep, and find a gem.'],
  ],
  sketch: [
    ['poppy', 'Welcome to Sketch Sprint!'],
    ['max', 'One player gets a secret prompt, and draws it on their phone.'],
    ['poppy', 'Everyone else watches it appear on the TV, and races to guess it.'],
    ['max', 'Last time I drew a cat, it looked like a cloud.'],
  ],
  soclose: [
    ['max', 'Welcome to So Close.'],
    ['poppy', 'Every answer is a number. Scroll to your best estimate and lock it in.'],
    ['max', 'Over or under doesn\'t matter. Closest wins, and an exact answer scores double.'],
    ['poppy', 'Close enough really is good enough!'],
  ],
};

/** Games whose Double Act clips are committed and playable. */
export const recordedDuos = new Set([]);

export const duoClip = (mode, index) => `/audio/duo/${mode}-${index + 1}.mp3`;
export const hasDuo = mode => recordedDuos.has(mode) && Boolean(duoIntros[mode]);
