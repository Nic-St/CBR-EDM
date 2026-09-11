import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { verifyAccessJwt } from '../src/lib/auth.js';

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlJson(obj) {
  return base64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

async function makeKeyPair() {
  return crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
}

async function signJwt(privateKey, header, payload) {
  const signedData = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(signedData));
  return `${signedData}.${base64Url(new Uint8Array(signature))}`;
}

let originalFetch;
const jwksByDomain = {};

before(() => {
  originalFetch = global.fetch;
  global.fetch = async (url) => {
    const domain = new URL(url).host;
    const keys = jwksByDomain[domain];
    return {
      ok: Boolean(keys),
      json: async () => ({ keys: keys || [] }),
    };
  };
});

after(() => {
  global.fetch = originalFetch;
});

async function setupTestToken(domain, { audience = 'test-aud', expiresInSeconds = 3600, overridePayload = {} } = {}) {
  const { publicKey, privateKey } = await makeKeyPair();
  const jwk = await crypto.subtle.exportKey('jwk', publicKey);
  jwk.kid = 'test-kid';
  jwksByDomain[domain] = [jwk];

  const header = { alg: 'RS256', kid: 'test-kid' };
  const payload = {
    aud: audience,
    iss: `https://${domain}`,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    email: 'admin@example.com',
    ...overridePayload,
  };
  return signJwt(privateKey, header, payload);
}

function requestWithToken(token) {
  return new Request('https://example.com/admin', {
    headers: token ? { 'Cf-Access-Jwt-Assertion': token } : {},
  });
}

test('a validly signed, current token verifies and returns its payload', async () => {
  const domain = 'team-1.cloudflareaccess.com';
  const token = await setupTestToken(domain);
  const payload = await verifyAccessJwt(requestWithToken(token), { ACCESS_TEAM_DOMAIN: domain, ACCESS_AUD: 'test-aud' });
  assert.equal(payload.email, 'admin@example.com');
});

test('missing header returns null', async () => {
  const payload = await verifyAccessJwt(requestWithToken(null), { ACCESS_TEAM_DOMAIN: 'team-2.cloudflareaccess.com', ACCESS_AUD: 'test-aud' });
  assert.equal(payload, null);
});

test('wrong audience is rejected', async () => {
  const domain = 'team-3.cloudflareaccess.com';
  const token = await setupTestToken(domain, { audience: 'someone-elses-aud' });
  const payload = await verifyAccessJwt(requestWithToken(token), { ACCESS_TEAM_DOMAIN: domain, ACCESS_AUD: 'test-aud' });
  assert.equal(payload, null);
});

test('expired token is rejected', async () => {
  const domain = 'team-4.cloudflareaccess.com';
  const token = await setupTestToken(domain, { expiresInSeconds: -10 });
  const payload = await verifyAccessJwt(requestWithToken(token), { ACCESS_TEAM_DOMAIN: domain, ACCESS_AUD: 'test-aud' });
  assert.equal(payload, null);
});

test('a token signed by a key not in the JWKS is rejected', async () => {
  const domain = 'team-5.cloudflareaccess.com';
  await setupTestToken(domain); // populates jwksByDomain with a *different* key than the one below
  const { privateKey } = await makeKeyPair();
  const forgedToken = await signJwt(
    privateKey,
    { alg: 'RS256', kid: 'test-kid' },
    { aud: 'test-aud', iss: `https://${domain}`, exp: Math.floor(Date.now() / 1000) + 3600, email: 'attacker@example.com' },
  );
  const payload = await verifyAccessJwt(requestWithToken(forgedToken), { ACCESS_TEAM_DOMAIN: domain, ACCESS_AUD: 'test-aud' });
  assert.equal(payload, null);
});

test('a token whose issuer does not match the configured team domain is rejected', async () => {
  const domain = 'team-6.cloudflareaccess.com';
  const token = await setupTestToken(domain, { overridePayload: { iss: 'https://some-other-team.cloudflareaccess.com' } });
  const payload = await verifyAccessJwt(requestWithToken(token), { ACCESS_TEAM_DOMAIN: domain, ACCESS_AUD: 'test-aud' });
  assert.equal(payload, null);
});
