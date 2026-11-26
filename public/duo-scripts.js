// "Double Act" intros: two original Jambaloop hosts take turns explaining each
// game. Every line is pre-recorded (public/audio/duo/<mode>-<n>.mp3, generated
// by scripts/generate-duo-voices.mjs) and shown word for word as a caption, so
// the game is always playable with sound off. The hosts are original
// characters voiced with ElevenLabs library voices (not impersonations of any
// real presenter). Max matches the existing Jambaloop announcer recordings.
export const hosts = {
  max: { name: 'Max', voice: 'nrD2uNU2IUYtedZegcGx' },   // "Mark Munroe – British Radio Presenter" (upbeat)
  poppy: { name: 'Poppy', voice: 'V0cljQmo7wpx8LTdbqfJ' }, // "Vicky Cowan – Pro British Radio Presenter" (upbeat)
  // Guest commentators (original characters, not impressions of real ones).
  baz: { name: 'Baz', voice: '9rR45HW0vcBmpCbkc4m9' },     // Knockout ringside lead: "Nathaniel – Live Football Commentator"
  clive: { name: 'Clive', voice: '1TE7ou3jyxHsyRehUuMB' }, // Knockout ex-fighter pundit: "Eastend Steve"
  vince: { name: 'Vince', voice: '8oLiG8m8nM6NUEzIvzhz' }, // Quiz Race commentary box: "DJ Wibbly"
};
/** The regular presenters; guests take over for particular games. */
export const presenters = ['max', 'poppy'];
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
    ['poppy', '[cheerfully] And for this one, we\'re handing you over to our ringside commentary team.'],
    ['baz', '[shouting] Thank you, Poppy! What a night we have in store. Three hearts each, and every wrong answer costs one!'],
    ['clive', '[gruff] Lose all three and you\'re out, simple as that. I\'ve seen tougher crowds, mind.'],
    ['baz', '[excited] Last one standing takes the belt. Seconds out!'],
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
    ['poppy', '[cheerfully] Let\'s go up to the commentary box. Vince, over to you!'],
    ['vince', '[fast, excited] Thanks, Poppy! Right answers put your foot down. Wrong answers and passes hit the brakes!'],
    ['max', '[dramatic] Up to twelve drivers. One finish line.'],
    ['vince', '[shouting] It\'s lights out... and away we go!'],
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
  bloodmoon: [
    ['max', '[mysterious] Welcome to Bloodmoon.'],
    ['poppy', '[whispers] Every phone gets a secret role. A few of you are vampires.'],
    ['max', '[cheerfully] Each night, everyone chooses in secret on their own phone. The vampires pick someone to bite.'],
    ['poppy', '[playfully] Each day, you all talk it over, and vote to banish a suspect.'],
    ['max', '[nervous] Poppy, why are you looking at my neck?'],
    ['poppy', '[laughs] No reason. Trust nobody.'],
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

/**
 * Knockout belongs to Baz and Clive: their versions of the round reactions,
 * as short two-man exchanges. Recorded as react-ko-<kind>-<n>.
 */
export const knockoutReactions = {
  nobody: [
    [['baz', '[shouting] Oh! Nobody saw that one coming!'], ['clive', '[chuckles] They\'ve all walked straight into it.']],
    [['baz', '[excited] A hit on every single player!'], ['clive', '[gruff] That\'ll sting in the morning.']],
  ],
  everybody: [
    [['baz', '[impressed] Everybody ducks it! Not a scratch on anyone.'], ['clive', '[gruff] Too easy, that. Make \'em sweat.']],
    [['baz', '[excited] Clean round! Every heart still beating.'], ['clive', '[chuckles] Won\'t last.']],
  ],
  onlyone: [
    [['baz', '[shouting] Only one of them stays on their feet!'], ['clive', '[impressed] Now that is a proper champion\'s answer.']],
  ],
  knockedout: [
    [['baz', '[shouting] And they\'re DOWN! That is a knockout!'], ['clive', '[gruff] Stay down, son. It\'s over.']],
    [['baz', '[excited] Three hearts gone! We\'ve lost one!'], ['clive', '[sighs] Good effort. Shame about the answers.']],
    [['baz', '[shouting] Out for the count! Ring the bell!'], ['clive', '[chuckles] I felt that one from here.']],
  ],
  final: [
    [['baz', '[dramatic] This is it. The final round!'], ['clive', '[gruff] Leave nothing in the corner.']],
  ],
  decider: [
    [['baz', '[serious] This is it. Sixty questions, and they are still standing.'], ['clive', '[gruff, quiet] One final question. Closest guess wins. Last one counts.']],
  ],
  levelup: [
    [['baz', '[excited] Ding ding! New level, and the questions just got harder!'], ['clive', '[gruff] Now we find out who has been coasting.']],
    [['baz', '[shouting] Next level! The gloves are coming off!'], ['clive', '[chuckles] About time. That last lot was a warm-up.']],
  ],
  firstround: [
    [['baz', '[shocked] I do not believe it! Three questions, and it is all over!'], ['clive', '[laughs] I had not even sat down.']],
    [['baz', '[laughs] Well, that happened quickly! The fastest knockout there can be!'], ['clive', '[gruff] Shortest fight I have ever seen. Somebody put the kettle back on.']],
  ],
  halfway: [
    [['baz', '[excited] We\'re halfway through this bout!'], ['clive', '[gruff] And some of \'em are hanging on by a thread.']],
  ],
  noanswers: [
    [['baz', '[surprised] Nobody threw a punch! Not one answer.'], ['clive', '[gruff] You can\'t win it from your stool.']],
  ],
  streak: [
    [['baz', '[excited] Three in a row for somebody. They are on fire!'], ['clive', '[impressed] Float like a butterfly, that one.']],
  ],
};

/** Vince calls Quiz Race from the commentary box. Recorded as react-race-<kind>-<n>. */
export const raceCalls = {
  start: [
    ['vince', '[shouting] Lights out and away we go!'],
    ['vince', '[fast, excited] And they\'re off! What a start!'],
  ],
  lead: [
    ['vince', '[shouting] We have a new leader!'],
    ['vince', '[fast, excited] Oh, what a move! That is the lead changing hands!'],
    ['vince', '[excited] Up the inside, and into first place!'],
  ],
  close: [
    ['vince', '[fast, excited] There is nothing in it at the front. Nothing!'],
    ['vince', '[excited] Wheel to wheel! This is brilliant!'],
  ],
  ram: [
    ['vince', '[shouting] Ooh! Contact! That is a big hit!'],
    ['vince', '[fast, excited] They\'ve been shunted! Is that allowed? It is in this race!'],
    ['vince', '[laughs] A little bump never hurt anyone, ladies and gentlemen!'],
  ],
  boost: [
    ['vince', '[shouting] They\'ve hit the boost! Look at them go!'],
    ['vince', '[fast, excited] Boost deployed! That is a rocket ship!'],
  ],
  finish: [
    ['vince', '[shouting] The chequered flag! What a race!'],
    ['vince', '[shouting] They take the win! Absolutely sensational!'],
  ],
};

/** Every reaction take by recording key, as a list of lines. */
// Bloodmoon: Max and Poppy narrate the public beats only. Nothing here names
// a player or a role; every line is fixed text recorded in advance.
export const bloodmoonCalls = {
  night: [
    [['max', '[whispers] Night falls on the village.'], ['poppy', '[mysterious] Eyes on your own phone, everyone. Make your choice.']],
    [['poppy', '[whispers] The moon is up. Phones close to your chest.'], ['max', '[nervous] And no peeking at your neighbour.']],
  ],
  bitten: [
    [['poppy', '[gasps] Oh no. Somebody did not make it through the night.'], ['max', '[serious] The vampires have struck.']],
    [['max', '[sighs] Dawn breaks, and the village is one short.'], ['poppy', '[sad] They will be missed. Probably.']],
  ],
  safe: [
    [['max', '[relieved] Dawn breaks, and everyone is still here!'], ['poppy', '[playfully] Somebody had a very lucky night.']],
  ],
  day: [
    [['poppy', '[excited] Right, village. Who is a vampire? Talk it over!'], ['max', '[playfully] Accuse, defend, and bluff your socks off.']],
    [['max', '[cheerfully] Time to talk. Who has been acting strangely?'], ['poppy', '[laughs] Apart from Max.']],
  ],
  vote: [
    [['max', '[serious] Time to vote. Who will the village banish?'], ['poppy', '[whispers] Choose on your phone. A tie, and nobody goes.']],
  ],
  caught: [
    [['poppy', '[shouting, excited] They got one! A vampire is out!'], ['max', '[cheerfully] Well played, village.']],
  ],
  wrong: [
    [['max', '[groans] Oh dear. That was not a vampire.'], ['poppy', '[playfully] Somewhere, a vampire is smiling.']],
  ],
  nobody: [
    [['poppy', '[surprised] Nobody is banished!'], ['max', '[nervous] Which means the vampires get another night.']],
  ],
  village: [
    [['max', '[shouting, excited] The village wins! Every vampire is gone!'], ['poppy', '[cheerfully] The sun is up, and you can all sleep soundly.']],
  ],
  vampires: [
    [['poppy', '[dramatic] The vampires win! The night belongs to them.'], ['max', '[laughs] I knew it. I absolutely knew it.']],
  ],
};

export const reactionTakes = Object.fromEntries([
  ...Object.entries(reactions).flatMap(([kind, lines]) => lines.map((line, index) => [`react-${kind}-${index + 1}`, [line]])),
  ...Object.entries(knockoutReactions).flatMap(([kind, takes]) => takes.map((lines, index) => [`react-ko-${kind}-${index + 1}`, lines])),
  ...Object.entries(raceCalls).flatMap(([kind, lines]) => lines.map((line, index) => [`react-race-${kind}-${index + 1}`, [line]])),
  ...Object.entries(bloodmoonCalls).flatMap(([kind, takes]) => takes.map((lines, index) => [`react-blood-${kind}-${index + 1}`, lines])),
]);
