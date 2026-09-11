// Print button for the poster page. Plain form/link navigation already
// works without this; it just saves a trip to the browser's own print
// menu.
(function () {
  var button = document.querySelector('[data-print-button]');
  if (!button) return;
  button.addEventListener('click', function () {
    window.print();
  });
})();
