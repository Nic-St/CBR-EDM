import { html } from '../../lib/escape.js';

const REGIONS = ['ACT', 'NSW', 'National'];

/**
 * GET /admin/harm-reduction. Section 10.2: edit the page's own intro
 * copy, and edit/reorder/mark-as-checked the links list below it.
 * @param {object[]} links
 * @param {string} intro
 */
export function harmReductionAdminPage(links, intro) {
  const sorted = [...links].sort((a, b) => a.sort_order - b.sort_order);

  return html`
    <h1>Harm reduction links</h1>

    <h2>Intro text</h2>
    <p class="muted">Shown at the top of /look-after-each-other, above the links below. One paragraph per line.</p>
    <form method="post" action="/admin/harm-reduction/intro" class="field" style="border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
      <div class="field"><label>Intro</label><textarea name="intro" rows="4">${intro}</textarea></div>
      <button type="submit">Save intro text</button>
    </form>

    <h2>Links</h2>
    ${sorted.map((link) => html`<form method="post" action="/admin/harm-reduction/${link.id}" class="field" style="border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
      <div class="field"><label>Title</label><input type="text" name="title" value="${link.title}" required></div>
      <div class="field"><label>URL</label><input type="url" name="url" value="${link.url || ''}"></div>
      <div class="field"><label>Phone</label><input type="text" name="phone" value="${link.phone || ''}"></div>
      <div class="field"><label>Description</label><textarea name="description">${link.description || ''}</textarea></div>
      <div class="field"><label>Region</label>
        <select name="region">
          ${REGIONS.map((region) => html`<option value="${region}" ${region === link.region ? html` selected` : ''}>${region}</option>`)}
        </select>
      </div>
      <div class="field"><label>Sort order</label><input type="number" name="sort_order" value="${link.sort_order}"></div>
      <p class="muted">Last checked: ${link.last_checked_at.slice(0, 10)}</p>
      <div class="actions">
        <button type="submit">Save</button>
        <button type="submit" name="mark_checked" value="1">Save and mark checked today</button>
      </div>
    </form>`)}

    <h2>Add a link</h2>
    <form method="post" action="/admin/harm-reduction/new">
      <div class="field"><label>Title</label><input type="text" name="title" required></div>
      <div class="field"><label>URL</label><input type="url" name="url"></div>
      <div class="field"><label>Phone</label><input type="text" name="phone"></div>
      <div class="field"><label>Description</label><textarea name="description"></textarea></div>
      <div class="field"><label>Region</label>
        <select name="region">
          ${REGIONS.map((region) => html`<option value="${region}">${region}</option>`)}
        </select>
      </div>
      <div class="field"><label>Sort order</label><input type="number" name="sort_order" value="0"></div>
      <button type="submit">Add link</button>
    </form>
  `;
}
