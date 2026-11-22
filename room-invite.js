// Build QR invitations from a reachable network origin; never trust forwarded headers.
const privateAddress = address => {
  const parts = String(address).split('.').map(Number);
  return parts.length === 4 && parts.every(x => Number.isInteger(x) && x >= 0 && x <= 255) &&
    (parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168));
};
const virtualInterface = name => /vEthernet|virtual|vmware|hyper-v|wsl|docker|br-|vbox|tailscale|wireguard|tun\d|vpn|zerotier|loopback/i.test(name);
const preferredInterface = name => /wi-?fi|wireless|wlan|ethernet|^eth\d|^en\d|^enp|^wlp|local area connection/i.test(name);

export function canonicalPublicOrigin(value) {
  if (!value) return undefined;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_URL must be an HTTP(S) origin without a path, query or credentials.');
  }
  return url.origin;
}

export function inviteOriginOptions({publicUrl, host, protocol = 'http', port, interfaces = {}}) {
  const canonical = canonicalPublicOrigin(publicUrl);
  if (canonical) return [{label: 'Public website', origin: canonical}];

  let browserOrigin;
  try {
    // Host is read only from Host, never from attacker-supplied forwarded headers.
    if (typeof host !== 'string' || !/^[a-z0-9.\-:\[\]]+$/i.test(host)) throw new Error('Invalid Host');
    const candidate = new URL(protocol + '://' + host);
    if (!['http:', 'https:'].includes(candidate.protocol) || candidate.username ||
        candidate.password || candidate.pathname !== '/' || candidate.search || candidate.hash) throw new Error('Invalid Host');
    browserOrigin = candidate.origin;
  } catch { /* Local Wi-Fi candidate is still useful without a valid host header. */ }

  const results = [];
  const add = (origin, label) => {
    if (!results.some(option => option.origin === origin)) results.push({origin, label});
  };
  const browserHost = browserOrigin ? new URL(browserOrigin).hostname : '';
  const loopback = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(browserHost);
  if (browserOrigin && !loopback) add(browserOrigin, 'Current website · ' + browserHost);

  const devices = Object.entries(interfaces).flatMap(([name, items]) =>
    (items || []).filter(item => (item.family === 'IPv4' || item.family === 4) &&
      !item.internal && privateAddress(item.address)).map(item => ({name, address: item.address})));
  devices.sort((a, b) => {
    const rank = name => virtualInterface(name) ? 2 : preferredInterface(name) ? 0 : 1;
    return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name) || a.address.localeCompare(b.address);
  });
  for (const item of devices) {
    add('http://' + item.address + ':' + port, item.name + ' · ' + item.address);
  }
  if (browserOrigin && loopback) add(browserOrigin, 'This laptop only · cannot connect a phone');
  if (!results.length) add('http://localhost:' + port, 'This laptop only · connect to Wi-Fi');
  return results;
}

export function qrJoinUrl(origin, code) {
  if (!/^\d{6}$/.test(String(code))) throw new Error('Invalid room code.');
  return new URL('/?join=' + code, canonicalPublicOrigin(origin)).href;
}
