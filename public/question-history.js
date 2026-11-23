// Shared, stable, non-secret question identifier for replay avoidance.
// IDs are not authentication tokens and are not used to reveal answers.
export function questionHistoryId(prompt) {
  const normalized = String(prompt ?? '').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
  let hash = 2166136261;
  for (const character of normalized) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return 'q1-' + (hash >>> 0).toString(16).padStart(8,'0');
}

export const questionHistoryLimit = 2000;
export const validQuestionHistoryId = id => typeof id === 'string' && /^q1-[0-9a-f]{8}$/.test(id);

const storageKey = 'jambaloop-question-history-v1';
export function readQuestionHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(history) ? history.filter(validQuestionHistoryId).slice(-questionHistoryLimit) : [];
  } catch { return []; }
}
export function rememberQuestion(id) {
  if (!validQuestionHistoryId(id)) return;
  try {
    const old = readQuestionHistory().filter(entry => entry !== id);
    old.push(id);
    localStorage.setItem(storageKey, JSON.stringify(old.slice(-questionHistoryLimit)));
  } catch { /* Privacy modes can disable local storage; the live game still works. */ }
}
