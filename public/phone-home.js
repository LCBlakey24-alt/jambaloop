// The phone's home screen (owner direction, 28 November 2026): a phone is a remote control, so before it joins a
// room it shows one simple screen: the logo, Resume for a room this phone was playing in, a big Join card and one
// line for whoever is hosting. The full game launcher is still there, one tap away under "See the games".
// Phones only (app.js decides with the same phone test as the rest of the phone layout); TVs and laptops keep the
// launcher exactly as it was.

/**
 * @param {{ rooms?: Array<{code: string, name?: string, mode?: string}>, scan?: boolean }} details
 *   rooms: this phone's recent rooms, newest first (room-session.js recentRooms); scan: the camera can read a QR code.
 */
export function phoneHomeView({ rooms = [], scan = false } = {}, { escape, icons, modeName }) {
  const recent = rooms[0];
  const resume = recent ? `<div class="phone-resume-wrap">
      <button type="button" class="phone-resume" data-action="resume-room" data-code="${escape(recent.code)}">
        <span class="phone-resume-icon" aria-hidden="true">${icons('rotate-ccw')}</span>
        <span class="phone-resume-copy"><small>Resume your game</small>
          <strong>${escape(recent.name ? 'Play as ' + recent.name : 'Room ' + recent.code)}</strong>
          <small>${escape([modeName(recent.mode), 'Room ' + recent.code].filter(Boolean).join(' · '))}</small></span>
        <span class="phone-resume-arrow" aria-hidden="true">${icons('chevron-right')}</span>
      </button>
      ${rooms.length > 1 ? '<button type="button" class="text-button phone-home-link" data-action="recent-rooms">Other rooms</button>' : ''}
    </div>` : '';
  return `<section class="phone-home" aria-labelledby="phone-home-title">
    <h1 id="phone-home-title" class="phone-home-logo"><img src="/branding/jambaloop-logo-white.webp" alt="Jambaloop" width="1561" height="324"></h1>
    ${resume}
    <form id="home-join-form" class="phone-join" autocomplete="on" aria-labelledby="phone-join-title">
      <h2 id="phone-join-title">Join a game</h2>
      <p class="phone-join-help">Type the room code from the TV, then your name.</p>
      <label class="join-room-field" for="home-room-code">Room code
        <input id="home-room-code" name="code" placeholder="123456" inputmode="numeric" autocomplete="off" enterkeyhint="next"
          pattern="[0-9]{6}" maxlength="6" required>
      </label>
      <label for="home-player-name">Your name
        <input id="home-player-name" name="name" placeholder="What should we call you?" autocomplete="nickname" maxlength="24"
          enterkeyhint="go" value="${escape(recent?.name ?? '')}" required>
      </label>
      <p class="error" role="alert"></p>
      <button class="button primary phone-join-submit" type="submit">Join ${icons('arrow-up-right')}</button>
      ${scan ? `<button type="button" class="button outline phone-join-scan" data-action="join" data-scan="1">${icons('camera')} Scan the QR code instead</button>` : ''}
    </form>
    <div class="phone-home-foot">
      <div class="phone-home-install" data-install-slot hidden></div>
      <p class="phone-home-host">Hosting? <button type="button" class="text-button" data-action="party">Open Jambaloop on your TV</button></p>
      <p class="error" role="alert" data-host-error></p>
      <button type="button" class="text-button phone-home-link phone-home-browse" data-action="phone-browse">See the games</button>
    </div>
  </section>`;
}
