import { html, raw } from '../lib/escape.js';
import { config } from '../config.js';

/**
 * The shared page shell: header with site name and slogan, footer with the
 * required links (section 6), and a slot for page content.
 * @param {{ title: string, bodyContent: string, activeNav?: string, extraHead?: string }} options
 */
export function layout({ title, bodyContent, extraHead = '' }) {
  return html`<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title ? `${title} - ${config.siteName}` : config.siteName}</title>
  <meta name="description" content="${config.slogan}">
  <link rel="stylesheet" href="/css/style.css">
  ${raw(extraHead)}
</head>
<body>
  <header class="site-header">
    <p class="site-name">${config.siteName}</p>
    <p class="slogan-strip">${config.slogan}</p>
  </header>
  <main>
    ${raw(bodyContent)}
  </main>
  ${raw(siteFooter())}
  <script src="/js/board-toggle.js" defer></script>
  <script src="/js/image-resize.js" defer></script>
  <script src="/js/submit-form.js" defer></script>
  <script src="/js/edit-form.js" defer></script>
  <script src="/js/crew-dashboard.js" defer></script>
  <script src="/js/contact-form.js" defer></script>
</body>
</html>`;
}

function siteFooter() {
  return html`<footer class="site-footer">
    <p><a href="/look-after-each-other">${config.harmReductionTitle}</a></p>
    <p><a href="/contact">Get in touch</a></p>
    <p><a href="/submit">Put an event on the wall</a></p>
    <p><a href="/calendar.ics">Subscribe to the calendar</a></p>
    <p>${config.privacyLine}</p>
    ${config.ackText ? html`<p>${config.ackText}</p>` : ''}
  </footer>`;
}
