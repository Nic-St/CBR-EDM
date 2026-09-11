// Browser-side flyer upload for the admin panel, section 10.5. Resizing and
// WebP encoding itself lives in image-resize.js, shared with the public
// submission form.
(function () {
  var form = document.querySelector('[data-flyer-upload]');
  if (!form) return;

  var input = form.querySelector('input[type="file"]');
  var status = form.querySelector('[data-flyer-status]');
  var submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!input.files || !input.files[0]) {
      status.textContent = 'Choose an image first.';
      return;
    }

    submitButton.disabled = true;
    status.textContent = 'Processing image...';

    try {
      var processed = await window.CEDM.processFlyerFile(input.files[0]);

      var body = new FormData();
      body.append('large', processed.large, 'large.webp');
      body.append('thumb', processed.thumb, 'thumb.webp');

      var response = await fetch(form.action, { method: 'POST', body: body });
      var result = await response.json();

      if (!response.ok || !result.ok) {
        status.textContent = result.error || 'Upload failed. Try again.';
        submitButton.disabled = false;
        return;
      }

      status.textContent = 'Flyer uploaded.';
      window.location.reload();
    } catch (err) {
      status.textContent = 'Could not process that image. Try a different file.';
      submitButton.disabled = false;
    }
  });
})();
