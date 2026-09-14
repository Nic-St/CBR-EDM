import { html } from '../lib/escape.js';
import { config } from '../config.js';

const REGIONS = ['ACT', 'NSW', 'National'];

/**
 * /look-after-each-other. Section 15.4.
 * @param {object[]} links - rows from harm_reduction_links, any order
 * @param {string} intro - admin-editable intro copy, one paragraph per line
 */
export function harmReductionPage(links, intro) {
  return html`
    <h1>${config.harmReductionTitle}</h1>
    ${intro.split('\n').filter(Boolean).map((paragraph) => html`<p>${paragraph}</p>`)}
    ${REGIONS.map((region) => {
      const regionLinks = links
        .filter((link) => link.region === region)
        .sort((a, b) => a.sort_order - b.sort_order);
      if (!regionLinks.length) return '';
      return html`
        <h2>${region}</h2>
        <ul class="link-list">
          ${regionLinks.map((link) => html`<li>
            <p>${link.url ? html`<a href="${link.url}">${link.title}</a>` : link.title}</p>
            ${link.description ? html`<p>${link.description}</p>` : ''}
            ${link.phone ? html`<p>${link.phone}</p>` : ''}
            <p>Last checked: ${link.last_checked_at.slice(0, 10)}</p>
          </li>`)}
        </ul>
      `;
    })}
  `;
}
