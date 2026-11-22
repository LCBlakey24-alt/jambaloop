const storageKey = 'quiz-club-room-history';
const sessionKey = 'quizmas-session';
const maxAge = 24 * 60 * 60 * 1000;

export function restoreRoomSession() {
  try {
    const raw = sessionStorage.getItem(sessionKey);
    if (raw === null) return;
    const saved = JSON.parse(raw);
    if (typeof saved?.code === 'string' && /^\d{6}$/.test(saved.code) &&
        typeof saved.key === 'string' && saved.key && typeof saved.host === 'boolean') return saved;
  } catch {
    // Unavailable storage or a malformed value does not prevent opening the app.
  }
  clearRoomSession();
}

export function saveRoomSession(session) {
  try { sessionStorage.setItem(sessionKey, JSON.stringify(session)); } catch {
    // The active game remains playable without browser storage.
  }
}

export function clearRoomSession() {
  try { sessionStorage.removeItem(sessionKey); } catch {
    // The in-memory session is managed by the app.
  }
}

export function recentRooms() {
  try {
    const records = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(records) ? records.filter(item =>
      item?.expires > Date.now() && parseRoomCode(item.code) === item.code && typeof item.key === 'string' && !item.host) : [];
  } catch {
    return [];
  }
}

export function parseRoomCode(value) {
  if (typeof value !== 'string') return '';
  const compact = value.trim().replace(/[\s-]/g, '');
  if (/^\d{6}$/.test(compact)) return compact;
  try {
    const code = new URL(value.trim()).searchParams.get('join');
    return /^\d{6}$/.test(code ?? '') ? code : '';
  } catch {
    return '';
  }
}

export function rememberedPlayer(code) {
  return recentRooms().find(item => item.code === code);
}

function write(records) {
  try { localStorage.setItem(storageKey, JSON.stringify(records)); } catch {
    // The current room can still be played when the browser blocks local storage.
  }
}

export function rememberPlayer(session) {
  if (session.host) return;
  const recent = recentRooms();
  const previous = recent.find(item => item.code === session.code && item.key === session.key);
  const records = recent.filter(item => item.code !== session.code);
  records.unshift({ ...previous, ...session, expires: Date.now() + maxAge });
  write(records.slice(0, 12));
}

export function forgetPlayer(code) {
  write(recentRooms().filter(item => item.code !== code));
}
