// CONTAINER: MODAL

function initModal() {
  var modal = nextPage.querySelector('[data-modal]');
  if (!modal) return;

  var signal = containerAbort.signal;

  function openModal() {
    modal.setAttribute('data-modal', 'active');
  }

  function closeModal() {
    modal.setAttribute('data-modal', 'not-active');
  }

  // Open
  nextPage.querySelectorAll('[data-modal-open]').forEach(function(btn) {
    btn.addEventListener('click', openModal, { signal: signal });
  });

  // Close button
  modal.querySelectorAll('[data-modal-close]').forEach(function(btn) {
    btn.addEventListener('click', closeModal, { signal: signal });
  });

  // Close on overlay click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  }, { signal: signal });

  // Close on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  }, { signal: signal });
}
