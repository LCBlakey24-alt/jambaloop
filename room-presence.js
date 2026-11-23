export const reconnectWindow = 18_000;

export function liveConnection(room, key) {
  const response = room.liveConnections.get(key);
  return response && !response.destroyed && !response.writableEnded ? response : undefined;
}

export function isConnected(room, key, now = Date.now()) {
  return Boolean(liveConnection(room, key)) || (room.lastSeen.get(key) ?? 0) + reconnectWindow > now;
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
  room.liveConnections.set(key, response);
  response.once('close', () => {
    if (room.liveConnections.get(key) !== response) return;
    room.liveConnections.delete(key);
    touchPlayer(room, key);
  });
}
