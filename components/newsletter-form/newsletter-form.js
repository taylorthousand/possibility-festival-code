// CONTAINER: NEWSLETTER FORM

function initNewsletterForm() {
  var forms = nextPage.querySelectorAll('[data-newsletter-form]');
  if (!forms.length) return;

  var signal = containerAbort.signal;

  forms.forEach(function(form) {
    var scope = form.closest('[data-modal-id="newsletter"], [data-modal]') || form;
    var headings = Array.prototype.slice.call(scope.querySelectorAll('[data-newsletter-heading-step]'));
    var steps = Array.prototype.slice.call(form.querySelectorAll('[data-newsletter-step]'));
    var nextBtns = form.querySelectorAll('[data-newsletter-next]');
    var prevBtns = form.querySelectorAll('[data-newsletter-prev]');

    if (steps.length < 2) return;

    function getStep(stepNumber) {
      return steps.find(function(step) {
        return step.getAttribute('data-newsletter-step') === String(stepNumber);
      });
    }

    function showStep(stepNumber) {
      steps.forEach(function(step) {
        var isActive = step.getAttribute('data-newsletter-step') === String(stepNumber);
        step.hidden = !isActive;
        step.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        step.setAttribute('data-newsletter-step-state', isActive ? 'active' : 'not-active');
      });

      headings.forEach(function(heading) {
        var isActive = heading.getAttribute('data-newsletter-heading-step') === String(stepNumber);
        heading.hidden = !isActive;
        heading.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        heading.setAttribute('data-newsletter-heading-step-state', isActive ? 'active' : 'not-active');
      });

      form.setAttribute('data-newsletter-current-step', String(stepNumber));
    }

    function validateStep(stepNumber) {
      var step = getStep(stepNumber);
      if (!step) return true;

      var fields = Array.prototype.slice.call(step.querySelectorAll('input, select, textarea'));
      var email = form.querySelector('[data-newsletter-field="email"]');
      var emailConfirm = form.querySelector('[data-newsletter-field="email-confirm"]');

      if (emailConfirm) emailConfirm.setCustomValidity('');

      if (email && emailConfirm && email.value && emailConfirm.value && email.value !== emailConfirm.value) {
        emailConfirm.setCustomValidity('Email addresses must match.');
      }

      var invalidField = fields.find(function(field) {
        return typeof field.checkValidity === 'function' && !field.checkValidity();
      });

      if (invalidField && typeof invalidField.reportValidity === 'function') {
        invalidField.reportValidity();
        invalidField.focus();
        return false;
      }

      return true;
    }

    showStep(1);

    nextBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        if (validateStep(1)) showStep(2);
      }, { signal: signal });
    });

    prevBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        showStep(1);
      }, { signal: signal });
    });

    document.querySelectorAll('[data-modal-open="newsletter"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        showStep(1);
      }, { signal: signal });
    });
  });
}
