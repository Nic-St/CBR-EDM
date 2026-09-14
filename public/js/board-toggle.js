// Progressive enhancement for the mobile board/calendar toggle, section 7.2.
// Without this script both panels stay stacked and visible, which is the
// required no-JS fallback.
(function () {
  var toggle = document.querySelector('.view-toggle');
  if (!toggle) return;

  var panels = {
    board: document.querySelector('[data-panel="board"]'),
    calendar: document.querySelector('[data-panel="calendar"]'),
  };
  var buttons = toggle.querySelectorAll('button[data-show]');
  // Matches the CSS breakpoint that swaps board+calendar side-by-side
  // for the toggle. Below it, one panel is hidden at a time.
  var narrowQuery = window.matchMedia('(max-width: 1023px)');

  function show(which) {
    if (narrowQuery.matches) {
      panels.board.hidden = which !== 'board';
      panels.calendar.hidden = which !== 'calendar';
    } else {
      panels.board.hidden = false;
      panels.calendar.hidden = false;
    }
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.show === which));
    });
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      show(button.dataset.show);
    });
  });

  narrowQuery.addEventListener('change', function () {
    show('board');
  });

  // The calendar's own prev/next month links are plain full-page
  // navigations (no-JS friendly by design, see calendar.js), so they
  // carry a view=calendar marker in the URL -- otherwise a full reload
  // always lands back on show('board') below, throwing the visitor out
  // of the calendar the moment they change month.
  var initialView = /[?&]view=calendar\b/.test(window.location.search) ? 'calendar' : 'board';
  show(initialView);
})();
