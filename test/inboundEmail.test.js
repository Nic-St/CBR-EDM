import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleInboundEmail } from '../src/lib/inboundEmail.js';

// A minimal real MIME multipart message: a plain text part and one small
// PNG attachment (a 1x1 transparent pixel), so PostalMime has something
// genuine to parse rather than a hand-shaped stub.
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function buildRawEmail() {
  const boundary = 'testboundary123';
  return [
    `From: crew@example.com`,
    `To: events@example.com`,
    `Subject: New event: Deep Signal`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    'Deep Signal is happening next month. Flyer attached.',
    '',
    `--${boundary}`,
    'Content-Type: image/png; name="flyer.png"',
    'Content-Disposition: attachment; filename="flyer.png"',
    'Content-Transfer-Encoding: base64',
    '',
    PNG_BASE64,
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

function fakeMessage(rawText) {
  return {
    from: 'crew@example.com',
    to: 'events@example.com',
    rawSize: rawText.length,
    raw: new Blob([rawText]).stream(),
    setReject() { this.rejected = true; },
  };
}

function fakeEnv() {
  const inserted = [];
  const r2Puts = [];
  const alerts = [];
  return {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async run() { inserted.push({ sql, args }); },
              async first() { return null; },
            };
          },
        };
      },
    },
    FLYERS: {
      async put(key, content, options) { r2Puts.push({ key, size: content.byteLength, options }); },
    },
    EMAIL: { async send(msg) { alerts.push(msg); } },
    ADMIN_EMAIL: 'admin@example.com',
    _inserted: inserted,
    _r2Puts: r2Puts,
    _alerts: alerts,
  };
}

test('a plain text email with an image attachment is stored and alerts the admin', async () => {
  const env = fakeEnv();
  const message = fakeMessage(buildRawEmail());

  await handleInboundEmail(message, env);

  assert.equal(env._inserted.length, 1);
  const [id, receivedAt, fromAddress, subject, textBody, attachmentsJson, state] = env._inserted[0].args;
  assert.equal(fromAddress, 'crew@example.com');
  assert.equal(subject, 'New event: Deep Signal');
  assert.match(textBody, /Deep Signal is happening/);
  assert.equal(state, 'new');

  const attachments = JSON.parse(attachmentsJson);
  assert.equal(attachments.length, 1);
  assert.equal(attachments[0].content_type, 'image/png');
  assert.equal(attachments[0].filename, 'flyer.png');

  assert.equal(env._r2Puts.length, 1);
  assert.ok(env._r2Puts[0].key.startsWith('inbound/'));

  assert.equal(env._alerts.length, 1);
  assert.match(env._alerts[0].subject, /New inbound email/);
});

test('an oversized message is rejected and never parsed or stored', async () => {
  const env = fakeEnv();
  const message = fakeMessage(buildRawEmail());
  message.rawSize = 999_999_999;

  await handleInboundEmail(message, env);

  assert.equal(message.rejected, true);
  assert.equal(env._inserted.length, 0);
});

test('a non-image attachment is dropped, keeping only images', async () => {
  const boundary = 'b2';
  const raw = [
    'From: crew@example.com', 'To: events@example.com', 'Subject: Mixed attachments',
    'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/plain; charset=utf-8', '', 'See attached.', '',
    `--${boundary}`, 'Content-Type: application/pdf; name="rider.pdf"',
    'Content-Disposition: attachment; filename="rider.pdf"', 'Content-Transfer-Encoding: base64', '',
    'JVBERi0xLjQK', '',
    `--${boundary}`, 'Content-Type: image/png; name="flyer.png"',
    'Content-Disposition: attachment; filename="flyer.png"', 'Content-Transfer-Encoding: base64', '',
    PNG_BASE64, '',
    `--${boundary}--`, '',
  ].join('\r\n');

  const env = fakeEnv();
  await handleInboundEmail(fakeMessage(raw), env);

  const attachments = JSON.parse(env._inserted[0].args[5]);
  assert.equal(attachments.length, 1);
  assert.equal(attachments[0].content_type, 'image/png');
});
