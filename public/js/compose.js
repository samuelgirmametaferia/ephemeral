// Compose modal + FAB wiring and small UX niceties for the post composer
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);

  function openModal(title, contentNode) {
    const backdrop = $('#modalBackdrop');
    const modal = $('#modal');
    const body = $('#modalBody');
    const titleEl = $('#modalTitle');
    const closeBtn = $('#modalClose');

    if (!backdrop || !modal || !body || !titleEl || !closeBtn) return;

    titleEl.textContent = title || '';
    body.innerHTML = '';
    if (contentNode) body.appendChild(contentNode);

    backdrop.hidden = false;
    document.body.classList.add('modal-open');

    function onBackdropClick(e) {
      if (e.target === backdrop) closeModal();
    }
    function onKey(e) {
      if (e.key === 'Escape') closeModal();
    }
    function onClose() { closeModal(); }

    backdrop.addEventListener('click', onBackdropClick, { once: true });
    closeBtn.addEventListener('click', onClose, { once: true });
    document.addEventListener('keydown', onKey, { once: true });

    // Focus first input/textarea inside
    setTimeout(() => {
      const first = body.querySelector('textarea, input, button');
      if (first) first.focus();
    }, 0);
  }

  function closeModal() {
    const backdrop = $('#modalBackdrop');
    if (!backdrop) return;
    backdrop.hidden = true;
    document.body.classList.remove('modal-open');
  }

  function wireCharCounter(form) {
    const textarea = form.querySelector('#post-content');
    const counter = form.querySelector('.char-counter');
    if (!textarea || !counter) return;

    const max = Number(textarea.getAttribute('maxlength')) || 5000;
    const update = () => {
      const len = textarea.value.length;
      counter.textContent = `${len}/${max}`;
      counter.style.color = len > max ? '#f66' : '';
    };
    textarea.addEventListener('input', update);
    update();
  }

  function cloneComposerForModal() {
    const original = $('#create-post-form');
    if (!original) return null;

    const clone = original.cloneNode(true);
    clone.id = 'create-post-form-modal';
    // clear values
    const ta = clone.querySelector('#post-content');
    const tags = clone.querySelector('#post-tags');
    const file = clone.querySelector('#post-file');
    if (ta) ta.value = '';
    if (tags) tags.value = '';
    if (file) file.value = '';
    const counter = clone.querySelector('.char-counter');
    if (counter) counter.textContent = '0/5000';

    // Ensure this is marked as a create-post form (it already has class)
    if (!clone.classList.contains('create-post')) clone.classList.add('create-post');

    // Wire char counter for the cloned form
    wireCharCounter(clone);

    return clone;
  }

  function bind() {
    const fab = $('#composeFab');
    if (fab) {
      fab.addEventListener('click', () => {
        const formClone = cloneComposerForModal();
        openModal('Create a post', formClone);
      });
    }

    // Wire counter for the inline composer
    const inlineForm = $('#create-post-form');
    if (inlineForm) {
      wireCharCounter(inlineForm);
    }

    // Close modal when a post is created successfully
    document.addEventListener('ephemeral:postCreated', () => {
      closeModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();