export const reconnectWindow = 18_000;

export function isConnected(room, key, now = Date.now()) {
  return room.livePlayers.has(key) || (room.lastSeen.get(key) ?? 0) + reconnectWindow > now;
}

export function connectedPlayers(room) {
  const now = Date.now();
  return [...room.players.keys()].filter(key => isConnected(room, key, now));
}

export function responseTarget(room, submissions = room.answers) {
  let total = 0;
  for (const [key, player] of room.players) {
    if (submissions.has(key) || (player.lives !== 0 && isConnected(room, key))) total++;
  }
  return total;
}

export function touchPlayer(room, key) {
  if (room.players.has(key) || room.waiting.has(key)) room.lastSeen.set(key, Date.now());
}

export function trackConnection(room, key, response) {
  if (!room.players.has(key) && !room.waiting.has(key)) return;
  room.livePlayers.set(key, (room.livePlayers.get(key) ?? 0) + 1);
  response.on('close', () => {
    const count = room.livePlayers.get(key) - 1;
    if (count) room.livePlayers.set(key, count);
    else room.livePlayers.delete(key);
    touchPlayer(room, key);
  });
}
