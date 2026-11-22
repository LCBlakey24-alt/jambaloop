# Chromium browser regressions

Start the local Jambaloop server in one terminal. The browser tests are opt-in and require Playwright Core and a Chromium executable. They use temporary rooms on the supplied server.

```bash
npm ci
npm start
```

In another terminal, install the browser test runner outside the app and run the fixture.

```bash
npm install --prefix /tmp/jambaloop-browser playwright-core
JAMBALOOP_BROWSER_URL=http://localhost:3000 \
  JAMBALOOP_PLAYWRIGHT_MODULE=/tmp/jambaloop-browser/node_modules/playwright-core \
  JAMBALOOP_CHROMIUM=/usr/bin/chromium \
  node --test test/browser/lobby-regressions.test.js
```

If Playwright Core is already available to Node, omit `JAMBALOOP_PLAYWRIGHT_MODULE`. When using Playwright-managed Chromium, install the browser with Playwright and omit `JAMBALOOP_CHROMIUM`.
