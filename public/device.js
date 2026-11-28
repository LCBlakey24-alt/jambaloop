// Is this screen the TV (the big shared screen) or a phone (a controller)?
// A Fire TV Stick's browser can look like a small phone to a web page: about 960×540 pixels and a "coarse"
// pointer (the remote). So the TV is recognised three ways: by the browser saying it is a TV, by having no
// touchscreen at all, or because someone pressed "This is my TV" (remembered on that device).
const KEY = 'jambaloop-screen';
// Fire TV model codes start with AFT; the rest are common smart-TV and console browser markers.
// JambaloopTV is the Jambaloop Fire TV app (fire-tv-app/). Only names that mean a TV: brand names alone (Hisense, AQUOS) also appear on those brands' phones.
const tvAgent = /\bJambaloopTV\b|\bAFT[A-Z0-9]{1,8}\b|AmazonWebAppPlatform|Android TV|Google ?TV|SMART-TV|SmartTV|\bTizen\b|Web0S|\bwebOS\b|NetCast|BRAVIA|HbbTV|\bCrKey\b|\bChromecast\b|AppleTV|\bRoku\b|VIDAA|Opera TV|PlayStation|\bXbox\b|\bViera\b|\bTV Safari\b/i;
// The layout every TV screen was designed and tested at.
export const tvLayoutWidth = 1280;

// A choice made for this visit only (a phone hosting just this once) wins over one remembered on the device.
const read = () => {
  try { return globalThis.sessionStorage?.getItem(KEY) ?? localStorage.getItem(KEY); } catch { return null; }
};
export function rememberScreen(kind, { visitOnly = false } = {}) {
  try {
    const store = visitOnly ? globalThis.sessionStorage : localStorage;
    globalThis.sessionStorage?.removeItem(KEY);
    if (kind === 'tv' || kind === 'phone') store.setItem(KEY, kind); else localStorage.removeItem(KEY);
  } catch { /* private mode: not remembered */ }
}

export const looksLikeTvBrowser = agent => tvAgent.test(String(agent ?? ''));
// maxTouchPoints follows the real hardware (0 on a Fire TV); 'ontouchstart' is present on every Android browser,
// touchscreen or not, so it is only used where maxTouchPoints is missing.
export const hasTouchscreen = (nav = globalThis.navigator, win = globalThis) => typeof nav?.maxTouchPoints === 'number' ? nav.maxTouchPoints > 0 : Boolean(win && 'ontouchstart' in win);

/** What this device is taken to be: 'tv' or 'phone' when known, otherwise undefined (a laptop or desktop). */
export function screenKind(env = globalThis) {
  const stored = read();
  // Joining a room from a QR code on a touchscreen is always a phone, whatever was chosen before.
  const joining = new URLSearchParams(env.location?.search ?? '').has('join') && hasTouchscreen(env.navigator, env);
  if (stored === 'tv' && joining) return undefined;
  if (stored === 'tv' || stored === 'phone') return stored;
  if (looksLikeTvBrowser(env.navigator?.userAgent)) return 'tv';
  // No touchscreen, steered by a remote rather than a mouse, on a landscape screen: a TV.
  const remote = env.matchMedia?.('(pointer: coarse), (pointer: none)').matches && !env.matchMedia?.('(any-pointer: fine)').matches;
  if (!hasTouchscreen(env.navigator, env) && remote && (env.screen?.width ?? 0) > (env.screen?.height ?? 0)) return 'tv';
  return undefined;
}
export const isTvScreen = (env = globalThis) => screenKind(env) === 'tv';

const LOADS = 'jambaloop-page-loads';
/** Note this page load (and why, when the TV app says so), keeping the last ten. */
export function recordPageLoad(env = globalThis) {
  try {
    const kind = env.performance?.getEntriesByType?.('navigation')?.[0]?.type ?? 'navigate';
    const reason = new URLSearchParams(env.location?.search ?? '').get('back') ?? '';
    const loads = JSON.parse(env.localStorage.getItem(LOADS) ?? '[]').slice(-9);
    loads.push({ at: new Date().toISOString(), kind, reason });
    env.localStorage.setItem(LOADS, JSON.stringify(loads));
    return loads;
  } catch { return []; }
}
const recentLoads = env => { try { return JSON.parse(env.localStorage.getItem(LOADS) ?? '[]'); } catch { return []; } };

/** Everything the device reports, for the screen check (?device) when a TV is not recognised. */
export function screenReport(env = globalThis) {
  const media = query => Boolean(env.matchMedia?.(query).matches);
  return {
    detected: screenKind(env) ?? 'computer', remembered: read() ?? 'no',
    agent: env.navigator?.userAgent ?? '', page: `${env.innerWidth}×${env.innerHeight}`, screen: `${env.screen?.width}×${env.screen?.height}`,
    pixelRatio: env.devicePixelRatio, touchPoints: env.navigator?.maxTouchPoints ?? 0,
    pointer: media('(pointer: fine)') ? 'fine' : media('(pointer: coarse)') ? 'coarse' : media('(pointer: none)') ? 'none' : 'unknown',
    hover: media('(hover: hover)'),
    // When the page last loaded: a reload here means the page really restarted (the TV app's engine was
    // stopped, or the app was reopened); none means a flash came from the screen redrawing, not a reload.
    loads: recentLoads(env).map(load => `${load.at.slice(5, 16).replace('T', ' ')} ${load.kind}${load.reason ? ' (' + load.reason + ')' : ''}`).join(' · ') || 'none recorded',
  };
}

/**
 * On a TV, lay the page out at 1280 wide (the size the TV screens were built for) and let the browser scale it
 * to the screen. Browsers that ignore this keep their own size; the layouts still work there.
 */
export function prepareTvScreen(doc = globalThis.document, env = globalThis) {
  if (!doc) return false;
  const tv = isTvScreen(env);
  doc.documentElement.classList.toggle('tv-screen', tv);
  const meta = doc.querySelector('meta[name="viewport"]');
  if (tv && meta && (env.innerWidth ?? tvLayoutWidth) < tvLayoutWidth - 80) meta.setAttribute('content', `width=${tvLayoutWidth}`);
  return tv;
}

/** ?tv or ?phone in the address sets this device's screen for good (until ?auto). */
export function readScreenChoice(search = globalThis.location?.search ?? '') {
  const params = new URLSearchParams(search);
  if (params.has('tv')) rememberScreen('tv');
  else if (params.has('phone')) rememberScreen('phone');
  else if (params.has('auto')) rememberScreen();
  return params.has('device');
}
