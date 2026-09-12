// Keeps --header-height in sync with the site header's real rendered
// height, section 7.1. The header's height isn't constant: the site name
// uses a clamp() font size that scales with viewport width, and the nav
// can wrap onto a second line. The desktop layout uses this variable to
// stick the calendar right below the header, whatever height it ends up
// being, instead of guessing a fixed value that only matches sometimes.
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;

  function update() {
    document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
  }

  update();
  window.addEventListener('resize', update);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(update);
  }
})();
