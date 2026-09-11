import PostalMime from 'postal-mime';
import { generateId } from './ids.js';
import { sendAdminAlert } from './email.js';

const MAX_EMAIL_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_ATTACHMENTS = 3;

/**
 * A minimal HTML-to-text fallback for when a message has no plain text
 * part, section 10.6. Not a sanitiser: the result is stored and shown as
 * plain text only, never rendered as HTML.
 * @param {string} html
 */
function stripHtml(html) {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Handles one inbound email at events@domain, section 10.6. Kept light so
 * it stays within the Workers Free plan's CPU time budget.
 * @param {ForwardableEmailMessage} message
 * @param {import('./env.js').Env} env
 */
export async function handleInboundEmail(message, env) {
  if (message.rawSize > MAX_EMAIL_BYTES) {
    message.setReject('Message too large');
    return;
  }

  const parsed = await PostalMime.parse(message.raw);

  const textBody = parsed.text || (parsed.html ? stripHtml(parsed.html) : '') || '';

  const imageAttachments = (parsed.attachments || [])
    .filter((attachment) => (attachment.mimeType || '').startsWith('image/'))
    .slice(0, MAX_IMAGE_ATTACHMENTS);

  const storedAttachments = [];
  for (const attachment of imageAttachments) {
    const key = `inbound/${generateId()}`;
    await env.FLYERS.put(key, attachment.content, {
      httpMetadata: { contentType: attachment.mimeType },
    });
    storedAttachments.push({
      r2_key: key,
      filename: attachment.filename || 'attachment',
      content_type: attachment.mimeType,
      size: attachment.content.byteLength,
    });
  }

  const id = generateId('mail');
  await env.DB.prepare(
    'INSERT INTO inbound_emails (id, received_at, from_address, subject, text_body, attachments_json, state) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).bind(
    id, new Date().toISOString(), message.from, parsed.subject || null, textBody,
    JSON.stringify(storedAttachments), 'new',
  ).run();

  // Build the admin link from the recipient's own domain (e.g.
  // events@yourdomain), since there is no request object here to read it
  // from, the way the other admin alert call sites do.
  const domain = message.to.split('@')[1] || 'cbredm.org';
  await sendAdminAlert(env, {
    subject: `New inbound email: ${parsed.subject || 'no subject'}`,
    path: `https://${domain}/admin/inbound-emails/${id}`,
    summary: `An email arrived from ${message.from}. Check the admin queue to read it.`,
  });
}
