// Original Jambaloop intros: always offer readable text as well as optional sound.
// 'recorded' identifies only audio files already committed to this branch.
export const narration = {
  soclose: "Welcome to So Close! Scroll to your best estimate, then lock it in. Above or below, it makes no difference. The nearest guess earns the points, and an exact answer earns double!",
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
  spotlight: "Welcome to Spotlight Wheel! Everyone gets a turn as the contestant. Spin to reveal a trivia topic and a fellow player who will offer expert advice. Listen carefully, make your choice and shine in the spotlight!",
  brain: "Welcome to Brain Ladder! Ten levels of original puzzles, two lives per player, and a tougher challenge at every step. Think carefully, lock an answer and see how high you can climb!",
  topanswers: "Welcome to Top Answers! First, vote for the answer you really prefer. Then guess which choice the rest of this room picked most. We'll reveal the actual votes on the big screen — no mystery surveys, just your crowd!",
  rare: "Welcome to Rare Find! Give a correct answer that you think nobody else will choose. We'll check the verified answer list, review unusual entries, and reveal how many players thought alike. Stand out to score big!",
  bloodmoon: "Welcome to Bloodmoon. Every phone is dealt a secret role. A few of you are vampires; the rest are villagers, with one Oracle and one Warden among them. Each night, everyone chooses in secret on their own phone. Each day, talk it over and vote to banish a suspect. The village wins when every vampire is out. The vampires win when they match the village. Trust nobody.",
  wayoff: "Welcome to Way Off! Everyone guesses the same number on their phone, and you can watch every guess turning on the big screen. When the answer is revealed, the guess furthest away is out. Then it is a new question, with fewer players, until only one is left. You do not have to be right. You just cannot be the most wrong.",
  sketch: "Welcome to Sketch Sprint! One player becomes the artist, with a secret picture to draw on their phone. Everyone else races to guess what appears on the big screen. Fast fingers, sharp eyes, and plenty of laughs. Ready, set, sketch!",    
};
// Three professional ElevenLabs recordings were successfully generated on 22 November 2026.
// Remaining modes use offline-capable, no-cost browser-native speech synthesis until recordings exist.
export const recordedIntros = new Set(['classic','board','quizrace']);
export const narratorAsset = mode => recordedIntros.has(mode) ? '/audio/narrator/' + mode + '.mp3' : null;
