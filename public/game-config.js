export const categories = [
  ['general', 'General Knowledge', 'A little bit of everything.', 'brain', '#f4a9c7', 'General'],
  ['history', 'History', 'Big moments and famous faces.', 'landmark', '#f4c483', 'History'],
  ['news', 'World News', 'International headlines from 2023 to 2026.', 'globe', '#9edccc', 'News'],
  ['christmas', 'Christmas', 'Festive films, songs, and traditions.', 'gift', '#f0a8a9', 'Christmas'],
  ['entertainment', 'Entertainment', 'Movies, music, TV, and pop culture.', 'clapperboard', '#c6b1f4', 'Showbiz'],
  ['sports', 'Sports', 'From the pitch to the Olympic pool.', 'trophy', '#f1d880', 'Sports'],
  ['geography', 'Geography', 'Capitals, landmarks, and the world map.', 'map', '#a3dda6', 'Geography'],
  ['science', 'Science & Nature', 'Space, wildlife, and the world around us.', 'flask-conical', '#98d2f3', 'Science'],
  ['food', 'Food & Drink', 'Ingredients and dishes from around the world.', 'utensils', '#ffba96', 'Food'],
  ['music', 'Music', 'Instruments, artists, and iconic songs.', 'music', '#f89fd8', 'Music'],
  ['books', 'Books & Stories', 'Novels, authors, and famous characters.', 'book-open', '#c6ccff', 'Books'],
  ['technology', 'Technology', 'Computers, gadgets, and inventions.', 'cpu', '#b3e6a0', 'Tech'],
  ['art', 'Art & Design', 'Paintings, makers, and design history.', 'palette', '#efd0e4', 'Art'],
  ['games', 'Games & Puzzles', 'Board games, video games, and brain teasers.', 'gamepad-2', '#b7c9ff', 'Games'],
  ['animals', 'Animals', 'Wildlife, habitats, and remarkable creatures.', 'paw-print', '#bde5ca', 'Animals'],
  ['space', 'Space & Astronomy', 'Planets, stars, and space exploration.', 'orbit', '#c9b9f5', 'Space'],
  ['language', 'Words & Language', 'Grammar, wordplay, meanings and spelling.', 'book-open', '#f9cf99', 'Words'],
  ['maths', 'Maths & Numbers', 'Quick calculations, number patterns and logic.', 'sigma', '#99e7dc', 'Maths'],
  // Specialist packs (seventh field true): played as a topic of their own, but
  // kept out of Mixed Bag and Spin the Wheel so everyday games stay balanced.
  ['football', 'Football', 'World Cups, the Premier League and legendary clubs.', 'goal', '#9be3a8', 'Football', true],
  ['nba', 'NBA Basketball', 'Dunks, dynasties and the biggest names on court.', 'volleyball', '#ffb27a', 'NBA', true],
  ['nfl', 'NFL', 'Touchdowns, Super Bowls and gridiron greats.', 'shield', '#a9c4ff', 'NFL', true],
  ['nhl', 'NHL Ice Hockey', 'The Stanley Cup, the Great One and life on the ice.', 'snowflake', '#bfe9ff', 'NHL', true],
  ['f1', 'Formula 1', 'Champions, circuits and life in the fast lane.', 'flag-triangle-right', '#ff9f9f', 'F1', true],
  ['olympics', 'Olympics', 'Summer and Winter Games, legends and host cities.', 'medal', '#ffe08a', 'Olympics', true],
  ['disney', 'Disney & Pixar', 'Princesses, sidekicks, songs and animated classics.', 'castle', '#d7b8ff', 'Disney', true],
  ['superheroes', 'Superheroes', 'Comic-book heroes, villains and blockbuster films.', 'zap', '#ffcf6e', 'Heroes', true],
  ['mixed', 'Mixed Bag', 'A balanced mix of everyday topics in one game.', 'shuffle', '#a8c6f2', 'Mixed'],
];

/** Specialist packs are chosen on purpose; Mixed Bag and the wheel skip them. */
export const specialistCategories = categories.filter(row => row[6]).map(([id]) => id);
export const isSpecialist = id => specialistCategories.includes(id);

export const modes = [
  ['classic', 'Classic Quiz', 'Pick a topic and play straight through.', 'list-checks', '#f4a9c7'],
  ['wheel', 'Spin the Wheel', 'Spin for a new category before each question.', 'disc-3', '#c6b1f4'],
  ['board', 'Board Race', 'Roll 3D dice and race around the trivia board.', 'dice-5', '#a7dfc5'],
  ['dice', 'Dice Rally', 'Roll two 3D dice to set the points multiplier.', 'dices', '#f6cc8b'],
  ['knockout', 'Knockout', 'Start with three lives and try to stay in.', 'heart', '#f0a8a9'],
  ['punchline', 'Punchline Party', 'Write a funny reply, then vote for your favourite.', 'message-circle', '#f6c9ac'],
  ['cards', 'Fill the Blank', 'Play a silly phrase from your private hand.', 'layers', '#c9dcf5'],
  ['tracks', 'Fork in the Tracks', 'Two teams build ridiculous tracks; every player gets a turn driving the trolley.', 'git-fork', '#c4e7ce'],
  ['bluff', 'Spot the Bluff', 'One player never sees the prompt. Vote for the bluff.', 'venetian-mask', '#f2d4ae'],
  ['bloodmoon', 'Bloodmoon', 'Secret vampires hide in the village. They bite by night; everyone debates and banishes by day.', 'moon', '#ff8a8f'],
  ['potato', 'Hot Potato', 'Answer correctly to pass it before two minutes run out.', 'timer', '#f5c1af'],
  ['quizrace', 'Quiz Race', 'Answer fast to accelerate along a winding track.', 'flag-triangle-right', '#1dd9be'],
  ['showdown', 'Team Showdown', 'Play together in two to four teams.', 'users-round', '#c1e3ec'],
  ['samepage', 'Same Page', 'Secretly write matching answers and score for thinking alike.', 'messages-square', '#77efdc'],
  ['spotlight', 'Spotlight Wheel', 'Take turns as contestant with an expert chosen by the wheel.', 'aperture', '#ffc88d'],
  ['brain', 'Brain Ladder', 'Solve fresh original logic puzzles, protect your two lives and climb ten levels.', 'brain-circuit', '#86e7fa'],
  ['topanswers', 'Top Answers', 'Vote for your favourite, predict the room’s most popular choice, and reveal the real results.', 'chart-no-axes-column-increasing', '#ffca83'],
  ['rare', 'Rare Find', 'Find the correct answer nobody else picks. Unusual valid answers earn the most.', 'gem', '#a2f4cd'],
  ['soclose', 'So Close', 'Scroll to your best numerical estimate; the closest guess wins.', 'ruler', '#ffbf68'],
  ['sketch', 'Sketch Sprint', 'One person draws a secret prompt live; everyone else races to guess it.', 'paintbrush', '#a4dcff'],
];

export const defaultTheme = 'club';

export const themes = [
  [defaultTheme, 'Jambaloop Classic', '#3550cb', '#f8f2e6'],
  ['christmas', 'Christmas', '#f4a9c7', '#1c1a1e'],
  ['arcade', 'Neon Arcade', '#b8afff', '#1c1934'],
  ['lodge', 'Winter Lodge', '#f6cc8b', '#252422'],
];

export const difficulties = [
  ['standard', 'Standard question bank'],
  ['family', 'Family mix · ages 8+'],
  ['challenge', 'Challenge mix'],
];

export const formats = [
  ['mixed', 'Mixed formats'],
  ['choice', 'Multiple choice only'],
  ['boolean', 'True or false only'],
  ['estimate', 'Closest number only'],
  ['order', 'Put in order only'],
];

// The four question types a quiz can draw on. A room's `format` is either one
// type id, 'mixed' (all four), or a hand-picked combination joined with '+'
// in this order, e.g. 'choice+boolean'. One canonical spelling per choice
// keeps rematches, playlists and saved state comparable.
export const questionTypes = [
  ['choice', 'Multiple choice'],
  ['boolean', 'True or false'],
  ['estimate', 'Closest number'],
  ['order', 'Put in order'],
];
const typeIds = questionTypes.map(([id]) => id);
export const formatTypes = format => format === 'mixed' ? [...typeIds]
  : typeof format === 'string' ? format.split('+') : [];
export const formatId = types => {
  const picked = typeIds.filter(id => types.includes(id));
  return picked.length === typeIds.length ? 'mixed' : picked.join('+');
};
export const isQuestionFormat = format => {
  const types = formatTypes(format);
  return types.length > 0 && types.every(type => typeIds.includes(type))
    && new Set(types).size === types.length && formatId(types) === format;
};

export const teams = [
  ['Ruby', '#ff91ae'],
  ['Sapphire', '#96bcff'],
  ['Jade', '#83edc0'],
  ['Amber', '#ffd381'],
];

export const wheelCategories = includeChristmas => categories.filter(([id]) =>
  id !== 'mixed' && !isSpecialist(id) && (includeChristmas || id !== 'christmas'));
export const categoryName = id => categories.find(category => category[0] === id)?.[1] ?? '';

export function questionCounts(mode, format, category) {
  if (mode === 'bloodmoon') return [1];
  if (mode === 'brain') return [5, 7, 10];
  if (mode === 'topanswers') return [3, 5, 7];
  if (mode === 'rare' || mode === 'sketch') return [3, 5, 7];
  if (['punchline','cards','bluff'].includes(mode)) return [3, 5, 7];
  if (mode === 'spotlight') return [1, 2, 3];
  if (['tracks','samepage'].includes(mode)) return [3, 5, 7];
  if (mode === 'board') return [12, 18, 24, 36, 48, 60];
  // Single topics hold at least 15 multiple-choice and 15 true/false questions
  // (enforced by test/question-supply.test.js) but only five or six estimates
  // and orders, so those formats stay at one five-question round.
  // A combination that includes multiple choice or true/false tops itself up
  // from those types, so only estimate/order-only picks are capped.
  const singleTopic = mode !== 'wheel' && category !== 'mixed';
  const scarce = formatTypes(format).every(type => ['estimate', 'order'].includes(type));
  return singleTopic && scarce ? [5] : [5, 10, 15];
}

export const categoryGroups = [
  ['All topics', []],
  ['Science & nature', ['science', 'animals', 'space', 'technology', 'maths']],
  ['Culture', ['art', 'entertainment', 'music', 'books', 'language']],
  ['World & history', ['geography', 'history', 'news']],
  ['Leisure', ['sports', 'games', 'food', 'christmas']],
  ['Sport', ['sports', 'football', 'nba', 'nfl', 'nhl', 'f1', 'olympics']],
  ['Fandoms', ['disney', 'superheroes', 'entertainment']],
];

export const fixedQuestionModes = ['classic', 'dice', 'knockout', 'showdown', 'soclose'];

export const socialModes = ['punchline', 'cards', 'tracks'];
export const partyModes = ['bluff', 'bloodmoon', 'potato', 'samepage', 'spotlight', 'brain', 'topanswers', 'rare', 'sketch', ...socialModes];
export const scoreIntervals = [0, 1, 3, 5];
export const defaultScoreInterval = 3;
export const supportsScoreCheckpoints = mode => mode !== 'quizrace' && mode !== 'soclose' && modes.some(([id]) => id === mode) && !partyModes.includes(mode);
export const minimumPlayers = mode => ['quizrace','soclose'].includes(mode) ? 2 : ['bluff', 'punchline', 'cards', 'samepage', 'spotlight', 'topanswers', 'rare', 'sketch'].includes(mode) ? 3
  : mode === 'brain' ? 2
  : mode === 'bloodmoon' ? 5
  : mode === 'tracks' ? 3 : ['potato', 'showdown'].includes(mode) ? 2 : 1;
// One shared rule for how many players a game supports. `playStyle` matters
// only for Board Race, where individual racing uses at most four pieces; the
// room itself can still hold a larger group that switches to Teams.
export const roomCapacity = 300;
export const maximumPlayers = (mode, playStyle) =>
  mode === 'quizrace' ? 12
  : mode === 'spotlight' ? 20
  : mode === 'bloodmoon' ? 16
  : ['brain', 'topanswers', 'rare'].includes(mode) ? 30
  : mode === 'board' && playStyle === 'individual' ? 4
  : roomCapacity;
export const capacityError = (mode, playStyle, players) => {
  const limit = maximumPlayers(mode, playStyle);
  if (players <= limit) return undefined;
  const name = modes.find(([id]) => id === mode)?.[1] ?? 'This game';
  return mode === 'board' && playStyle === 'individual'
    ? 'Individual Board Race supports up to four racers. Choose Teams for larger groups.'
    : `${name} supports up to ${limit} players; this room has ${players}. Choose another game or a smaller group.`;
};
export const boardRollDuration = 5400;
