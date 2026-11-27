// A phone taps "Scan the QR code on the TV": the camera reads the room's QR
// code, fills in the room code, switches itself off and turns to the name and
// selfie page. The camera is simulated with a generated video of a real room
// QR code. Also checks that a phone-sized screen never shows a QR code itself.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { chromium } from 'playwright';

const site = process.env.SITE || 'http://127.0.0.1:32000';
const call = async (path, key, data) => {
  const response = await fetch(site + '/api/rooms' + path, { method: data === undefined ? 'GET' : 'POST', headers: { ...(key && { 'x-game-key': key }), 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
  return response.status === 204 ? undefined : response.json();
};
/** A short Y4M clip of `text` as a QR code on a white card, for Chromium's fake camera. */
function qrVideo(text, file) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const width = 640, height = 480, cell = Math.floor(360 / (modules.size + 8)), offsetX = Math.floor((width - cell * modules.size) / 2), offsetY = Math.floor((height - cell * modules.size) / 2);
  const luma = Buffer.alloc(width * height, 235);
  for (let row = 0; row < modules.size; row++) for (let column = 0; column < modules.size; column++) {
    if (!modules.get(row, column)) continue;
    for (let y = 0; y < cell; y++) luma.fill(16, (offsetY + row * cell + y) * width + offsetX + column * cell, (offsetY + row * cell + y) * width + offsetX + (column + 1) * cell);
  }
  const frame = Buffer.concat([Buffer.from('FRAME\n'), luma, Buffer.alloc(width * height / 2, 128)]);
  writeFileSync(file, Buffer.concat([Buffer.from(`YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420jpeg\n`), ...Array(10).fill(frame)]));
}

const { code, host } = await call('', undefined, { mode: 'classic', category: 'mixed', count: 5, seconds: 0, picker: true });
const lobby = await call('/' + code, host);
const feed = join(mkdtempSync(join(tmpdir(), 'jambaloop-qr-')), 'room.y4m');
qrVideo(lobby.joinUrl, feed);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + feed] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ['camera'] });
  const phone = await context.newPage();
  const errors = [];
  phone.on('pageerror', error => errors.push(error.message));
  await phone.goto(site + '/');
  await phone.locator('.home-actions [data-action="join"]').tap();
  const scan = phone.locator('[data-action="scan-start"]');
  await scan.waitFor({ timeout: 10000 });
  assert.equal(await phone.locator('#join-room-code').inputValue(), '', 'nothing filled in yet');
  await scan.tap();
  await phone.waitForFunction(expected => document.querySelector('#join-room-code')?.value === expected, code, { timeout: 25000 });
  assert.match(await phone.locator('.join-scan-or').innerText(), new RegExp('Room ' + code + ' found'));
  assert.equal(await phone.evaluate(() => Boolean(document.querySelector('[data-scan-video]').srcObject)), false, 'the camera is switched off once the code is read');
  console.log('PASS: the camera reads the room QR code and fills in the room code');
  // The paged join screen turns to the name and selfie page by itself.
  const name = phone.locator('#join-player-name');
  await name.waitFor({ state: 'visible', timeout: 8000 });
  assert.equal(await phone.evaluate(() => document.querySelector('.join-photo-option').open), true, 'the selfie option is open');
  await name.fill('Scanner');
  await phone.locator('.join-room-submit').tap();
  await phone.waitForFunction(expected => JSON.parse(sessionStorage.getItem('quizmas-session') || '{}').code === expected, code, { timeout: 10000 });
  console.log('PASS: name and selfie page, then into the room');
  await phone.waitForTimeout(1500);
  assert.equal(await phone.locator('img.qr:visible').count(), 0, 'a phone never shows a QR code');
  // Hosting on a phone anyway: the room code is shown, the QR code is not.
  const hostPhone = await context.newPage();
  await hostPhone.addInitScript(([code, key]) => { sessionStorage.setItem('quizmas-session', JSON.stringify({ code, key, host: true })); sessionStorage.setItem('jambaloop-welcomed', code); }, [code, host]);
  await hostPhone.goto(site + '/?room=' + code);
  await hostPhone.locator('.game.host-screen').waitFor({ timeout: 10000 });
  await hostPhone.waitForTimeout(800);
  await hostPhone.screenshot({ path: 'browser-screenshots/qr-scan-host-phone.png' });
  assert.match(await hostPhone.locator('.game.host-screen').innerText(), new RegExp(code), 'the room code is still there to read out');
  assert.equal(await hostPhone.locator('img.qr:visible').count(), 0, 'no QR code on a phone-sized host screen');
  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: phone-sized screens show the room code but no QR code');
} finally { await browser.close(); }
