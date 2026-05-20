// CONTAINER: MODAL

function initModal() {
  var modals = Array.prototype.slice.call(nextPage.querySelectorAll('[data-modal]'));
  if (!modals.length) return;

  var signal = containerAbort.signal;

  function getModalByTarget(target) {
    if (!target) return modals.length === 1 ? modals[0] : null;

    return modals.find(function(modal) {
      return modal.id === target || modal.getAttribute('data-modal-id') === target;
    }) || null;
  }

  function openModal(modal) {
    if (!modal) return;
    modal.setAttribute('data-modal', 'active');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.setAttribute('data-modal', 'not-active');
    modal.setAttribute('aria-hidden', 'true');
  }

  // Open
  document.querySelectorAll('[data-modal-open]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      var target = btn.getAttribute('data-modal-open');
      var modal = getModalByTarget(target);
      if (!modal) return;
      e.preventDefault();
      openModal(modal);
    }, { signal: signal });
  });

  modals.forEach(function(modal) {
    if (modal.getAttribute('data-modal') !== 'active') {
      closeModal(modal);
    }

    // Close button
    modal.querySelectorAll('[data-modal-close]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        closeModal(modal);
      }, { signal: signal });
    });

    // Close on overlay click
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal(modal);
    }, { signal: signal });
  });

  // Close on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      modals.forEach(function(modal) {
        if (modal.getAttribute('data-modal') === 'active') closeModal(modal);
      });
    }
  }, { signal: signal });
}
