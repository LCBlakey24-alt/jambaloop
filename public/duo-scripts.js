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
    ['max', '[warmly] Good evening, and welcome to Classic Quiz!'],
    ['poppy', '[excited] Pick a topic, answer on your phone, and the faster you get it right, the more you score.'],
    ['max', '[proudly] No pressure, but I have already polished the trophy.'],
    ['poppy', '[laughs] He polishes it every night. Let\'s play!'],
  ],
  wheel: [
    ['poppy', '[excited] Roll up, roll up, it\'s Spin the Wheel!'],
    ['max', '[cheerfully] Before every question, we spin for a brand new category.'],
    ['poppy', '[playfully] Science, sport, history... the wheel decides, not us.'],
    ['max', '[sighs] It never listens to me anyway. Spin it!'],
  ],
  board: [
    ['max', '[excited] Welcome to Board Race!'],
    ['poppy', '[cheerfully] Roll the dice, land on a square, and answer its question to keep moving.'],
    ['max', '[mischievously] Choose your path wisely. Some shortcuts are worth it...'],
    ['poppy', '[laughs] ...and some really are not. First to the finish wins!'],
  ],
  dice: [
    ['poppy', '[smoothly] Welcome to the Dice Rally salon.'],
    ['max', '[cheerfully] Two dice set the points multiplier for every question.'],
    ['poppy', '[playfully] A lucky roll makes it bigger, but only a right answer cashes it in.'],
    ['max', '[warmly] So be clever, and maybe a little bit lucky.'],
  ],
  knockout: [
    ['max', '[excited] Ladies and gentlemen, it\'s Knockout!'],
    ['poppy', '[playfully] Everyone starts with three hearts. A wrong or missed answer costs you one.'],
    ['max', '[dramatic] Lose all three, and you are out of the ring.'],
    ['poppy', '[laughs] Last player standing takes the title. Gloves on!'],
  ],
  punchline: [
    ['poppy', '[excited] Welcome to Punchline Party!'],
    ['max', '[cheerfully] You get a silly prompt. Write the funniest reply you can, on your phone.'],
    ['poppy', '[whispers] Then everyone votes for their favourite. Anonymously.'],
    ['max', '[laughs] So if nobody laughs at yours, nobody needs to know.'],
  ],
  cards: [
    ['max', '[excited] It\'s Fill the Blank!'],
    ['poppy', '[mischievously] You\'ve got a private hand of ridiculous phrase cards.'],
    ['max', '[cheerfully] Play the one that finishes the sentence best, then vote for the winner.'],
    ['poppy', '[laughs] We don\'t judge. The voters do.'],
  ],
  tracks: [
    ['poppy', '[excited] All aboard Fork in the Tracks!'],
    ['max', '[cheerfully] Two teams pick cards: good ones for their own track, sabotage for the other.'],
    ['poppy', '[playfully] Then the Trolley Driver pulls the lever. Everyone gets a turn driving.'],
    ['max', '[laughs] Mind the gap, everybody!'],
  ],
  bluff: [
    ['max', '[whispers] Welcome to Spot the Bluff.'],
    ['poppy', '[curious] Everyone sees the secret prompt and writes an answer. Everyone except one player.'],
    ['max', '[dramatic] They are bluffing. Read the replies and vote for the faker.'],
    ['poppy', '[mischievously] And if the bluffer is you... act natural.'],
  ],
  potato: [
    ['poppy', '[excited] It\'s Hot Potato, and things are heating up!'],
    ['max', '[cheerfully] Whoever holds the potato gets a question. Answer it right to pass it on.'],
    ['poppy', '[nervously] There is one shared two minute timer.'],
    ['max', '[dramatic] Do not be holding it when time runs out!'],
  ],
  quizrace: [
    ['max', '[excited] Start your engines! It\'s Quiz Race!'],
    ['poppy', '[cheerfully] Right answers speed you up. Wrong answers and passes slow you down.'],
    ['max', '[dramatic] Up to twelve drivers. One finish line.'],
    ['poppy', '[excited] Put your foot down!'],
  ],
  showdown: [
    ['poppy', '[excited] Welcome to Team Showdown!'],
    ['max', '[cheerfully] You play in teams, but everyone answers on their own phone.'],
    ['poppy', '[playfully] Each round, your team scores the average of its players\' points.'],
    ['max', '[excited] So no passengers! Let the showdown begin.'],
  ],
  samepage: [
    ['max', '[warmly] Welcome to Same Page.'],
    ['poppy', '[cheerfully] Read the prompt, and write the first thing that pops into your head.'],
    ['max', '[playfully] Every player who writes the same as you earns you points.'],
    ['poppy', '[laughs] Great minds think alike. Let\'s see if yours do.'],
  ],
  spotlight: [
    ['poppy', '[dramatic] Welcome to Spotlight Wheel!'],
    ['max', '[cheerfully] Everyone takes a turn as the contestant. The wheel picks a topic, and an expert.'],
    ['poppy', '[playfully] Your expert suggests an answer first. Trust them, or go it alone.'],
    ['max', '[warmly] Either way, the spotlight is on you.'],
  ],
  brain: [
    ['max', '[curious] Welcome to Brain Ladder.'],
    ['poppy', '[cheerfully] Every level is an original puzzle, and each one is tougher than the last.'],
    ['max', '[dramatic] You have two lives. A wrong or missed answer costs one.'],
    ['poppy', '[warmly] Think carefully, and see how high you can climb.'],
  ],
  topanswers: [
    ['poppy', '[excited] Welcome to Top Answers!'],
    ['max', '[cheerfully] First, vote for the answer you genuinely like best.'],
    ['poppy', '[curious] Then predict what most of this room picked.'],
    ['max', '[laughs] No mystery survey. Just you lot!'],
  ],
  rare: [
    ['max', '[curious] Welcome to Rare Find.'],
    ['poppy', '[cheerfully] Give a correct answer you think nobody else will think of.'],
    ['max', '[playfully] A unique answer scores the most. The more people match you, the less you score.'],
    ['poppy', '[warmly] So dig deep, and find a gem.'],
  ],
  sketch: [
    ['poppy', '[excited] Welcome to Sketch Sprint!'],
    ['max', '[cheerfully] One player gets a secret prompt, and draws it on their phone.'],
    ['poppy', '[playfully] Everyone else watches it appear on the TV, and races to guess it.'],
    ['max', '[sighs] Last time I drew a cat, it looked like a cloud.'],
  ],
  soclose: [
    ['max', '[warmly] Welcome to So Close.'],
    ['poppy', '[cheerfully] Every answer is a number. Scroll to your best estimate and lock it in.'],
    ['max', '[playfully] Over or under doesn\'t matter. Closest wins, and an exact answer scores double.'],
    ['poppy', '[laughs] Close enough really is good enough!'],
  ],
};

/** The words as spoken: mood tags such as [laughs] guide the voice, not the caption. */
export const spoken = text => text.replace(/\[[^\]]*\]\s*/g, '').replace(/\s{2,}/g, ' ').trim();



/**
 * The Jambaloop welcome: Max and Poppy introduce the whole night once the
 * room is open. Each line names the scene the TV shows while it is spoken.
 */
export const welcomeScript = [
  ['poppy', '[excited] Hello, hello! Welcome to Jambaloop!', 'hello'],
  ['max', '[warmly] I\'m Max.', 'hello'],
  ['poppy', '[cheerfully] And I\'m Poppy. We\'re your hosts tonight!', 'hello'],
  ['max', '[conversational] Here\'s how it works. The TV is the big screen... and your phone is your controller.', 'devices'],
  ['poppy', '[laughs] No app to download, and no remote to lose down the back of the sofa.', 'devices'],
  ['max', '[curious] Anyone still joining? Scan the QR code, or type the room code into Jambaloop on your phone.', 'join'],
  ['poppy', '[cheerfully] Our captain picks the games. Swipe through them on your phone, and the TV follows along.', 'captain'],
  ['max', '[mock serious] Choose wisely, captain. [chuckles] That power will go straight to your head.', 'captain'],
  ['poppy', '[playfully] Questions pop up on the TV, and you answer on your phone. Quick AND correct scores best.', 'play'],
  ['max', '[excited] We\'ve got quizzes, races, drawing, bluffing... [laughs] and a potato that will NOT stop ticking.', 'shows'],
  ['poppy', '[warmly] Every game has its own look, and we\'ll explain each one before you play.', 'shows'],
  ['max', '[laughs] Right, that\'s quite enough from us. Captain... over to you!', 'ready'],
  ['poppy', '[excited] Let\'s PLAY!', 'ready'],
];

/** When the captain skips the welcome: one of these, picked at random. */
export const skipQuips = [
  [['max', '[surprised] Oh! Looks like this lot already know what they\'re doing.'], ['poppy', '[laughs] Fair enough. Good luck, everyone. Give it a go!']],
  [['poppy', '[mock offended] Skipping us? We had a whole dance routine!'], ['max', '[chuckles] We\'ll save it for next time. Have fun, everyone!']],
  [['max', '[impressed] Straight to the action. I like it.'], ['poppy', '[cheerfully] Off you go then, captain. Good luck!']],
];

/** When everyone connected has played before: the hosts offer a choice. */
export const welcomeBack = [
  ['poppy', '[delighted] Well, well! Look who it is. Everyone here has played before!', 'back'],
  ['max', '[playfully] So... do you want the full tour again, or shall we just crack on?', 'back'],
];

/**
 * Short reactions during quiz rounds, one host at a time. Recorded as
 * react-<kind>-<n>. They never name players or read anything players typed.
 */
export const reactions = {
  nobody: [
    ['max', '[surprised] Ooh. Nobody got that one!'],
    ['poppy', '[laughs] Not a single one of you! Moving swiftly on.'],
    ['max', '[sighs] A clean sweep... of wrong answers.'],
  ],
  everybody: [
    ['poppy', '[impressed] Everybody got that one! Too easy?'],
    ['max', '[delighted] A full house! Well done, all of you.'],
    ['poppy', '[excited] Every single one of you! Show-offs.'],
  ],
  onlyone: [
    ['max', '[impressed] Only one of you got that. Take a bow!'],
    ['poppy', '[whispers] Just one correct answer. [normal] Somebody\'s been revising.'],
    ['max', '[chuckles] One of you knew it. The rest of you... did not.'],
  ],
  streak: [
    ['poppy', '[excited] Somebody is on a roll! That\'s three in a row.'],
    ['max', '[impressed] Three in a row for someone. Can anybody stop them?'],
  ],
  noanswers: [
    ['max', '[curious] Hello? Anyone there? Nobody answered that one.'],
    ['poppy', '[laughs] No answers at all. Were you all making tea?'],
  ],
  final: [
    ['poppy', '[dramatic] Last question! It all comes down to this.'],
    ['max', '[excited] Final question, everybody. Make it count!'],
  ],
  knockedout: [
    ['max', '[dramatic] And down they go! We have a knockout.'],
    ['poppy', '[mock sad] Oh no! Somebody is out of hearts.'],
  ],
  halfway: [
    ['poppy', '[cheerfully] That\'s the halfway point. Still anybody\'s game!'],
    ['max', '[warmly] Halfway there. Plenty of time to catch up.'],
  ],
};
