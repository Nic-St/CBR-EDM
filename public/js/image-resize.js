// Shared browser-side image resize/WebP encode, section 10.5. Used by the
// admin flyer uploader and the public submission form. A plain script
// (not a module), so it exposes one small global namespace.
window.CEDM = window.CEDM || {};

window.CEDM.resizeToWebp = async function resizeToWebp(bitmap, maxEdge, quality) {
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
};

// Produces the standard large (1600px) and thumbnail (600px) pair from one
// source file. Re-encoding through canvas also strips EXIF metadata,
// including GPS location from phone photos.
window.CEDM.processFlyerFile = async function processFlyerFile(file) {
  var bitmap = await createImageBitmap(file);
  var large = await window.CEDM.resizeToWebp(bitmap, 1600, 0.8);
  var thumb = await window.CEDM.resizeToWebp(bitmap, 600, 0.8);
  return { large: large, thumb: thumb };
};
