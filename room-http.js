import { networkInterfaces } from 'node:os';

export function positiveSetting(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw new Error(name + ' must be a positive integer.');
  }
  return Number(value);
}

export function publicOrigin(value) {
  if (!value) return undefined;
  const url = URL.canParse(value) ? new URL(value) : undefined;
  if (!/^https?:\/\//i.test(value) || !url || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_URL must be an HTTP(S) origin with no credentials, path, query or fragment.');
  }
  return url.origin;
}

export function localOrigin(address, port) {
  const lan = Object.values(networkInterfaces()).flat().find(entry => entry.family === 'IPv4' && !entry.internal);
  const host = address === '127.0.0.1' ? (lan?.address ?? address) : address;
  return 'http://' + host + ':' + port;
}

export function requestBudget(limit, windowMs = 60_000, bucketLimit = 4096) {
  const buckets = new Map();
  function sweep(now = Date.now()) {
    for (const [key, bucket] of buckets) if (bucket.expires <= now) buckets.delete(key);
  }
  function retryIn(key, now = Date.now()) {
    const current = buckets.get(key);
    if (current?.expires > now) {
      if (current.count >= limit) return Math.ceil((current.expires - now) / 1000);
      current.count++;
      return 0;
    }
    if (buckets.size >= bucketLimit) sweep(now);
    if (buckets.size >= bucketLimit) return Math.ceil(windowMs / 1000);
    buckets.set(key, { count: 1, expires: now + windowMs });
    return 0;
  }
  return { retryIn, sweep };
}

export function readAvatar(value) {
  if (typeof value !== 'string' || value.length > 14_000) return;
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return;
  const bytes = Buffer.from(match[1], 'base64');
  if (bytes.length < 8 || bytes.toString('base64') !== match[1]) return;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) return;
  return bytes;
}

export function isRoomMember(room, key) {
  return key === room.host || room.players.has(key) || room.waiting.has(key);
}
