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

  var editFlyerArea = editArea.querySelector('[data-crew-flyer][data-scope="edit"]');
  var editFlyerPreview = editFlyerArea.querySelector('[data-crew-flyer-preview]');
  var editFlyerSelect = editFlyerArea.querySelector('[data-crew-flyer-template]');
  var editFlyerStatus = editFlyerArea.querySelector('[data-crew-flyer-status]');

  var createFlyerArea = crewArea.querySelector('[data-crew-flyer][data-scope="create"]');
  var createFlyerPreview = createFlyerArea.querySelector('[data-crew-flyer-preview]');
  var createFlyerSelect = createFlyerArea.querySelector('[data-crew-flyer-template]');
  var createFlyerStatus = createFlyerArea.querySelector('[data-crew-flyer-status]');

  var FIELD_NAMES = ['title', 'start_at_local', 'end_at_local', 'venue_name', 'venue_address',
    'genres', 'lineup', 'ticket_url', 'notes'];

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
        editFlyerStatus.textContent = '';
        loadFlyer(event.id);
        editArea.scrollIntoView({ behavior: 'smooth' });
      });
      li.appendChild(link);
      eventList.appendChild(li);
    });
  }

  // Set as an <img> src, never innerHTML: the SVG is trusted (server
  // generated, XML-escaped), but an <img> src also can't execute script
  // even if it weren't, unlike parsing the markup into the page's own DOM.
  function svgDataUri(svg) {
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function renderFlyerInto(area, preview, select, payload) {
    if (!payload.svg) {
      area.hidden = true;
      return;
    }
    area.hidden = false;
    preview.src = svgDataUri(payload.svg);

    select.textContent = '';
    var autoOption = document.createElement('option');
    autoOption.value = '';
    autoOption.textContent = 'Auto (by genre) -- currently ' + payload.auto.name;
    if (!payload.current) autoOption.selected = true;
    select.appendChild(autoOption);

    payload.templates.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name + ': ' + t.blurb;
      if (payload.current === t.id) opt.selected = true;
      select.appendChild(opt);
    });

    var terrainBtn = area.querySelector('[data-crew-flyer-fetch-terrain]');
    if (terrainBtn) {
      terrainBtn.hidden = !payload.canFetchTerrain;
      terrainBtn.textContent = payload.terrainFetched
        ? 'Re-fetch real terrain (for the contour map template)'
        : 'Fetch real terrain (for the contour map template)';
    }
  }

  function loadFlyer(id) {
    api('/api/crew/events/' + id + '/flyer', {}).then(function (result) {
      if (result.ok) renderFlyerInto(editFlyerArea, editFlyerPreview, editFlyerSelect, result);
    });
  }

  // The "Add an event" form has no saved row yet, so there's nothing to
  // own or reroll -- just a live preview built from whatever's typed so
  // far, refreshed on a short debounce rather than on every keystroke.
  var createPreviewTimer = null;

  function refreshCreatePreview() {
    var fields = scopedFields('create');
    fields.flyer_template = createFlyerSelect.value;
    api('/api/crew/flyer-preview', fields).then(function (result) {
      if (result.ok) renderFlyerInto(createFlyerArea, createFlyerPreview, createFlyerSelect, result);
    });
  }

  function scheduleCreatePreview() {
    if (createPreviewTimer) clearTimeout(createPreviewTimer);
    createPreviewTimer = setTimeout(refreshCreatePreview, 400);
  }

  document.querySelectorAll('[data-scope="create"] [data-field]').forEach(function (el) {
    el.addEventListener('input', scheduleCreatePreview);
  });
  createFlyerSelect.addEventListener('change', refreshCreatePreview);

  var profileSection = crewArea.querySelector('[data-crew-profile]');
  var profileStatus = crewArea.querySelector('[data-crew-profile-status]');

  function loadDashboard(crew) {
    greeting.textContent = 'Signed in as ' + crew.name + (crew.trusted ? ' (trusted, publishes instantly)' : ' (new submissions need admin approval)');
    loginForm.hidden = true;
    crewArea.hidden = false;
    api('/api/crew/events/list', {}).then(function (result) {
      if (result.ok) renderEventList(result.events);
    });
    refreshCreatePreview();

    if (crew.trusted) {
      profileSection.hidden = false;
      document.getElementById('crew-blurb').value = crew.blurb || '';
      document.getElementById('crew-links').value = (crew.links || [])
        .map(function (link) { return link.label + ', ' + link.url; })
        .join('\n');
    }
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

  crewArea.querySelector('[data-crew-save-profile]').addEventListener('click', function () {
    var blurb = document.getElementById('crew-blurb').value;
    var linksText = document.getElementById('crew-links').value;
    var links = linksText.split('\n').map(function (line) {
      var parts = line.split(',');
      var label = (parts[0] || '').trim();
      var url = parts.slice(1).join(',').trim();
      return label && url ? { label: label, url: url } : null;
    }).filter(Boolean);

    profileStatus.textContent = 'Saving...';
    api('/api/crew/profile', { blurb: blurb, links: links }).then(function (result) {
      profileStatus.textContent = result.ok ? 'Saved.' : (result.error || 'Could not save.');
    });
  });

  crewArea.querySelector('[data-crew-create]').addEventListener('click', function () {
    createStatus.textContent = 'Saving...';
    var fields = scopedFields('create');
    fields.flyer_template = createFlyerSelect.value;
    api('/api/crew/events/create', fields).then(function (result) {
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

  editFlyerSelect.addEventListener('change', function () {
    editFlyerStatus.textContent = 'Saving...';
    api('/api/crew/events/' + currentEditId + '/flyer-template', { template: editFlyerSelect.value }).then(function (result) {
      if (result.ok) {
        renderFlyerInto(editFlyerArea, editFlyerPreview, editFlyerSelect, result);
        editFlyerStatus.textContent = 'Saved.';
      } else {
        editFlyerStatus.textContent = result.error || 'Could not save.';
      }
    });
  });

  editFlyerArea.querySelector('[data-crew-flyer-reroll]').addEventListener('click', function () {
    editFlyerStatus.textContent = 'Rerolling...';
    api('/api/crew/events/' + currentEditId + '/reroll-flyer', {}).then(function (result) {
      if (result.ok) {
        renderFlyerInto(editFlyerArea, editFlyerPreview, editFlyerSelect, result);
        editFlyerStatus.textContent = 'Rerolled.';
      } else {
        editFlyerStatus.textContent = result.error || 'Could not reroll.';
      }
    });
  });

  var editFetchTerrainBtn = editFlyerArea.querySelector('[data-crew-flyer-fetch-terrain]');
  if (editFetchTerrainBtn) {
    editFetchTerrainBtn.addEventListener('click', function () {
      editFlyerStatus.textContent = 'Fetching real terrain (this can take a few seconds)...';
      api('/api/crew/events/' + currentEditId + '/fetch-terrain', {}).then(function (result) {
        if (result.ok) {
          renderFlyerInto(editFlyerArea, editFlyerPreview, editFlyerSelect, result);
          editFlyerStatus.textContent = 'Fetched.';
        } else {
          editFlyerStatus.textContent = result.error || 'Could not fetch real terrain.';
        }
      });
    });
  }

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
