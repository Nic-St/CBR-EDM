// Crew dashboard, section 9.3. The key lives in sessionStorage for this
// tab only, and event data is rendered with safe DOM methods, never
// innerHTML, since it is public-submitted content (section 12).
(function () {
  var loginForm = document.querySelector('[data-crew-login]');
  if (!loginForm) return;

  var loginStatus = loginForm.querySelector('[data-login-status]');
  var crewArea = document.querySelector('[data-crew-area]');
  var greeting = crewArea.querySelector('[data-crew-greeting]');
  var eventList = crewArea.querySelector('[data-crew-event-list]');
  var createStatus = crewArea.querySelector('[data-crew-create-status]');
  var editArea = document.querySelector('[data-crew-edit]');
  var editStatus = editArea.querySelector('[data-crew-edit-status]');

  var FIELD_NAMES = ['title', 'start_at_local', 'end_at_local', 'venue_name', 'venue_address',
    'genres', 'price_text', 'lineup', 'ticket_url', 'notes'];

  var currentKey = sessionStorage.getItem('cedm_crew_key');
  var currentEditId = null;

  function scopedFields(scope) {
    var container = document.querySelector('[data-scope="' + scope + '"]');
    var out = {};
    FIELD_NAMES.forEach(function (name) {
      var el = container.querySelector('[data-field="' + name + '"]');
      out[name] = el.value;
    });
    return out;
  }

  function setScopedFields(scope, event) {
    var container = document.querySelector('[data-scope="' + scope + '"]');
    FIELD_NAMES.forEach(function (name) {
      var el = container.querySelector('[data-field="' + name + '"]');
      el.value = event[name] || '';
    });
  }

  function api(path, body) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ key: currentKey }, body)),
    }).then(function (response) { return response.json(); });
  }

  function renderEventList(events) {
    eventList.textContent = '';
    events.forEach(function (event) {
      var li = document.createElement('li');
      var link = document.createElement('button');
      link.type = 'button';
      link.className = 'secondary';
      link.textContent = (event.title || 'Untitled') + ' (' + event.visibility + ')';
      link.addEventListener('click', function () {
        currentEditId = event.id;
        setScopedFields('edit', event);
        editArea.hidden = false;
        editStatus.textContent = '';
        editArea.scrollIntoView({ behavior: 'smooth' });
      });
      li.appendChild(link);
      eventList.appendChild(li);
    });
  }

  function loadDashboard(crew) {
    greeting.textContent = 'Signed in as ' + crew.name + (crew.trusted ? ' (trusted, publishes instantly)' : ' (new submissions need admin approval)');
    loginForm.hidden = true;
    crewArea.hidden = false;
    api('/api/crew/events/list', {}).then(function (result) {
      if (result.ok) renderEventList(result.events);
    });
  }

  if (currentKey) {
    api('/api/crew/login', {}).then(function (result) {
      if (result.ok) loadDashboard(result.crew);
      else sessionStorage.removeItem('cedm_crew_key');
    });
  }

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var keyInput = document.getElementById('crew-key');
    var turnstileToken = loginForm.querySelector('[name="cf-turnstile-response"]');
    currentKey = keyInput.value;

    loginStatus.textContent = 'Checking...';
    api('/api/crew/login', { turnstileToken: turnstileToken ? turnstileToken.value : '' }).then(function (result) {
      if (!result.ok) {
        loginStatus.textContent = result.error || 'That key was not recognised.';
        currentKey = null;
        if (window.turnstile) window.turnstile.reset();
        return;
      }
      sessionStorage.setItem('cedm_crew_key', currentKey);
      loadDashboard(result.crew);
    });
  });

  crewArea.querySelector('[data-crew-signout]').addEventListener('click', function () {
    sessionStorage.removeItem('cedm_crew_key');
    window.location.reload();
  });

  crewArea.querySelector('[data-crew-create]').addEventListener('click', function () {
    createStatus.textContent = 'Saving...';
    api('/api/crew/events/create', scopedFields('create')).then(function (result) {
      createStatus.textContent = result.ok
        ? (result.published ? 'Published.' : 'Submitted for admin approval.')
        : (result.error || 'Could not create that event.');
      if (result.ok) {
        api('/api/crew/events/list', {}).then(function (r) { if (r.ok) renderEventList(r.events); });
      }
    });
  });

  editArea.querySelector('[data-crew-save]').addEventListener('click', function () {
    editStatus.textContent = 'Saving...';
    api('/api/crew/events/' + currentEditId + '/update', scopedFields('edit')).then(function (result) {
      editStatus.textContent = result.ok
        ? (result.applied === 'pending_review' ? 'Sent for admin review.' : 'Saved.')
        : (result.error || 'Could not save.');
    });
  });

  editArea.querySelectorAll('[data-crew-status-btn]').forEach(function (button) {
    button.addEventListener('click', function () {
      var status = button.getAttribute('data-crew-status-btn');
      editStatus.textContent = 'Saving...';
      api('/api/crew/events/' + currentEditId + '/status', { status: status }).then(function (result) {
        editStatus.textContent = result.ok
          ? (result.applied === 'pending_review' ? 'Sent for admin review.' : 'Updated.')
          : (result.error || 'Could not update.');
      });
    });
  });

  editArea.querySelector('[data-crew-unpublish]').addEventListener('click', function () {
    if (!window.confirm('Unpublish this event? It will disappear from the site immediately.')) return;
    editStatus.textContent = 'Unpublishing...';
    api('/api/crew/events/' + currentEditId + '/unpublish', {}).then(function (result) {
      editStatus.textContent = result.ok ? 'Unpublished.' : (result.error || 'Could not unpublish.');
      if (result.ok) {
        api('/api/crew/events/list', {}).then(function (r) { if (r.ok) renderEventList(r.events); });
      }
    });
  });
})();
