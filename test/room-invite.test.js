import assert from 'node:assert/strict';
import test from 'node:test';
import {canonicalPublicOrigin, inviteOriginOptions, qrJoinUrl} from '../room-invite.js';

const wifi = {
  'vEthernet (WSL)': [{family: 'IPv4', address: '172.22.4.2', internal: false}],
  'Wi-Fi': [{family: 'IPv4', address: '192.168.1.83', internal: false}],
  Loopback: [{family: 'IPv4', address: '127.0.0.1', internal: true}],
};

test('Wi-Fi is preferred over virtual adapters and localhost QR is never first when Wi-Fi exists', () => {
  const options = inviteOriginOptions({host: 'localhost:3000', protocol: 'http', port: 3000, interfaces: wifi});
  assert.equal(options[0].origin, 'http://192.168.1.83:3000');
  assert.ok(options.some(o => o.origin === 'http://172.22.4.2:3000'));
  assert.equal(qrJoinUrl(options[0].origin,'123456'), 'http://192.168.1.83:3000/?join=123456');
});

test('Public URL overrides local addresses and untrusted forwarded headers are never supplied', () => {
  const result = inviteOriginOptions({publicUrl: 'https://play.example.org',host:'localhost:3000',port:3000,interfaces:wifi});
  assert.deepEqual(result,[{origin:'https://play.example.org',label:'Public website'}]);
});

test('An explicit LAN host remains available alongside other interfaces', () => {
  const result = inviteOriginOptions({host:'192.168.1.97:3000', port:3000, interfaces:wifi});
  assert.equal(result[0].origin,'http://192.168.1.97:3000');
  assert.ok(result.some(o=>o.origin==='http://192.168.1.83:3000'));
});

test('No LAN address falls back to localhost with a visible warning', () => {
  const result = inviteOriginOptions({host:'localhost:3000',port:3000,interfaces:{}});
  assert.equal(result[0].origin,'http://localhost:3000');
  assert.match(result[0].label,/cannot connect a phone/);
});

test('Bad configured origins and invalid codes are rejected', () => {
  for (const url of ['javascript:alert(1)','https://example.org/login','https://user:pass@example.org',
      'https://example.org/?x=1','https://example.org/#hello']) {
    assert.throws(()=>canonicalPublicOrigin(url));
  }
  assert.throws(()=>qrJoinUrl('http://localhost:3000','1'));
  assert.equal(inviteOriginOptions({host:'evil.com@localhost:3000',port:3000,interfaces:wifi})[0].origin,
    'http://192.168.1.83:3000');
});
