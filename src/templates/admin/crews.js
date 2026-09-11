import { html, raw } from '../../lib/escape.js';

/**
 * GET /admin/crews. Section 10.2: create, edit, issue/rotate/revoke keys,
 * toggle trusted and listed.
 * @param {object[]} crews
 */
export function crewListPage(crews) {
  return html`
    <h1>Crews</h1>
    <p><a href="/admin/crews/new" class="button">Add a crew</a></p>
    <table>
      <thead><tr><th>Name</th><th>Trusted</th><th>Listed</th><th>Has key</th><th></th></tr></thead>
      <tbody>
        ${crews.map((crew) => html`<tr>
          <td>${crew.name}</td>
          <td>${crew.trusted ? 'Yes' : 'No'}</td>
          <td>${crew.listed ? 'Yes' : 'No'}</td>
          <td>${crew.key_hash ? 'Yes' : 'No'}</td>
          <td><a href="/admin/crews/${crew.id}/edit">Edit</a></td>
        </tr>`)}
      </tbody>
    </table>
  `;
}

/**
 * GET/POST /admin/crews/new and /admin/crews/:id/edit.
 * @param {object} crew
 * @param {{ newKey?: string }} [options] - newKey shown once, right after issuing/rotating
 */
export function crewFormPage(crew, options = {}) {
  const isNew = !crew.id;
  const action = isNew ? '/admin/crews/new' : `/admin/crews/${crew.id}/edit`;

  return html`
    <h1>${isNew ? 'Add a crew' : `Edit: ${crew.name}`}</h1>
    ${options.newKey
      ? html`<p class="error">New crew key (shown once, copy it now): <code>${options.newKey}</code></p>`
      : ''}
    <form method="post" action="${action}">
      <div class="field"><label for="name">Name</label><input type="text" id="name" name="name" value="${crew.name || ''}" required></div>
      <div class="field"><label for="slug">Slug</label><input type="text" id="slug" name="slug" value="${crew.slug || ''}" required></div>
      <div class="field"><label for="blurb">Blurb</label><textarea id="blurb" name="blurb">${crew.blurb || ''}</textarea></div>
      <div class="field"><label><input type="checkbox" name="trusted" value="1" ${crew.trusted ? raw('checked') : ''}> Trusted (auto-publish)</label></div>
      <div class="field"><label><input type="checkbox" name="listed" value="1" ${crew.listed ?? true ? raw('checked') : ''}> Listed on the crews page</label></div>
      <button type="submit">Save</button>
    </form>

    ${!isNew
      ? html`<h2>Crew key</h2>
        <div class="actions">
          <form method="post" action="/admin/crews/${crew.id}/issue-key"><button type="submit">${crew.key_hash ? 'Rotate key' : 'Issue key'}</button></form>
          ${crew.key_hash
            ? html`<form method="post" action="/admin/crews/${crew.id}/revoke-key" data-confirm="Revoke this crew's key? They will need a new one to post."><button type="submit" class="danger">Revoke key</button></form>`
            : ''}
        </div>`
      : ''}
  `;
}
