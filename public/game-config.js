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
  ['mixed', 'Mixed Bag', 'A balanced mix of topics in one game.', 'shuffle', '#a8c6f2', 'Mixed'],
];

export const modes = [
  ['classic', 'Classic Quiz', 'Pick a topic and play straight through.', 'list-checks', '#f4a9c7'],
  ['wheel', 'Spin the Wheel', 'Spin for a new category before each question.', 'disc-3', '#c6b1f4'],
  ['board', 'Board Race', 'Roll 3D dice and race around the trivia board.', 'dice-5', '#a7dfc5'],
  ['dice', 'Dice Rally', 'Roll two 3D dice to set the points multiplier.', 'dices', '#f6cc8b'],
  ['knockout', 'Knockout', 'Start with three lives and try to stay in.', 'heart', '#f0a8a9'],
  ['punchline', 'Punchline Party', 'Write a funny reply, then vote for your favourite.', 'message-circle', '#f6c9ac'],
  ['cards', 'Fill the Blank', 'Play a silly phrase from your private hand.', 'layers', '#c9dcf5'],
  ['tracks', 'Fork in the Tracks', 'Pick a side in ridiculous family dilemmas.', 'git-fork', '#c4e7ce'],
  ['bluff', 'Spot the Bluff', 'One player never sees the prompt. Vote for the bluff.', 'venetian-mask', '#f2d4ae'],
  ['potato', 'Hot Potato', 'Answer correctly to pass it before two minutes run out.', 'timer', '#f5c1af'],
  ['showdown', 'Team Showdown', 'Play together in two to four teams.', 'users-round', '#c1e3ec'],
];

export const defaultTheme = 'club';

export const themes = [
  [defaultTheme, 'Quiz Club', '#3550cb', '#f8f2e6'],
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
  if (mode === 'board') return [12, 18, 24, 36, 48, 60];
  const singleTopic = mode !== 'wheel' && category !== 'mixed';
  const shortTopic = ['art', 'games', 'animals', 'space'].includes(category);
  return singleTopic && (['estimate', 'order'].includes(format) || shortTopic && format !== 'mixed') ? [5] : [5, 10, 15];
}

export const categoryGroups = [
  ['All topics', []],
  ['Science & nature', ['science', 'animals', 'space', 'technology']],
  ['Culture', ['art', 'entertainment', 'music', 'books']],
  ['World & history', ['geography', 'history', 'news']],
  ['Leisure', ['sports', 'games', 'food', 'christmas']],
];

export const fixedQuestionModes = ['classic', 'dice', 'knockout', 'showdown'];

export const socialModes = ['punchline', 'cards', 'tracks'];
export const partyModes = ['bluff', 'potato', ...socialModes];
export const scoreIntervals = [0, 1, 3, 5];
export const defaultScoreInterval = 3;
export const supportsScoreCheckpoints = mode => modes.some(([id]) => id === mode) && !partyModes.includes(mode);
export const minimumPlayers = mode => ['bluff', 'punchline', 'cards'].includes(mode) ? 3
  : ['potato', 'tracks', 'showdown'].includes(mode) ? 2 : 1;
export const boardRollDuration = 5400;
