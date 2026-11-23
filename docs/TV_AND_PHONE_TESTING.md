# Jambaloop — Single-screen TV and phone QR testing

Status: feature branch `feature/04-quiz-race-mvp`, draft PR #5. The feature has not been merged or deployed.

## Update the laptop copy

In a terminal inside the existing Git clone (the folder containing `package.json` and `.git`):

```powershell
git switch feature/04-quiz-race-mvp
git pull origin feature/04-quiz-race-mvp
npm ci
npm start
```

Open `http://localhost:3000` on that laptop. If using a downloaded ZIP instead of a Git clone, download the **new ZIP for this branch**, extract it, then run `npm ci` and `npm start` in that extracted folder. Do not start from inside the ZIP.

## TV/laptop viewport expectations

- Click **Host a game** or **Open party lobby**, select Quiz Race and start after players join.
- The host stage is designed to fit into a normal laptop viewport (approximately 1366×768 or larger) and an HD/Full HD TV, with no browser-page scrolling.
- The host navigation bar is hidden during play; the on-stage **Home**, **Fullscreen** and game controls remain.
- The TV lobby removes the duplicate heading and nonessential "How to answer" panel so the QR, room code, roster and controls are visible. Phones still have their own layouts.
- The winding race SVG now grows/shrinks to the leftover vertical space rather than extending the page.
- This has only been verified through source review and automated tests. It still requires browser layout checks at 1366×768, 1920×1080, landscape 1024×768 and browser zoom. A very short browser viewport may use the original scroll layout instead of clipping essential controls.

## QR troubleshooting on a Windows laptop

1. Connect laptop and phones to the **same normal Wi-Fi**, not a guest network with client isolation. Use an ordinary home network for local testing. Mobile data alone cannot reach the laptop's local address.
2. Launch `npm start` after the laptop has connected to Wi-Fi.
3. Open a Jambaloop room. The QR should encode an address like `http://192.168.1.83:3000/?join=123456` (illustrative only; use the actual displayed URL).
4. Beneath the room number, check **Phone connection address**. If multiple adapters appear, choose the physical **Wi-Fi** or **Ethernet** address. Avoid `vEthernet`, WSL, Docker and VPN adapters for ordinary home Wi-Fi testing. The URL and QR update together.
5. On Windows, run `ipconfig` and find the IPv4 Address under **Wireless LAN adapter Wi-Fi** (or Ethernet if wired). Confirm it matches the address selected in the lobby.
6. Type the **full displayed URL** directly into the phone's browser. If that works, the corresponding QR should work. If it fails, focus on the network/firewall first, not QR scanning.
7. If Windows asks whether Node.js may communicate, permit **Private networks**. If blocked, allow the specific Node.js executable or TCP port 3000 on the **Private** network profile only. Do **not** disable the firewall altogether.
8. Disable any VPN temporarily during the test, if one reroutes local traffic. If no suitable Wi-Fi address appears, reconnect the laptop to Wi-Fi and restart the Node server.
9. If phones still cannot reach the laptop, confirm router client isolation/guest networking are off and both devices are on the same local subnet.

When Jambaloop is eventually deployed publicly, set `PUBLIC_URL` to the actual HTTPS origin. A local LAN URL is not a public internet address.

## Automated regression coverage

- `test/room-invite.test.js`: physical Wi-Fi prioritisation over virtual NICs, explicit canonical URLs, invalid origins and safe localhost fallback.
- `test/room-invite-integration.test.js`: server-created QR URL, host-only adapter selection, rejection of arbitrary URL overrides and updated host snapshot after selecting a different address.
- Existing Node and Quiz Race engine/API tests continue running in GitHub Actions.

## Known verification gaps

- No direct evidence of the reported phone connection succeeding on a physical device yet.
- Some older non-Quiz Race modes may have unusually dense text; they need full-screen visual inspection. The host can be responsive at common laptop/TV sizes but extreme zoom or very short windows may require a different layout.
- The network selector cannot change Wi-Fi, Windows Firewall, network isolation or VPN settings by itself.
- Keep PR #2 (room security/reconnect) and PR #3 (home redesign) separate during subsequent merges; reconcile changes explicitly.
