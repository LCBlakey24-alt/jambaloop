// A player's face: their selfie if they took one, otherwise their initial.
// Views that only know a player's name or id look the rest up in the room's
// roster, so the same picture follows a player through every game.
let roster = new Map();
const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/** Remember who is in the room (id, name, avatar). Called before each render. */
export function setRoster(players) {
  roster = new Map();
  for (const player of players ?? []) { roster.set('id:' + player.id, player); roster.set('name:' + player.name, player); }
}

/** The avatar for `who`: a player object, or just a name. */
export function face(who) {
  const given = typeof who === 'string' ? { name: who } : who ?? {};
  const known = given.avatar ? given : roster.get('id:' + given.id) ?? roster.get('name:' + given.name) ?? given;
  const photo = known.avatar ? ` data-room-avatar="${safe(known.avatar)}"` : '';
  return `<span class="player-avatar avatar-initial face" aria-hidden="true"${photo}>${safe(Array.from(String(known.name ?? given.name ?? '?'))[0]?.toUpperCase() ?? '?')}</span>`;
}
