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
  // Bloodmoon's narrator: an original character with a Transylvanian accent, not an impression of any actor or film.
  vesper: { name: 'Count Vesper', voice: '5BZv9Z02hAMUmkkcd5Hj' }, // "Paul – Engaging, Friendly and Mysterious" (Romanian)
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
    ['poppy', '[nervous] This next one is not really our sort of game.'],
    ['max', '[whispers] So we are handing over to a friend. From Transylvania.'],
    ['vesper', '[slow, ominous] Good evening. I am Count Vesper. Most of you are villagers. A few... are vampires.'],
    ['poppy', '[nervous] And, um... what happens at night?'],
    ['vesper', '[whispers] At night, you choose in silence. By day, you talk... and vote to banish one of your own. Trust no one.'],
  ],
  wayoff: [
    ['poppy', '[excited] Welcome to Way Off!'],
    ['max', '[cheerfully] Everyone guesses the same number, and we can all watch your guesses turning on the big screen.'],
    ['poppy', '[playfully] When the answer lands, whoever is furthest away is out.'],
    ['max', '[laughs] So you do not have to be right. You just cannot be the most wrong.'],
  ],
  catchup: [
    ['max', '[excited] Welcome to Catch Up!'],
    ['poppy', '[cheerfully] The room splits in two. One side has sixty seconds to answer as many questions as it can.'],
    ['max', '[playfully] Then the other side gets sixty seconds to beat that number.'],
    ['poppy', '[laughs] And a wrong answer freezes your whole side. So no wild guessing, Max.'],
  ],
  shade: [
    ['poppy', '[excited] Welcome to Shade, the game of colourful language!'],
    ['max', '[cheerfully] One of you gets a secret colour, and describes it in a single word.'],
    ['poppy', '[playfully] Everyone else hunts for it on the big board. The closer you land, the more you score.'],
    ['max', '[laughs] And no, you cannot just say "blue". Well. You can. Good luck with that.'],
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
    ['poppy', '[gasps] Oh! That one fooled the lot of you.'],
    ['max', "[chuckles] Zero. Nil. Nothing. We'll say no more about it."],
  ],
  everybody: [
    ['poppy', '[impressed] Everybody got that one! Too easy?'],
    ['max', '[delighted] A full house! Well done, all of you.'],
    ['poppy', '[excited] Every single one of you! Show-offs.'],
    ['max', "[laughs] All correct! Right, they're getting harder."],
    ['poppy', '[proudly] Top marks all round. Look at you all!'],
  ],
  onlyone: [
    ['max', '[impressed] Only one of you got that. Take a bow!'],
    ['poppy', '[whispers] Just one correct answer. [normal] Somebody\'s been revising.'],
    ['max', '[chuckles] One of you knew it. The rest of you... did not.'],
    ['poppy', '[impressed] One lonely correct answer. Well played, you.'],
    ['max', '[amused] A single right answer. Everyone else, have a quiet word with yourselves.'],
  ],
  streak: [
    ['poppy', '[excited] Somebody is on a roll! That\'s three in a row.'],
    ['max', '[impressed] Three in a row for someone. Can anybody stop them?'],
    ['max', "[excited] Somebody's flying! That's another one in a row."],
    ['poppy', '[playfully] We have a hot streak. Somebody stop them, please.'],
  ],
  noanswers: [
    ['max', '[curious] Hello? Anyone there? Nobody answered that one.'],
    ['poppy', '[laughs] No answers at all. Were you all making tea?'],
    ['poppy', '[curious] Nothing? Not even a guess? A guess costs nothing!'],
    ['max', "[chuckles] Complete silence. I'll take that as a no, then."],
  ],
  final: [
    ['poppy', '[dramatic] Last question! It all comes down to this.'],
    ['max', '[excited] Final question, everybody. Make it count!'],
    ['max', '[dramatic] This is it. One question left.'],
    ['poppy', '[excited] Last one! Everything to play for.'],
  ],
  knockedout: [
    ['max', '[dramatic] And down they go! We have a knockout.'],
    ['poppy', '[mock sad] Oh no! Somebody is out of hearts.'],
    ['poppy', "[gasps] And that's a knockout! Thank you for playing."],
    ['max', '[sighs] Out of hearts. It happens to the best of us.'],
  ],
  halfway: [
    ['poppy', '[cheerfully] That\'s the halfway point. Still anybody\'s game!'],
    ['max', '[warmly] Halfway there. Plenty of time to catch up.'],
    ['max', "[cheerfully] Half-time! No oranges, I'm afraid."],
    ['poppy', "[warmly] Halfway. If you're behind, now's the moment."],
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
  blocked: [
    ['vince', "[shouting] Shield up! That ram bounces straight off!"],
    ['vince', "[laughs] Denied! Nothing gets through that shield."],
  ],
  turbo: [
    ['vince', "[fast, excited] Three in a row! That is a turbo earned!"],
    ['vince', "[excited] Somebody knows their stuff. Extra boost in the tank!"],
  ],
  sprint: [
    ['vince', "[shouting] Final sprint! Every right answer counts double... well, nearly!"],
    ['vince', "[fast, excited] Into the last stretch we go! This is where it's won!"],
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
  roles: [
    ['vesper', '[slow, ominous] Look at your phone. Learn what you are. [whispers] And tell no one.'],
    ['vesper', '[grave] Your fate has been dealt. Keep it close.'],
  ],
  night: [
    ['vesper', '[slow, ominous] Night falls on the village. [whispers] Make your choice.'],
    ['vesper', '[whispers] The moon rises. Eyes on your own phone.'],
    ['vesper', '[ominous] Darkness. And something in it is hungry.'],
    ['vesper', '[slow] Another night. [whispers] Choose carefully. Someone is choosing you.'],
    ['vesper', '[whispers] Hush now. The village sleeps. Not all of it.'],
  ],
  bitten: [
    ['vesper', '[grave] Dawn breaks. And one of you... did not wake.'],
    ['vesper', '[slow, ominous] The vampires have fed. The village is one fewer.'],
    ['vesper', '[sighs] Another empty house. How sad. [whispers] How delicious.'],
    ['vesper', '[grave] Morning comes, but not for everyone.'],
  ],
  safe: [
    ['vesper', '[surprised] Dawn. And every one of you still breathes. [ominous] For now.'],
    ['vesper', '[slow] Nobody was taken in the night. Someone was well guarded.'],
    ['vesper', '[amused] A quiet night. The vampires go hungry. They will not like that.'],
  ],
  day: [
    ['vesper', '[ominous] The sun is up. Now... who among you is a vampire?'],
    ['vesper', '[slow] Talk. Accuse. Defend yourselves. [whispers] One of you is lying.'],
    ['vesper', '[grave] Look around the fire. Somebody here is not what they seem.'],
    ['vesper', '[amused] Such friendly faces. Which one has blood on its teeth?'],
  ],
  vote: [
    ['vesper', '[grave] It is time. Vote. Who will the village banish?'],
    ['vesper', '[slow, ominous] Cast your vote on your phone. A tie, and nobody leaves.'],
    ['vesper', '[whispers] Decide. And pray that you are right.'],
  ],
  caught: [
    ['vesper', '[surprised] A vampire! You have caught one. [ominous] How unfortunate.'],
    ['vesper', '[grave] Banished. And it was a vampire. Well done, village.'],
    ['vesper', '[slow] One of mine is gone. You are sharper than you look.'],
  ],
  wrong: [
    ['vesper', '[sighs] Banished. But that was no vampire. [amused] What a pity.'],
    ['vesper', '[slow, ominous] An innocent, cast out. The vampires are grateful.'],
    ['vesper', '[whispers] Wrong. Somewhere in this room, somebody is smiling.'],
  ],
  nobody: [
    ['vesper', '[amused] Nobody is banished. The village cannot agree.'],
    ['vesper', '[ominous] No decision. Then night will decide for you.'],
  ],
  onevampire: [
    ['vesper', '[grave] One vampire remains. [whispers] Find it, before it finds you.'],
  ],
  village: [
    ['vesper', '[sighs] The last vampire is gone. The village wins. [slow] Sleep well. If you can.'],
    ['vesper', '[grave] It is over. The sun rises on a safe village. I shall be going.'],
  ],
  vampires: [
    ['vesper', '[laughs darkly] The vampires win. The night belongs to us.'],
    ['vesper', '[slow, ominous] Too late, village. There are more of us than of you. [whispers] Goodnight.'],
  ],
};

/**
 * Board Race: Max and Poppy call the public moments on the board. They never
 * say what a 50/50 removed. Recorded as react-board-<kind>-<n>.
 */
export const boardCalls = {
  corner: [
    ['poppy', "[excited] Bang on the corner! That's a power-up in the bag."],
    ['max', "[impressed] Landed right on the corner. Lovely. Collect your power-up."],
    ['poppy', "[delighted] A perfect landing! One shiny power-up for you."],
  ],
  junction: [
    ['max', "[curious] The junction. Power Lane, or the Question Trail? Choose wisely."],
    ['poppy', "[playfully] Decision time. Short and risky, or the long way round?"],
  ],
  fifty: [
    ['poppy', "[whispers] Fifty-fifty played. [normal] Somebody's got an easier job now."],
    ['max', "[amused] A fifty-fifty! Two wrong answers have just left the building."],
  ],
  skip: [
    ['max', "[surprised] New question! That one's gone in the bin."],
    ['poppy', "[laughs] Didn't fancy that one? Fair enough. Here's another."],
  ],
  points: [
    ['poppy', "[excited] Double points are in play! This one really counts."],
    ['max', "[dramatic] Double or... well, double or nothing. Double points!"],
  ],
  half: [
    ['max', "[mock shocked] Ooh! Half points for a rival. That's not very friendly."],
    ['poppy', "[gasps] Half points! Somebody has just made an enemy."],
  ],
  finish: [
    ['poppy', "[excited] Into the centre! We have a winner!"],
    ['max', "[delighted] Home! That is the race, ladies and gentlemen."],
  ],
};

/** Way Off: the furthest guess goes. Recorded as react-wayoff-<kind>-<n>. */
export const wayoffCalls = {
  out: [
    ['max', "[sympathetic] Furthest away, I'm afraid. Off you go."],
    ['poppy', "[mock sad] Way off! And that means you're out."],
    ['max', "[chuckles] Not even close. Thanks for coming."],
  ],
  finaltwo: [
    ['poppy', "[dramatic] Just two left. One more miss and it's over."],
    ['max', "[excited] We are down to the final two. Nerves of steel, please."],
  ],
  winner: [
    ['poppy', "[excited] Last one standing! That is how you guess a number."],
    ['max', "[delighted] Everyone else was way off. We have our winner!"],
  ],
};

/** Catch Up: the chase. Recorded as react-catch-<kind>-<n>. */
export const catchupCalls = {
  target: [
    ['max', "[excited] The target is set. Chasers, you're up!"],
    ['poppy', "[playfully] That's the score to beat. No pressure at all."],
  ],
  caught: [
    ['poppy', "[excited] Caught! The chasers have done it!"],
    ['max', "[impressed] Reeled in and overtaken. What a chase!"],
  ],
  escaped: [
    ['max', "[relieved] Time's up, and they got away with it!"],
    ['poppy', "[laughs] Not caught! The runners survive."],
  ],
};

/** Closest-number games: somebody guessed it exactly. Recorded as react-close-exact-<n>. */
export const closeCalls = {
  exact: [
    ['poppy', "[amazed] Spot on! Somebody got it exactly right!"],
    ['max', "[astonished] Bang on the number. I am genuinely impressed."],
  ],
};



/**
 * Calls for the public moments of the party games, the wheel and the dice.
 * Recorded as react-<game>-<kind>-<n>. Like every reaction, they describe what
 * the whole room can already see on the TV: they never name a player, never
 * read anything a player typed, and never hint at a secret before its reveal.
 */
export const momentCalls = {
  potato: {
    start: [
      ['poppy', "[excited] The potato is live! Answer fast and get rid of it!"],
      ['max', "[urgent] Here we go. Two minutes. Do not be holding it at the end!"],
    ],
    minute: [
      ['max', "[tense] One minute left on the potato."],
      ['poppy', "[tense] Halfway. Sixty seconds to go!"],
    ],
    twenty: [
      ['poppy', "[urgent] Twenty seconds! Pass it, pass it, pass it!"],
      ['max', "[urgent] Twenty seconds left. Somebody is about to get burned!"],
    ],
    burned: [
      ['max', "[wincing] Ooh. Burned! That has got to sting."],
      ['poppy', "[laughs] And that is the potato. Somebody is holding a very hot one!"],
    ],
  },
  funny: {
    write: [
      ['poppy', "[cheerfully] Thinking caps on. Funniest answer wins."],
      ['max', "[playfully] Get writing. And remember, nobody will know it was you."],
    ],
    final: [
      ['max', "[excited] Last round, and the votes are worth double!"],
      ['poppy', "[excited] Final round. Double points for every vote!"],
    ],
    vote: [
      ['max', "[cheerfully] They are all in. Pick your favourite on your phone."],
      ['poppy', "[playfully] Time to vote. And no, you cannot pick your own."],
    ],
    landslide: [
      ['poppy', "[amazed] A clean sweep! Every single vote!"],
      ['max', "[impressed] Unanimous. The whole room agreed on that one."],
    ],
    tie: [
      ['max', "[surprised] A tie at the top! You could not split them."],
      ['poppy', "[laughs] Level on votes. Two of you are equally hilarious."],
    ],
    votes: [
      ['poppy', "[cheerfully] The votes are in. Let's see who wrote what."],
      ['max', "[warmly] And there is your winner. Names revealed!"],
    ],
  },
  tracks: {
    start: [
      ['poppy', "[urgent] The brakes have gone! Teams, protect your track!"],
      ['max', "[dramatic] Runaway trolley! Pick something nobody could bear to hit."],
    ],
    sabotage: [
      ['max', "[mischievously] Now for the sabotage. Make the other track easy to hit."],
      ['poppy', "[playfully] Time to play dirty. Something awful for the other track."],
    ],
    judge: [
      ['poppy', "[tense] Over to the Driver. One lever, two tracks. Plead your case!"],
      ['max', "[tense] Driver, it is all yours. Who gets spared?"],
    ],
    lever: [
      ['max', "[dramatic] The lever is pulled! No going back now."],
      ['poppy', "[gasps] And the Driver has chosen. Look away if you are squeamish!"],
    ],
  },
  bluff: {
    write: [
      ['max', "[whispers] One of you cannot see the question. Blend in."],
      ['poppy', "[playfully] Answers, please. And bluffer, keep that face straight."],
    ],
    vote: [
      ['poppy', "[suspicious] Read them carefully. Which answer does not belong?"],
      ['max', "[curious] Time to vote. Who was making it up?"],
    ],
    caught: [
      ['max', "[triumphant] Caught! The room sniffed out the bluffer."],
      ['poppy', "[laughs] Busted! You could not fool this lot."],
    ],
    escaped: [
      ['poppy', "[amazed] They got away with it! The bluffer fooled the room."],
      ['max', "[impressed] Not caught! That is some very convincing nonsense."],
    ],
  },
  samepage: {
    write: [
      ['poppy', "[cheerfully] Do not be clever. Write what everyone else will write."],
      ['max', "[warmly] Think like the room. One answer, in secret."],
    ],
    all: [
      ['max', "[amazed] Everybody wrote the same thing! One mind, the lot of you."],
      ['poppy', "[delighted] A full house! You are all on the same page."],
    ],
    none: [
      ['poppy', "[laughs] Not one match! Do you people even know each other?"],
      ['max', "[amused] Nobody agreed. Not a single pair. Remarkable."],
    ],
    big: [
      ['max', "[impressed] Now that is a big group. Points all round."],
      ['poppy', "[cheerfully] Lots of you thinking alike there. Lovely."],
    ],
  },
  spotlight: {
    contestant: [
      ['poppy', "[smoothly] A new contestant steps into the spotlight."],
      ['max', "[warmly] Next in the hot seat. Let's spin for an expert."],
    ],
    expert: [
      ['max', "[cheerfully] The wheel has chosen. Expert, what is your advice?"],
      ['poppy', "[playfully] There is your topic and your expert. Choose your words wisely."],
    ],
    over: [
      ['poppy', "[whispers] The advice is in. Contestant, trust it or ignore it?"],
      ['max', "[tense] Final decision time. It is your call, contestant."],
    ],
    right: [
      ['max', "[delighted] Correct! A hundred points in the spotlight."],
      ['poppy', "[excited] That is right! Nicely done."],
    ],
    wrong: [
      ['poppy', "[sympathetic] Oh, not this time. Somebody owes somebody an apology."],
      ['max', "[wincing] Wrong answer. That is going to be an awkward journey home."],
    ],
  },
  brain: {
    level: [
      ['max', "[curious] Next rung of the ladder. Take your time. But not too much."],
      ['poppy', "[cheerfully] Up we go. This one is a little harder."],
    ],
    top: [
      ['poppy', "[excited] The top rung! This is the hardest puzzle of the lot."],
      ['max', "[tense] Final level. Everything rides on this one."],
    ],
    allright: [
      ['max', "[impressed] Everyone got it. What a clever room."],
      ['poppy', "[delighted] A clean sweep! Brains all round."],
    ],
    nobody: [
      ['poppy', "[wincing] Nobody got that one. Lives lost everywhere."],
      ['max', "[amused] Not a single right answer. That puzzle beat all of you."],
    ],
    out: [
      ['max', "[sympathetic] And somebody is off the ladder. Out of lives."],
      ['poppy', "[softly] That is both lives gone. Down they go."],
    ],
    last: [
      ['poppy', "[excited] Just one player left on the ladder!"],
      ['max', "[impressed] One survivor. Can they make it to the top?"],
    ],
  },
  top: {
    poll: [
      ['poppy', "[cheerfully] Be honest. Pick your real favourite."],
      ['max', "[warmly] Survey time. Vote with your heart."],
    ],
    guess: [
      ['max', "[curious] Now predict. Which answer did the room pick the most?"],
      ['poppy', "[playfully] The poll is closed. So, how well do you know this lot?"],
    ],
    unanimous: [
      ['poppy', "[amazed] Every vote for the same answer! Unanimous!"],
      ['max', "[impressed] The whole room agreed. That never happens."],
    ],
    tie: [
      ['max', "[surprised] A tie at the top! Both answers count."],
      ['poppy', "[cheerfully] Two top answers. A split room!"],
    ],
    clear: [
      ['poppy', "[excited] And there is your top answer!"],
      ['max', "[cheerfully] The room has spoken. Did you see that coming?"],
    ],
  },
  rare: {
    write: [
      ['max', "[whispers] Avoid the obvious. Find one nobody else will say."],
      ['poppy', "[playfully] Dig deep. The rarer the answer, the better."],
    ],
    review: [
      ['poppy', "[curious] Ooh, an unusual one. Let's check that with the host."],
      ['max', "[amused] Somebody has gone off the map. One moment while we check."],
    ],
    unique: [
      ['max', "[delighted] A rare find! Only one of you thought of that."],
      ['poppy', "[impressed] One of a kind. Two hundred points for that."],
    ],
    shared: [
      ['poppy', "[laughs] No rare finds this time. You all think alike."],
      ['max', "[amused] Nothing unique there. Great minds, sadly."],
    ],
  },
  sketch: {
    draw: [
      ['poppy', "[cheerfully] Pencil down on the screen. Artist, off you go!"],
      ['max', "[playfully] A new artist. This should be interesting."],
    ],
    first: [
      ['max', "[excited] Somebody has got it! Keep guessing, the rest of you."],
      ['poppy', "[delighted] First correct guess is in! Who is next?"],
    ],
    nobody: [
      ['poppy', "[laughs] Nobody got it. Artist, what on earth was that?"],
      ['max', "[amused] Not one correct guess. We may need to talk about that drawing."],
    ],
    cracked: [
      ['max', "[impressed] Everyone got it with time to spare. Lovely drawing."],
      ['poppy', "[cheerfully] Cracked it early! That was a clear one."],
    ],
  },
  wheel: {
    spin: [
      ['poppy', "[excited] Round and round it goes!"],
      ['max', "[cheerfully] Spinning. Come on, something I am good at."],
      ['poppy', "[playfully] Where will it land this time?"],
    ],
  },
  dice: {
    triple: [
      ['max', "[excited] Triple points! This is the big one."],
      ['poppy', "[amazed] Times three! Concentrate, everybody."],
    ],
    double: [
      ['poppy', "[cheerfully] Double points on this one."],
      ['max', "[warmly] Times two. Worth getting right."],
    ],
    single: [
      ['max', "[amused] Just the one. A quiet roll."],
      ['poppy', "[playfully] No multiplier this time. Save your luck."],
    ],
  },
  showdown: {
    lead: [
      ['poppy', "[excited] We have a new team in the lead!"],
      ['max', "[impressed] All change at the top. A new leading team!"],
    ],
    level: [
      ['max', "[tense] It is level at the top. Nothing between them."],
      ['poppy', "[excited] The teams are tied! This is anybody's game."],
    ],
  },
};

export const reactionTakes = Object.fromEntries([
  ...Object.entries(reactions).flatMap(([kind, lines]) => lines.map((line, index) => [`react-${kind}-${index + 1}`, [line]])),
  ...Object.entries(knockoutReactions).flatMap(([kind, takes]) => takes.map((lines, index) => [`react-ko-${kind}-${index + 1}`, lines])),
  ...Object.entries(raceCalls).flatMap(([kind, lines]) => lines.map((line, index) => [`react-race-${kind}-${index + 1}`, [line]])),
  ...Object.entries(bloodmoonCalls).flatMap(([kind, lines]) => lines.map((line, index) => [`react-count-${kind}-${index + 1}`, [line]])),
  ...[['board', boardCalls], ['wayoff', wayoffCalls], ['catch', catchupCalls], ['close', closeCalls], ...Object.entries(momentCalls)].flatMap(([prefix, calls]) =>
    Object.entries(calls).flatMap(([kind, lines]) => lines.map((line, index) => [`react-${prefix}-${kind}-${index + 1}`, [line]]))),
]);
