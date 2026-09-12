// Public submission form behaviour, section 9.1.
(function () {
  var form = document.querySelector('[data-submit-form]');
  if (form) {
    var steps = Array.prototype.slice.call(form.querySelectorAll('.form-step'));
    var stepCurrentEl = form.querySelector('[data-step-current]');
    var currentStepIndex = 0;

    function showStep(index) {
      currentStepIndex = index;
      steps.forEach(function (step, i) {
        step.classList.toggle('is-active', i === index);
      });
      if (stepCurrentEl) stepCurrentEl.textContent = String(index + 1);

      // Moves focus (and so the screen reader's attention) to the new
      // step, since nothing else on the page otherwise indicates the step
      // changed. h2 isn't focusable by default, hence the tabindex.
      var heading = steps[index].querySelector('h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      }
    }

    steps.forEach(function (step, index) {
      var nextButton = step.querySelector('[data-next]');
      var backButton = step.querySelector('[data-back]');

      if (nextButton) {
        nextButton.addEventListener('click', function () {
          var fields = step.querySelectorAll('input, textarea, select');
          for (var i = 0; i < fields.length; i++) {
            if (!fields[i].checkValidity()) {
              fields[i].reportValidity();
              return;
            }
          }
          showStep(index + 1);
        });
      }

      if (backButton) {
        backButton.addEventListener('click', function () {
          showStep(index - 1);
        });
      }
    });

    // Enter, in a text input, would otherwise submit the form via whichever
    // submit button it finds -- the one on the last step, wherever the user
    // actually is. Treat it as "next" instead, unless already on the last step.
    form.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' || event.target.tagName === 'TEXTAREA') return;
      if (currentStepIndex === steps.length - 1) return;
      event.preventDefault();
      var nextButton = steps[currentStepIndex].querySelector('[data-next]');
      if (nextButton) nextButton.click();
    });

    var tbaToggle = form.querySelector('[data-tba-toggle]');
    var tbaFields = form.querySelector('[data-tba-fields]');
    tbaToggle.addEventListener('change', function () {
      tbaFields.hidden = !tbaToggle.checked;
    });

    var fileInput = form.querySelector('#flyer-file');
    var status = form.querySelector('[data-submit-status]');
    var submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      var turnstileToken = form.querySelector('[name="cf-turnstile-response"]');
      if (!turnstileToken || !turnstileToken.value) {
        status.textContent = 'Please complete the check above first.';
        return;
      }

      submitButton.disabled = true;
      status.textContent = 'Sending...';

      try {
        var body = new FormData(form);

        if (fileInput.files && fileInput.files[0]) {
          var processed = await window.CEDM.processFlyerFile(fileInput.files[0]);
          body.append('flyer_large', processed.large, 'large.webp');
          body.append('flyer_thumb', processed.thumb, 'thumb.webp');
        }

        var response = await fetch(form.action, { method: 'POST', body: body });
        var result = await response.json();

        if (!response.ok || !result.ok) {
          status.textContent = result.error || 'Something went wrong. Try again.';
          submitButton.disabled = false;
          if (window.turnstile) window.turnstile.reset();
          return;
        }

        window.location.href = '/submit/confirmation#' + encodeURIComponent(result.editToken || '');
      } catch (err) {
        status.textContent = 'Something went wrong. Try again.';
        submitButton.disabled = false;
      }
    });
  }

  var confirmationHolder = document.querySelector('[data-edit-link-holder]');
  if (confirmationHolder) {
    var token = window.location.hash.slice(1);
    if (token) {
      var input = confirmationHolder.querySelector('[data-edit-link-value]');
      input.value = window.location.origin + '/edit#' + token;
      confirmationHolder.hidden = false;

      var copyButton = confirmationHolder.querySelector('[data-copy-edit-link]');
      var copyStatus = confirmationHolder.querySelector('[data-copy-status]');
      copyButton.addEventListener('click', async function () {
        try {
          await navigator.clipboard.writeText(input.value);
          copyStatus.textContent = 'Copied.';
        } catch (err) {
          input.select();
          copyStatus.textContent = 'Could not copy automatically. Select and copy the text above.';
        }
      });
    }
  }
})();
