// Browser-side flyer processing, section 10.5. Resizes to a large (max
// 1600px) and thumbnail (max 600px) WebP, which also strips EXIF metadata
// (including phone GPS location) since re-encoding through canvas never
// carries it forward.
(function () {
  var form = document.querySelector('[data-flyer-upload]');
  if (!form) return;

  var input = form.querySelector('input[type="file"]');
  var status = form.querySelector('[data-flyer-status]');
  var submitButton = form.querySelector('button[type="submit"]');

  async function resizeToWebp(bitmap, maxEdge, quality) {
    var scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    var width = Math.round(bitmap.width * scale);
    var height = Math.round(bitmap.height * scale);
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return new Promise(function (resolve) {
      canvas.toBlob(resolve, 'image/webp', quality);
    });
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!input.files || !input.files[0]) {
      status.textContent = 'Choose an image first.';
      return;
    }

    submitButton.disabled = true;
    status.textContent = 'Processing image...';

    try {
      var bitmap = await createImageBitmap(input.files[0]);
      var large = await resizeToWebp(bitmap, 1600, 0.8);
      var thumb = await resizeToWebp(bitmap, 600, 0.8);

      var body = new FormData();
      body.append('large', large, 'large.webp');
      body.append('thumb', thumb, 'thumb.webp');

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
