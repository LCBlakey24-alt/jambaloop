// Original Jambaloop intros: always offer readable text as well as optional sound.
// 'recorded' identifies only audio files already committed to this branch.
export const narration = {
  classic: "It's time for Classic Quiz! Choose your favourite topic, put those thinking caps on, and prove who knows their stuff. Every question counts. Are you ready?",
  wheel: "Step right up for Spin the Wheel! Give it a spin and find out what category comes next. One wheel, plenty of surprises, and a lot of points to win!",
  board: "Welcome to Board Race! Roll the dice, face the trivia challenges, and move your team across the board. Take the right turns, and the finish line is yours!",
  dice: "Roll into Dice Rally! The dice decide your points multiplier, but your answers decide the score. A lucky roll helps — a clever answer makes it count!",
  knockout: "Here comes Knockout! Three lives each, and every wrong answer puts you under pressure. Hold your nerve, stay in the game, and be the last one standing!",
  punchline: "Welcome to Punchline Party! The sillier the prompt, the better. Write your funniest answer, read the room, and see whose punchline wins the biggest vote!",
  cards: "It's Fill the Blank! You've got a hand of ridiculous answers and one very unfinished sentence. Pick the perfect punchline and see if your friends agree!",
  tracks: "All aboard Fork in the Tracks! Two teams choose their cards, then a different Trolley Driver pulls the lever each round. Everyone gets a turn behind the controls!",
  bluff: "Think you can Spot the Bluff? Someone's pretending to know the prompt, and they are counting on you believing them. Ask questions, read the room, and catch the faker!",
  potato: "Things are heating up in Hot Potato! Answer quickly to pass the pressure to someone else. Don't get caught holding it when time runs out. Good luck!",
  quizrace: "Welcome to Quiz Race! Think fast, answer correctly, and put your foot down! Every second counts as you race your friends to the finish line. Ready? Let's race!",
  showdown: "It's Team Showdown! Bring your team together, share your knowledge and pile up the points. Only one side can take the victory — let the showdown begin!",
  samepage: "Welcome to Same Page! Read the prompt, write your first thought, and hope your friends think exactly like you. Every matching mind earns you points!",
};
// Three professional ElevenLabs recordings were successfully generated on 22 November 2026.
// Remaining modes use offline-capable, no-cost browser-native speech synthesis until recordings exist.
export const recordedIntros = new Set(['classic','board','quizrace']);
export const narratorAsset = mode => recordedIntros.has(mode) ? '/audio/narrator/' + mode + '.mp3' : null;
