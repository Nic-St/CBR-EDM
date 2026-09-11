// "Use this image as the flyer" on an event converted from an email,
// section 10.6: the raw attachment is run through the same browser resize
// pipeline as any other flyer upload before being attached.
(function () {
  var container = document.querySelector('[data-flyer-from-email]');
  if (!container) return;

  var button = container.querySelector('[data-flyer-from-email-btn]');
  var status = container.querySelector('[data-flyer-from-email-status]');
  var emailId = container.getAttribute('data-flyer-from-email');
  var attachmentIndex = container.getAttribute('data-flyer-from-email-index');
  var eventId = container.getAttribute('data-event-id');

  button.addEventListener('click', async function () {
    button.disabled = true;
    status.textContent = 'Processing image...';

    try {
      var imageResponse = await fetch('/admin/api/inbound-emails/' + emailId + '/attachments/' + attachmentIndex);
      var blob = await imageResponse.blob();
      var processed = await window.CEDM.processFlyerFile(blob);

      var body = new FormData();
      body.append('large', processed.large, 'large.webp');
      body.append('thumb', processed.thumb, 'thumb.webp');

      var uploadResponse = await fetch('/admin/api/events/' + eventId + '/flyer', { method: 'POST', body: body });
      var result = await uploadResponse.json();

      if (!uploadResponse.ok || !result.ok) {
        status.textContent = result.error || 'Could not use that image.';
        button.disabled = false;
        return;
      }

      status.textContent = 'Flyer set.';
      window.location.reload();
    } catch (err) {
      status.textContent = 'Could not process that image.';
      button.disabled = false;
    }
  });
})();
