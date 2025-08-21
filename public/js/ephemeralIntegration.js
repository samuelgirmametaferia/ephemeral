/* Integration glue for your existing front-end create-post function and UI
   - Assumes you have:
     - A form with class .create-post
     - A textarea#post-content
     - An input#post-tags (comma or # separated)
     - An optional file input#post-file for media
   - Also wires like/comment/perpetuate buttons via [data-action] attributes.
*/

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const toast = (msg, type = 'info') => window.toast ? window.toast(msg, type) : console.log(`[${type}]`, msg);

  // --- Tag normalization (mirror server rules) ---
  const TAG_LIMITS = { maxTags: 5, maxLen: 30 };
  function normalizeTag(token) {
    if (!token) return '';
    let s = String(token).trim();
    if (!s) return '';
    s = s.replace(/^#+/, '');     // strip leading '#'
    s = s.toLowerCase();
    s = s.replace(/\s+/g, '_');  // spaces -> underscore
    s = s.replace(/[^a-z0-9_]/g, ''); // allowed chars only
    if (!s) return '';
    if (s.length > TAG_LIMITS.maxLen) s = s.slice(0, TAG_LIMITS.maxLen);
    return s;
  }
  function parseAndLimitTags(input) {
    if (!input) return [];
    const tokens = Array.isArray(input) ? input.map(String) : String(input).split(/[#\n,]/g);
    const out = [];
    for (const raw of tokens) {
      const t = normalizeTag(raw);
      if (!t) continue;
      if (!out.includes(t)) out.push(t);
      if (out.length >= TAG_LIMITS.maxTags) break;
    }
    return out;
  }
  function formatTagsForInput(arr) {
    return arr.map((t) => `#${t}`).join(', ');
  }

  // Create-post integration
  async function onCreatePostSubmit(e) {
    // Delegate: run only for .create-post forms
    const form = e.target.closest('form.create-post');
    if (!form) return;

    e.preventDefault();

    const content = $('#post-content', form)?.value || '';
    const tagsInput = $('#post-tags', form);
    const rawTags = tagsInput?.value || '';
    const fileInput = $('#post-file', form);
    const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

    // Normalize/format tags before submit
    const tags = parseAndLimitTags(rawTags);
    if (!tags.length) {
      toast('Please add at least one tag', 'warn');
      return;
    }
    if (tagsInput) tagsInput.value = formatTagsForInput(tags);

    try {
      form.querySelectorAll('button, input, textarea').forEach((el) => (el.disabled = true));
      const res = await window.Ephemeral.createPost({ content, tags, file });
      toast('Post created!', 'success');
      // Optionally clear form
      if ($('#post-content', form)) $('#post-content', form).value = '';
      if ($('#post-tags', form)) $('#post-tags', form).value = '';
      if (fileInput) fileInput.value = '';
      const counter = form.querySelector('.char-counter');
      if (counter) counter.textContent = '0/5000';

      // Optionally prepend to your feed UI here with res.post
      document.dispatchEvent(new CustomEvent('ephemeral:postCreated', { detail: res }));
    } catch (err) {
      toast(err?.message || 'Failed to create post', 'error');
    } finally {
      form.querySelectorAll('button, input, textarea').forEach((el) => (el.disabled = false));
    }
  }

  // Format tag input on blur/change for better UX
  function onTagsFieldNormalize(e) {
    const el = e.target;
    if (!el || el.id !== 'post-tags') return;
    const arr = parseAndLimitTags(el.value);
    el.value = formatTagsForInput(arr);
  }

  // Event delegation for like, unlike, comment, perpetuate buttons
  async function onClickAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const postId = btn.getAttribute('data-post-id');
    if (!action || !postId) return;

    try {
      btn.disabled = true;
      switch (action) {
        case 'like':
          await window.Ephemeral.likePost(postId);
          toast('Liked', 'success');
          document.dispatchEvent(new CustomEvent('ephemeral:liked', { detail: { postId } }));
          break;
        case 'unlike':
          await window.Ephemeral.unlikePost(postId);
          toast('Unliked', 'success');
          document.dispatchEvent(new CustomEvent('ephemeral:unliked', { detail: { postId } }));
          break;
        case 'perpetuate': {
          const v = Number(prompt('Perpetuate value (e.g., 1-5):', '1'));
          if (!Number.isFinite(v) || v <= 0) return;
          const res = await window.Ephemeral.perpetuate(postId, v);
          toast(`Perpetuated (trustScore=${res.trustScore?.toFixed?.(2) ?? res.trustScore})`, 'success');
          document.dispatchEvent(new CustomEvent('ephemeral:perpetuated', { detail: { postId, result: res } }));
          break;
        }
        default:
          break;
      }
    } catch (err) {
      toast(err?.message || 'Action failed', 'error');
    } finally {
      btn.disabled = false;
    }
  }

  // Comment form handler (if you render one per post)
  async function onCommentSubmit(e) {
    const form = e.target.closest('form[data-post-id][data-comment-form]');
    if (!form) return;
    e.preventDefault();
    const postId = form.getAttribute('data-post-id');
    const input = form.querySelector('input[name="comment"], textarea[name="comment"]');
    const content = input?.value?.trim() || '';
    if (!content) return;

    try {
      form.querySelectorAll('button, input, textarea').forEach((el) => (el.disabled = true));
      const res = await window.Ephemeral.addComment(postId, content);
      const detail = { postId, comment: res.comment };
      if (input) input.value = '';
      document.dispatchEvent(new CustomEvent('ephemeral:commentAdded', { detail }));
    } catch (err) {
      toast(err?.message || 'Failed to add comment', 'error');
    } finally {
      form.querySelectorAll('button, input, textarea').forEach((el) => (el.disabled = false));
    }
  }

  function bind() {
    // Delegate submits so cloned modal forms also work
    document.addEventListener('submit', onCreatePostSubmit);
    document.addEventListener('click', onClickAction);
    document.addEventListener('submit', onCommentSubmit);

    // Normalize tags on blur/change
    document.addEventListener('change', onTagsFieldNormalize, true);
    document.addEventListener('blur', onTagsFieldNormalize, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();