// Confirmation prompt for destructive admin actions, kept in an external
// file rather than an inline onsubmit handler, since the site's CSP does
// not allow inline scripts.
document.addEventListener('submit', function (event) {
  var message = event.target.getAttribute('data-confirm');
  if (message && !window.confirm(message)) {
    event.preventDefault();
  }
});
