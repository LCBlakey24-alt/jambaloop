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
  ['mixed', 'Mixed Bag', 'A balanced mix of topics in one game.', 'shuffle', '#a8c6f2', 'Mixed'],
];

export const modes = [
  ['classic', 'Classic Quiz', "Pick a topic and compete for the highest score.", 'list-checks', '#f4a9c7'],
  ['wheel', 'Spin the Wheel', "Let the wheel choose each question’s category.", 'disc-3', '#c6b1f4'],
  ['board', 'Board Race', "Roll the dice, tackle trivia and race to the finish.", 'dice-5', '#a7dfc5'],
  ['dice', 'Dice Rally', "Roll two dice to multiply the points for correct answers.", 'dices', '#f6cc8b'],
  ['knockout', 'Knockout', "Answer correctly to protect your three lives.", 'heart', '#f0a8a9'],
  ['punchline', 'Punchline Party', "Write a funny reply and vote for your favourite.", 'message-circle', '#f6c9ac'],
  ['cards', 'Fill the Blank', "Complete a prompt using phrase cards, then vote for the funniest entry.", 'layers', '#c9dcf5'],
  ['tracks', 'Fork in the Tracks', "Build and sabotage tracks to persuade the rotating Trolley Driver to spare your team.", 'git-fork', '#c4e7ce'],
  ['bluff', 'Spot the Bluff', "Spot the player who is answering without seeing the prompt.", 'venetian-mask', '#f2d4ae'],
  ['potato', 'Hot Potato', "Answer correctly to pass the potato before the timer runs out.", 'timer', '#f5c1af'],
  ['quizrace', 'Quiz Race', "Answer quickly and correctly to speed towards the finish line.", 'flag-triangle-right', '#1dd9be'],
  ['showdown', 'Team Showdown', "Compete in two to four teams, scoring the average of your teammates’ points.", 'users-round', '#c1e3ec'],
  ['samepage', 'Same Page', "Secretly write an answer and score when other players match it.", 'messages-square', '#77efdc'],
  ['spotlight', 'Spotlight Wheel', "Take turns answering questions with advice from a randomly chosen expert.", 'aperture', '#ffc88d'],
  ['brain', 'Brain Ladder', "Climb increasingly difficult logic puzzles with just two lives.", 'brain-circuit', '#86e7fa'],
  ['topanswers', 'Top Answers', "Vote for your favourite, then predict which choice your group will pick most.", 'chart-no-axes-column-increasing', '#ffca83'],
  ['rare', 'Rare Find', "Name a valid answer that nobody else thinks of to earn the most points.", 'gem', '#a2f4cd'],
  ['soclose', 'So Close', "Estimate a number, lock in your guess and see who comes closest.", 'ruler', '#ffbf68'],
  ['sketch', 'Sketch Sprint', "Draw a secret prompt live while everyone else races to guess it.", 'paintbrush', '#a4dcff'],
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

export const teams = [
  ['Ruby', '#ff91ae'],
  ['Sapphire', '#96bcff'],
  ['Jade', '#83edc0'],
  ['Amber', '#ffd381'],
];

export const wheelCategories = includeChristmas => categories.filter(([id]) =>
  id !== 'mixed' && (includeChristmas || id !== 'christmas'));
export const categoryName = id => categories.find(category => category[0] === id)?.[1] ?? '';

export function questionCounts(mode, format, category) {
  if (mode === 'brain') return [5, 7, 10];
  if (mode === 'topanswers') return [3, 5, 7];
  if (mode === 'rare' || mode === 'sketch') return [3, 5, 7];
  if (['punchline','cards','bluff'].includes(mode)) return [3, 5, 7];
  if (mode === 'spotlight') return [1, 2, 3];
  if (['tracks','samepage'].includes(mode)) return [3, 5, 7];
  if (mode === 'board') return [12, 18, 24, 36, 48, 60];
  const singleTopic = mode !== 'wheel' && category !== 'mixed';
  const shortTopic = ['art', 'games', 'animals', 'space'].includes(category);
  return singleTopic && (['estimate', 'order'].includes(format) || shortTopic && format !== 'mixed') ? [5] : [5, 10, 15];
}

export const categoryGroups = [
  ['All topics', []],
  ['Science & nature', ['science', 'animals', 'space', 'technology', 'maths']],
  ['Culture', ['art', 'entertainment', 'music', 'books', 'language']],
  ['World & history', ['geography', 'history', 'news']],
  ['Leisure', ['sports', 'games', 'food', 'christmas']],
];

export const fixedQuestionModes = ['classic', 'dice', 'knockout', 'showdown', 'soclose'];

export const socialModes = ['punchline', 'cards', 'tracks'];
export const partyModes = ['bluff', 'potato', 'samepage', 'spotlight', 'brain', 'topanswers', 'rare', 'sketch', ...socialModes];
export const scoreIntervals = [0, 1, 3, 5];
export const defaultScoreInterval = 3;
export const supportsScoreCheckpoints = mode => mode !== 'quizrace' && mode !== 'soclose' && modes.some(([id]) => id === mode) && !partyModes.includes(mode);
export const minimumPlayers = mode => ['quizrace','soclose'].includes(mode) ? 2 : ['bluff', 'punchline', 'cards', 'samepage', 'spotlight', 'topanswers', 'rare', 'sketch'].includes(mode) ? 3
  : mode === 'brain' ? 2
  : mode === 'tracks' ? 3 : ['potato', 'showdown'].includes(mode) ? 2 : 1;
// One shared rule for how many players a game supports. `playStyle` matters
// only for Board Race, where individual racing uses at most four pieces; the
// room itself can still hold a larger group that switches to Teams.
export const roomCapacity = 300;
export const maximumPlayers = (mode, playStyle) =>
  mode === 'quizrace' ? 12
  : mode === 'spotlight' ? 20
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
