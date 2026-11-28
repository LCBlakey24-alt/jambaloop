// Installing Jambaloop on a phone, from the browser: no app store. Chrome, Edge and Samsung Internet
// offer it through their own install prompt, which this keeps until the player taps "Install Jambaloop";
// on an iPhone or iPad it is Safari's Share button, then Add to Home Screen, so the button explains that.
// Never offered on the TV (the Fire TV has its own app) or when Jambaloop is already running as an app.
let deferred;
let installed = false;
const listeners = new Set();
const notify = () => listeners.forEach(listener => listener());

export const runningAsApp = (win = globalThis) => Boolean(win.matchMedia?.('(display-mode: standalone)').matches || win.navigator?.standalone);
export const isAppleMobile = (nav = globalThis.navigator) => /iPhone|iPad|iPod/.test(nav?.userAgent ?? '')
  || (nav?.platform === 'MacIntel' && nav?.maxTouchPoints > 1);

/** What this phone can do: 'prompt' (one tap installs), 'ios' (Share → Add to Home Screen) or '' (nothing to offer). */
export function installKind({ win = globalThis, isTv = () => false } = {}) {
  if (installed || isTv() || runningAsApp(win)) return '';
  if (deferred) return 'prompt';
  return isAppleMobile(win.navigator) ? 'ios' : '';
}

/** Register the service worker and listen for the browser's install offer. Call once at start-up. */
export function setUpInstall({ win = globalThis, isTv = () => false } = {}) {
  win.addEventListener?.('beforeinstallprompt', event => {
    event.preventDefault();
    deferred = event;
    notify();
  });
  win.addEventListener?.('appinstalled', () => {
    installed = true;
    deferred = undefined;
    notify();
  });
  // The TV app shows its own offline screen, so the TV does not need the service worker.
  if (isTv() || !win.navigator?.serviceWorker || !win.isSecureContext) return;
  win.addEventListener('load', () => win.navigator.serviceWorker.register('/sw.js').catch(() => {}), { once: true });
}

export function onInstallChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The phone home's install offer, or '' when there is nothing to offer on this device. */
export function installOfferView(kind, icons = () => '') {
  if (kind === 'prompt') return `<div class="install-offer"><button type="button" class="button outline install-app" data-action="install-app">${icons('download')} Install Jambaloop</button>
    <small>Adds Jambaloop to your home screen, like an app. No app store needed.</small></div>`;
  if (kind === 'ios') return `<details class="install-offer install-offer-ios"><summary>${icons('download')} Add Jambaloop to your home screen</summary>
    <p>In Safari, tap the Share button <span aria-hidden="true">(the square with an arrow)</span>, then <strong>Add to Home Screen</strong>.</p></details>`;
  return '';
}

/** Show the browser's own install question. Resolves true if the player installed. */
export async function promptInstall() {
  const event = deferred;
  if (!event) return false;
  deferred = undefined;
  notify();
  event.prompt();
  const choice = await event.userChoice.catch(() => ({ outcome: 'dismissed' }));
  if (choice.outcome === 'accepted') installed = true;
  notify();
  return choice.outcome === 'accepted';
}
