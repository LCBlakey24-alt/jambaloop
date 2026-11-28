// Is this screen the TV (the big shared screen) or a phone (a controller)?
// A Fire TV Stick's browser can look like a small phone to a web page: about 960×540 pixels and a "coarse"
// pointer (the remote). So the TV is recognised three ways: by the browser saying it is a TV, by having no
// touchscreen at all, or because someone pressed "This is my TV" (remembered on that device).
const KEY = 'jambaloop-screen';
// Fire TV model codes start with AFT; the rest are common smart-TV and console browser markers.
const tvAgent = /\bAFT[A-Z0-9]{1,8}\b|AmazonWebAppPlatform|Android TV|Google ?TV|SMART-TV|SmartTV|\bTizen\b|Web0S|\bwebOS\b|NetCast|BRAVIA|HbbTV|\bCrKey\b|AppleTV|\bRoku\b|VIDAA|Opera TV|PlayStation|\bXbox\b|\bViera\b|\bAQUOS\b|Hisense|\bTV Safari\b/i;
// The layout every TV screen was designed and tested at.
export const tvLayoutWidth = 1280;

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export function rememberScreen(kind) {
  try { if (kind === 'tv' || kind === 'phone') localStorage.setItem(KEY, kind); else localStorage.removeItem(KEY); } catch { /* private mode: not remembered */ }
}

export const looksLikeTvBrowser = agent => tvAgent.test(String(agent ?? ''));
export const hasTouchscreen = (nav = globalThis.navigator, win = globalThis) => (nav?.maxTouchPoints ?? 0) > 0 || Boolean(win && 'ontouchstart' in win);

/** What this device is taken to be: 'tv' or 'phone' when known, otherwise undefined (a laptop or desktop). */
export function screenKind(env = globalThis) {
  const stored = read();
  if (stored === 'tv' || stored === 'phone') return stored;
  if (looksLikeTvBrowser(env.navigator?.userAgent)) return 'tv';
  // No touchscreen, steered by a remote rather than a mouse, on a landscape screen: a TV.
  const remote = env.matchMedia?.('(pointer: coarse), (pointer: none)').matches && !env.matchMedia?.('(any-pointer: fine)').matches;
  if (!hasTouchscreen(env.navigator, env) && remote && (env.screen?.width ?? 0) > (env.screen?.height ?? 0)) return 'tv';
  return undefined;
}
export const isTvScreen = (env = globalThis) => screenKind(env) === 'tv';

/** Everything the device reports, for the screen check (?device) when a TV is not recognised. */
export function screenReport(env = globalThis) {
  const media = query => Boolean(env.matchMedia?.(query).matches);
  return {
    detected: screenKind(env) ?? 'computer', remembered: read() ?? 'no',
    agent: env.navigator?.userAgent ?? '', page: `${env.innerWidth}×${env.innerHeight}`, screen: `${env.screen?.width}×${env.screen?.height}`,
    pixelRatio: env.devicePixelRatio, touchPoints: env.navigator?.maxTouchPoints ?? 0,
    pointer: media('(pointer: fine)') ? 'fine' : media('(pointer: coarse)') ? 'coarse' : media('(pointer: none)') ? 'none' : 'unknown',
    hover: media('(hover: hover)'),
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
