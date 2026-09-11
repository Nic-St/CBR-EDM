import { config } from '../config.js';

/**
 * Sends a short admin alert email, section 10.3. One binding, restricted to
 * the single verified project mailbox by wrangler.jsonc's
 * send_email.destination_address. Never include edit tokens, crew keys or
 * submitter contact details in the body. If sending fails, log it and
 * carry on: the admin queue is the source of truth, not the inbox.
 * @param {import('../env.js').Env} env
 * @param {{ subject: string, path: string, summary: string }} options
 */
export async function sendAdminAlert(env, { subject, path, summary }) {
  if (!env.EMAIL || !env.ADMIN_EMAIL) return;

  try {
    await env.EMAIL.send({
      to: env.ADMIN_EMAIL,
      from: config.noreplyAddress,
      subject: `[C-EDM] ${subject}`,
      text: `${summary}\n\n${path}`,
    });
  } catch (error) {
    console.error('Admin alert email failed to send', error);
  }
}
