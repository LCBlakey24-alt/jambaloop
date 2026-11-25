export function stopDeadline(room) {
  clearTimeout(room.deadline);
  room.deadline = undefined;
}

export function clockExpired(room, now = Date.now()) {
  return Boolean(room.ends && !room.pausedAt && now >= room.ends);
}

/**
 * Run a room's timer work so that a fault in one room is logged instead of
 * escaping the timer as an uncaught exception, which would stop the whole
 * server and lose every room held in memory.
 */
export function roomTask(room, label, task) {
  try { task(); }
  catch (error) { console.error(`Room ${label} failed:`, error?.name ?? 'Error', error?.message ?? ''); }
}

export function watchDeadline(room, expire) {
  stopDeadline(room);
  if (!room.ends || room.pausedAt) return;
  room.deadline = setTimeout(() => roomTask(room, 'deadline', () => {
    if (clockExpired(room)) expire();
    else watchDeadline(room, expire);
  }), Math.max(1, room.ends - Date.now()));
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
