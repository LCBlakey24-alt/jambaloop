export function stopDeadline(room) {
  clearTimeout(room.deadline);
  room.deadline = undefined;
}

export function clockExpired(room, now = Date.now()) {
  return Boolean(room.ends && !room.pausedAt && now >= room.ends);
}

export function watchDeadline(room, expire) {
  stopDeadline(room);
  if (!room.ends || room.pausedAt) return;
  room.deadline = setTimeout(() => {
    if (clockExpired(room)) expire();
    else watchDeadline(room, expire);
  }, Math.max(1, room.ends - Date.now()));
}

export function setClockPaused(room, pause, now = Date.now()) {
  if (pause) {
    stopDeadline(room);
    room.pausedAt = now;
  } else {
    const breakTime = now - room.pausedAt;
    room.opened += breakTime;
    room.ends += breakTime;
    room.pausedAt = 0;
  }
  room.clockVersion++;
}
