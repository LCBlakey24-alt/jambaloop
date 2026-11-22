export function deskAwards(players) {
  const entries = [...players];
  const awards = [];
  const add = (id, title, label, metric, { min = 1, ascending = false, format = String } = {}) => {
    const eligible = entries.map(player => ({ player, value: metric(player) }))
      .filter(({ value }) => Number.isFinite(value) && value >= min)
      .sort((a, b) => ascending ? a.value - b.value : b.value - a.value);
    if (!eligible.length) return;
    const best = eligible[0].value;
    const tied = eligible.filter(({ value }) => value === best);
    awards.push({ id, title, label, value: format(best), names: tied.slice(0, 4).map(({ player }) => player.name), tied: tied.length });
  };
  const seconds = ms => (ms / 1000).toFixed(2) + 's';
  add('fast', 'Quick Draw', 'Fastest answer', player => player.fastest, { min: 0, ascending: true, format: seconds });
  add('slow', 'The Thinker', 'Longest time before answering', player => player.slowest, { min: 0, format: seconds });
  add('correct', 'Quiz Wizard', 'Most correct answers', player => player.wins);
  add('wrong', 'Bold Guesser', 'Most incorrect answers', player => player.misses);
  add('streak', 'On a Roll', 'Longest correct streak', player => player.bestStreak, { min: 2 });
  add('comeback', 'Bounce Back', 'Most correct answers after a miss', player => player.comebacks);
  return awards;
}
