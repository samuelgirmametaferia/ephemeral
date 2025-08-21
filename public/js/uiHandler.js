const toggleBtn = document.getElementById('toggleBtn');
const leftPanel = document.getElementById('leftPanel');
const mainContent = document.querySelector('.container');
const topBar = document.querySelector('.top-bar');

// Toasts
const toastContainer = document.getElementById('toastContainer');
(function initToast() {
  if (!toastContainer) return;
  const ICONS = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' };
  function removeToast(el) {
    if (!el) return;
    el.style.animation = 'toastOut 160ms ease-in forwards';
    setTimeout(() => el.remove(), 180);
  }
  window.toast = function toast(msg, type = 'info', opts = {}) {
    try {
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      t.setAttribute('role', type === 'error' ? 'alert' : 'status');
      t.innerHTML = `
        <div class="icon">${ICONS[type] || ICONS.info}</div>
        <div class="msg"></div>
        <button class="close-btn" aria-label="Dismiss">✕</button>
      `;
      t.querySelector('.msg').textContent = String(msg || '');
      const closeBtn = t.querySelector('.close-btn');
      closeBtn.addEventListener('click', () => removeToast(t));
      toastContainer.appendChild(t);

      const ttl = Math.max(1500, Math.min(8000, Number(opts.ttl || (type === 'error' ? 5000 : 3000))));
      const timer = setTimeout(() => removeToast(t), ttl);
      t.addEventListener('mouseenter', () => clearTimeout(timer));
      t.addEventListener('mouseleave', () => {
        // restart shorter timer after hover
        setTimeout(() => removeToast(t), 1200);
      });
      return t;
    } catch (e) {
      console.log('[toast]', type, msg);
    }
  };
})();

function closePanel() {
  leftPanel.classList.remove('show');
  mainContent.classList.remove('blur');
  topBar.classList.remove('blur');
}

function openPanel() {
  leftPanel.classList.add('show');
  mainContent.classList.add('blur');
  topBar.classList.add('blur');
}

toggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (leftPanel.classList.contains('show')) {
    closePanel();
  } else {
    openPanel();
  }
});

document.addEventListener('click', (e) => {
  if (
    leftPanel.classList.contains('show') &&
    !leftPanel.contains(e.target) &&
    !toggleBtn.contains(e.target)
  ) {
    closePanel();
  }
});

/* ------- Simple reusable popup modal ------- */

const modalBackdrop = document.getElementById('modalBackdrop');
const modalEl = document.getElementById('modal');
const modalTitleEl = document.getElementById('modalTitle');
const modalBodyEl = document.getElementById('modalBody');
const modalCloseBtn = document.getElementById('modalClose');

let lastFocusedBeforeModal = null;

function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const focusable = modalEl.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function onEscClose(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeModal();
  }
}

function openModal(title, contentHTML = '') {
  // close the left panel when opening the modal
  closePanel();

  lastFocusedBeforeModal = document.activeElement;

  modalTitleEl.textContent = title || ' ';
  modalBodyEl.innerHTML = contentHTML || '<p class="muted">Coming soon...</p>';

  modalBackdrop.hidden = false;
  document.body.classList.add('modal-open');

  // a11y: hide background landmarks from SR
  leftPanel.setAttribute('aria-hidden', 'true');
  mainContent.setAttribute('aria-hidden', 'true');
  topBar.setAttribute('aria-hidden', 'true');

  // focus management
  setTimeout(() => {
    modalCloseBtn.focus();
  }, 0);

  // listeners
  document.addEventListener('keydown', trapFocus);
  document.addEventListener('keydown', onEscClose);
}

function closeModal() {
  modalBackdrop.hidden = true;
  document.body.classList.remove('modal-open');

  // restore a11y attrs
  leftPanel.removeAttribute('aria-hidden');
  mainContent.removeAttribute('aria-hidden');
  topBar.removeAttribute('aria-hidden');

  // return focus
  if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
    lastFocusedBeforeModal.focus();
  }

  document.removeEventListener('keydown', trapFocus);
  document.removeEventListener('keydown', onEscClose);
}

modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});
modalCloseBtn.addEventListener('click', closeModal);

/* ------- Theme vars: edit + persist to localStorage ------- */

const THEME_STORAGE_KEY = 'themeVars.v1';
const VAR_LIST = [
  '--bg',
  '--bg-elevated',
  '--panel',
  '--border',
  '--text',
  '--text-muted',
  '--accent',
  '--like',
  '--shadow',
  '--topbar-h',
  '--page-gap',
  '--right-fixed-w',
  '--scrollbar-w',
  '--thumb-min-h',
  '--thumb-color',
  '--thumb-color-hover',

  // Post/feed typography controls
  '--post-font-family',
  '--post-base-size',
  '--post-line-height',
  '--post-content-size',
  '--post-header-size',
  '--comment-font-size',
  '--comment-meta-size'
];

function getComputedVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const DEFAULT_VARS = VAR_LIST.reduce((acc, k) => {
  acc[k] = getComputedVar(k);
  return acc;
}, {});

function loadSavedVars() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') return obj;
  } catch { }
  return null;
}

function saveVars(vars) {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(vars));
}

function applyVars(vars) {
  if (!vars) return;
  for (const [k, v] of Object.entries(vars)) {
    if (!VAR_LIST.includes(k)) continue;
    document.documentElement.style.setProperty(k, v);
  }
  // Update scrollbar if relevant dimensions changed
  window.queueScrollbarUpdate?.();
}

function clearVarsOverrides() {
  for (const k of VAR_LIST) {
    document.documentElement.style.removeProperty(k);
  }
}

function applySavedThemeOnLoad() {
  const saved = loadSavedVars();
  if (saved) applyVars(saved);
}
applySavedThemeOnLoad();

function isHexColor(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim());
}

function buildDisplayEditorHTML(values) {
  const fields = VAR_LIST.map((name) => {
    const val = values[name] ?? '';
    const isColor = isHexColor(val);
    const safeId = `var-${name.slice(2).replace(/[^a-z0-9_-]/gi, '-')}`;
    const colorInput = isColor
      ? `<input type="color" id="${safeId}-color" value="${val}" aria-label="${name} color">`
      : '';
    return `
      <div class="theme-field" data-var="${name}">
        <label for="${safeId}">
          <span>${name}</span>
        </label>
        <div class="row">
          <input type="text" id="${safeId}" value="${val}" placeholder="value e.g. #ffffff, 16px, 1rem, or 'Inter', sans-serif" />
          ${colorInput}
        </div>
      </div>
    `;
  }).join('');

  return `
    <form id="themeForm">
      <p class="muted">Edit any CSS variable. Changes apply live. Click Save to persist to this browser. Reset clears your overrides.</p>
      <p class="muted">Tip: For font families with spaces, wrap the name in quotes. Example: "Open Sans", sans-serif</p>
      <div class="theme-grid">
        ${fields}
      </div>
      <div class="theme-actions">
        <button type="button" class="perpet-btn" id="resetThemeBtn" title="Reset to defaults">Reset</button>
        <button type="button" class="perpet-btn" id="cancelThemeBtn">Cancel</button>
        <button type="submit" class="btn-primary" id="saveThemeBtn">Save</button>
      </div>
    </form>
  `;
}

function openDisplayModal() {
  // snapshot current values so we can revert if canceled
  const snapshot = VAR_LIST.reduce((acc, k) => {
    acc[k] = getComputedVar(k);
    return acc;
  }, {});

  const current = VAR_LIST.reduce((acc, k) => {
    // Prefer inline override if present, else computed (so editor shows live values)
    const inline = document.documentElement.style.getPropertyValue(k).trim();
    acc[k] = inline || getComputedVar(k);
    return acc;
  }, {});

  openModal('Display', buildDisplayEditorHTML(current));

  const form = document.getElementById('themeForm');
  const resetBtn = document.getElementById('resetThemeBtn');
  const cancelBtn = document.getElementById('cancelThemeBtn');

  // Wire field events
  const fieldEls = Array.from(form.querySelectorAll('.theme-field'));
  for (const field of fieldEls) {
    const varName = field.getAttribute('data-var');
    const textInput = field.querySelector('input[type="text"]');
    const colorInput = field.querySelector('input[type="color"]');

    // Text input changes apply live
    textInput.addEventListener('input', () => {
      const val = textInput.value;
      document.documentElement.style.setProperty(varName, val);
      if (colorInput && isHexColor(val)) {
        colorInput.value = val;
      }
      window.queueScrollbarUpdate?.();
    });

    if (colorInput) {
      colorInput.addEventListener('input', () => {
        const val = colorInput.value;
        textInput.value = val;
        document.documentElement.style.setProperty(varName, val);
        window.queueScrollbarUpdate?.();
      });
    }
  }

  // Reset to defaults
  resetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // remove overrides and clear storage
    clearVarsOverrides();
    saveVars(DEFAULT_VARS);
    applyVars(DEFAULT_VARS);
    // update inputs to default values
    for (const field of fieldEls) {
      const varName = field.getAttribute('data-var');
      const textInput = field.querySelector('input[type="text"]');
      const colorInput = field.querySelector('input[type="color"]');
      const defVal = DEFAULT_VARS[varName];
      textInput.value = defVal;
      if (colorInput && isHexColor(defVal)) {
        colorInput.value = defVal;
      }
    }
  });

  // Cancel = revert snapshot and close
  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    applyVars(snapshot);
    closeModal();
  });

  // Save = persist current inputs
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const out = {};
    for (const field of fieldEls) {
      const varName = field.getAttribute('data-var');
      const textInput = field.querySelector('input[type="text"]');
      out[varName] = textInput.value.trim();
    }
    saveVars(out);
    applyVars(out);
    closeModal();
  });
}

/* ------- Settings & Privacy (front-end only; persisted to localStorage) ------- */

const SETTINGS_STORAGE_KEY = 'appSettings.v1';
const DEFAULT_SETTINGS = {
  reduceMotion: false,
  compactMode: false,
  blurMedia: false,
  privateAccount: false,
  showReadReceipts: false,
  personalizedAds: false
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...(parsed || {}) };
    }
  } catch { }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s));
}

function applySettings(s) {
  document.body.classList.toggle('reduce-motion', !!s.reduceMotion);
  document.body.classList.toggle('compact', !!s.compactMode);
  document.body.classList.toggle('blur-media', !!s.blurMedia);
  document.body.classList.toggle('private-account', !!s.privateAccount);
  // The rest are just stored for fun
}

let CURRENT_SETTINGS = loadSettings();
applySettings(CURRENT_SETTINGS);

function buildSettingsHTML(s) {
  return `
    <form id="settingsForm">
      <div class="theme-field">
        <label><strong>General</strong></label>
        <div class="row" style="flex-direction:column; align-items:flex-start; gap:8px;">
          <label><input type="checkbox" id="reduceMotionChk" ${s.reduceMotion ? 'checked' : ''} /> Reduce motion</label>
          <label><input type="checkbox" id="compactModeChk" ${s.compactMode ? 'checked' : ''} /> Compact mode</label>
        </div>
      </div>

      <div class="theme-field">
        <label><strong>Privacy</strong></label>
        <div class="row" style="flex-direction:column; align-items:flex-start; gap:8px;">
          <label><input type="checkbox" id="privateAccountChk" ${s.privateAccount ? 'checked' : ''} /> Private account <span class="muted">(adds a fun lock next to your name)</span></label>
          <label><input type="checkbox" id="blurMediaChk" ${s.blurMedia ? 'checked' : ''} /> Blur sensitive media until hover</label>
          <label><input type="checkbox" id="readReceiptsChk" ${s.showReadReceipts ? 'checked' : ''} /> Show read receipts <span class="muted">(totally pretend)</span></label>
          <label><input type="checkbox" id="personalizedAdsChk" ${s.personalizedAds ? 'checked' : ''} /> Personalized ads <span class="muted">(we don’t actually show any)</span></label>
        </div>
      </div>

      <div class="theme-field">
        <label><strong>Data & storage</strong></label>
        <div class="row" style="flex-wrap:wrap;">
          <button type="button" class="perpet-btn" id="exportSettingsBtn" title="Download a JSON of your settings & theme">Export</button>
          <input type="file" id="importSettingsInput" accept="application/json" hidden />
          <button type="button" class="perpet-btn" id="importSettingsBtn">Import</button>
          <button type="button" class="perpet-btn" id="resetThemeGlobalBtn" title="Restore theme defaults">Reset Theme</button>
          <button type="button" class="perpet-btn" id="clearDataBtn" title="Remove saved settings from this browser">Clear Local Data</button>
        </div>
        <p class="muted" id="settingsStatus" aria-live="polite"></p>
      </div>

      <div class="theme-field">
        <label><strong>Privacy policy</strong></label>
        <p>We respect your privacy so much that not even the dev can read your stuff. Not your likes, not your comments, not even your hot takes. Your secrets are safe… for now. 🕵️‍♀️</p>
      </div>

      <div class="theme-actions">
        <button type="button" class="btn-ghost" id="closeSettingsBtn">Done</button>
      </div>
    </form>
  `;
}

function openSettingsModal() {
  openModal('Settings & privacy', buildSettingsHTML(CURRENT_SETTINGS));

  const qs = (id) => document.getElementById(id);
  const statusEl = qs('settingsStatus');

  function updateSetting(key, value) {
    CURRENT_SETTINGS = { ...CURRENT_SETTINGS, [key]: !!value };
    saveSettings(CURRENT_SETTINGS);
    applySettings(CURRENT_SETTINGS);
    statusEl.textContent = 'Saved.';
    setTimeout(() => { statusEl.textContent = ''; }, 1200);
  }

  // Wire toggles
  qs('reduceMotionChk')?.addEventListener('change', (e) => updateSetting('reduceMotion', e.target.checked));
  qs('compactModeChk')?.addEventListener('change', (e) => updateSetting('compactMode', e.target.checked));
  qs('blurMediaChk')?.addEventListener('change', (e) => updateSetting('blurMedia', e.target.checked));
  qs('privateAccountChk')?.addEventListener('change', (e) => updateSetting('privateAccount', e.target.checked));
  qs('readReceiptsChk')?.addEventListener('change', (e) => updateSetting('showReadReceipts', e.target.checked));
  qs('personalizedAdsChk')?.addEventListener('change', (e) => updateSetting('personalizedAds', e.target.checked));

  // Export
  qs('exportSettingsBtn')?.addEventListener('click', () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: CURRENT_SETTINGS,
      theme: loadSavedVars() || DEFAULT_VARS
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    statusEl.textContent = 'Exported.';
    setTimeout(() => { statusEl.textContent = ''; }, 1200);
  });

  // Import
  qs('importSettingsBtn')?.addEventListener('click', () => qs('importSettingsInput').click());
  qs('importSettingsInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (obj && obj.settings) {
        CURRENT_SETTINGS = { ...DEFAULT_SETTINGS, ...obj.settings };
        saveSettings(CURRENT_SETTINGS);
        applySettings(CURRENT_SETTINGS);
      }
      if (obj && obj.theme) {
        saveVars(obj.theme);
        applyVars(obj.theme);
      }
      statusEl.textContent = 'Imported settings.';
    } catch (err) {
      statusEl.textContent = 'Failed to import. Not valid JSON.';
    } finally {
      setTimeout(() => { statusEl.textContent = ''; }, 1500);
      e.target.value = ''; // reset input
    }
  });

  // Reset theme (global)
  qs('resetThemeGlobalBtn')?.addEventListener('click', () => {
    clearVarsOverrides();
    saveVars(DEFAULT_VARS);
    applyVars(DEFAULT_VARS);
    statusEl.textContent = 'Theme reset to defaults.';
    setTimeout(() => { statusEl.textContent = ''; }, 1200);
  });

  // Clear data
  qs('clearDataBtn')?.addEventListener('click', () => {
    if (!confirm('Clear local Settings & Theme data? This only affects this browser.')) return;
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(THEME_STORAGE_KEY);
    CURRENT_SETTINGS = { ...DEFAULT_SETTINGS };
    applySettings(CURRENT_SETTINGS);
    clearVarsOverrides();
    applyVars(DEFAULT_VARS);
    statusEl.textContent = 'Cleared local data.';
    setTimeout(() => { statusEl.textContent = ''; }, 1500);
  });

  // Close
  qs('closeSettingsBtn')?.addEventListener('click', () => closeModal());
}

/* ------- Feed post helpers ------- */

function createPost(author, date, content) {
  const firstLetter = author.charAt(0).toUpperCase();

  const post = document.createElement('div');
  post.className = 'post';

  post.innerHTML = `
    <div class="post-header">
      <div class="author-info">
        <div class="author-circle">${firstLetter}</div>
        <div class="post-author">${author}</div>
      </div>
      <div class="post-date">${date}</div>
    </div>

    <div class="post-content">${content}</div>
    <button class="expand-btn" aria-label="Expand post">...</button>
    <div class="post-actions">
      <div class="left-actions">
        <button class="like-btn" aria-label="Like post">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path class="heart-path"
              d="M15.7 4C18.87 4 21 6.98 21 9.76C21 15.39 12.16 20 12 20C11.84 20 3 15.39 3 9.76C3 6.98 5.13 4 8.3 4C10.12 4 11.31 4.91 12 5.71C12.69 4.91 13.88 4 15.7 4Z"
              stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </button>
        <button class="comment-btn" aria-label="Comment on post" aria-expanded="false">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path class="comment-path"
              d="M16 4C22.6274 4 28 8.68629 28 15C28 19.9706 23.2961 24 16 24C14.1947 24 12.5551 23.6083 11.1064 22.9257L7 26L8.23977 20.7253C6.55064 18.9367 6 17.1265 6 15C6 8.68629 11.3726 4 16 4Z"
              stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </button>
      </div>
      <div class="right-actions">
        <button class="perpet-btn" title="Perpetuate">Perpetuate</button>
      </div>
    </div>
  `;

  // Like button toggle + API
  const likeBtn = post.querySelector('.like-btn');
  const heartPath = likeBtn.querySelector('.heart-path');
  likeBtn.addEventListener('click', async () => {
    const postId = post.dataset.postId;
    if (!postId) return toast('Missing post id', 'error');
    const liked = likeBtn.classList.toggle('liked');
    // optimistic UI
    heartPath.setAttribute('stroke', liked ? '#e0245e' : '#000');
    heartPath.setAttribute('fill', liked ? '#e0245e' : 'none');
    try {
      if (liked) {
        await window.Ephemeral.likePost(postId);
      } else {
        await window.Ephemeral.unlikePost(postId);
      }
    } catch (err) {
      // revert on error
      likeBtn.classList.toggle('liked');
      const isLiked = likeBtn.classList.contains('liked');
      heartPath.setAttribute('stroke', isLiked ? '#e0245e' : '#000');
      heartPath.setAttribute('fill', isLiked ? '#e0245e' : 'none');
      toast(err?.message || 'Failed to update like', 'error');
    }
  });

  // Expand/collapse content toggle
  const expandBtn = post.querySelector('.expand-btn');
  const postContent = post.querySelector('.post-content');

  expandBtn.addEventListener('click', () => {
    const expanded = postContent.classList.toggle('expanded');
    post.classList.toggle('expanded', expanded);
    expandBtn.textContent = expanded ? 'Show Less' : '...';
    // Update custom scrollbar because content height changed
    window.queueScrollbarUpdate?.();
  });

  // Utilities for comments
  function addComment(commentsList, text, authorName = 'You') {
    const item = document.createElement('div');
    item.className = 'comment';
    const initial = authorName.charAt(0).toUpperCase();
    item.innerHTML = `
      <div class="author-circle small">${initial}</div>
      <div class="comment-body">
        <div class="comment-header">
          <span class="comment-author">${authorName}</span>
          <span class="comment-date">just now</span>
        </div>
        <div class="comment-text"></div>
      </div>
    `;
    item.querySelector('.comment-text').textContent = text;
    commentsList.appendChild(item);
  }

  // Simple time-ago for existing comments
  function timeAgoLabel(iso) {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (!Number.isFinite(diff)) return '';
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function ensureCommentsSection() {
    let commentsEl = post.querySelector('.comments');
    if (commentsEl) {
      return {
        commentsEl,
        commentInput: commentsEl.querySelector('.comment-input'),
        postCommentBtn: commentsEl.querySelector('.post-comment'),
        commentsList: commentsEl.querySelector('.comments-list'),
        loadCommentsIfNeeded: commentsEl._loadCommentsIfNeeded || (() => {}),
      };
    }

    commentsEl = document.createElement('div');
    commentsEl.className = 'comments';
    commentsEl.classList.add('hidden'); // use CSS class instead of [hidden]
    commentsEl.dataset.loaded = 'false';

    const commentsList = document.createElement('div');
    commentsList.className = 'comments-list';
    commentsList.setAttribute('aria-live', 'polite');

    const composer = document.createElement('div');
    composer.className = 'comment-composer';

    const commentInput = document.createElement('textarea');
    commentInput.className = 'comment-input';
    commentInput.rows = 2;
    commentInput.placeholder = 'Write a comment...';

    const controls = document.createElement('div');
    controls.className = 'comment-controls';

    const postCommentBtn = document.createElement('button');
    postCommentBtn.className = 'btn-primary post-comment';
    postCommentBtn.textContent = 'Post';
    postCommentBtn.disabled = true;

    controls.appendChild(postCommentBtn);
    composer.appendChild(commentInput);
    composer.appendChild(controls);

    commentsEl.appendChild(commentsList);
    commentsEl.appendChild(composer);

    const actions = post.querySelector('.post-actions');
    actions.after(commentsEl);

    // Load existing comments once when opened
    async function loadCommentsIfNeeded() {
      if (commentsEl.dataset.loaded === 'true') return;
      const postId = post.dataset.postId;
      if (!postId) return;
      try {
        commentsEl.dataset.loaded = 'loading';
        const res = await window.Ephemeral.listComments(postId, { limit: 50, offset: 0 });
        const arr = Array.isArray(res?.comments) ? res.comments : [];
        for (const c of arr) {
          const item = document.createElement('div');
          item.className = 'comment';
          const name = (c.author_handle || c.user_handle || c.user_id || 'User').toString();
          const initial = name.charAt(0).toUpperCase();
          item.innerHTML = `
            <div class="author-circle small">${initial}</div>
            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-author">${name}</span>
                <span class="comment-date">${timeAgoLabel(c.created_at)}</span>
              </div>
              <div class="comment-text"></div>
            </div>
          `;
          item.querySelector('.comment-text').textContent = c.content || '';
          commentsList.appendChild(item);
        }
      } catch (err) {
        toast(err?.message || 'Failed to load comments', 'error');
      } finally {
        commentsEl.dataset.loaded = 'true';
        window.queueScrollbarUpdate?.();
      }
    }
    // stash loader on element for reuse
    commentsEl._loadCommentsIfNeeded = loadCommentsIfNeeded;

    async function tryPostComment() {
      const text = commentInput.value.trim();
      if (!text) return;
      const postId = post.dataset.postId;
      if (!postId) return toast('Missing post id', 'error');
      postCommentBtn.disabled = true;
      try {
        await window.Ephemeral.addComment(postId, text);
        addComment(commentsList, text, 'You');
        commentInput.value = '';
      } catch (err) {
        toast(err?.message || 'Failed to post comment', 'error');
      } finally {
        postCommentBtn.disabled = false;
        commentsEl.scrollIntoView({ block: 'nearest' });
        window.queueScrollbarUpdate?.();
      }
    }

    commentInput.addEventListener('input', () => {
      postCommentBtn.disabled = commentInput.value.trim().length === 0;
    });

    commentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        tryPostComment();
      }
    });

    postCommentBtn.addEventListener('click', tryPostComment);

    return { commentsEl, commentInput, postCommentBtn, commentsList, loadCommentsIfNeeded };
  }

  // Comment section toggle
  const commentBtn = post.querySelector('.comment-btn');
  commentBtn.addEventListener('click', () => {
    const { commentsEl, commentInput, loadCommentsIfNeeded } = ensureCommentsSection();
    const isHidden = commentsEl.classList.contains('hidden');
    if (isHidden) {
      commentsEl.classList.remove('hidden');
      commentBtn.setAttribute('aria-expanded', 'true');
      loadCommentsIfNeeded?.();
      setTimeout(() => commentInput.focus(), 0);
    } else {
      commentsEl.classList.add('hidden');
      commentBtn.setAttribute('aria-expanded', 'false');
    }
    window.queueScrollbarUpdate?.();
  });

  // Perpetuate button -> prompt for a value then call API
  const perpetBtn = post.querySelector('.perpet-btn');
  perpetBtn.addEventListener('click', async () => {
    const postId = post.dataset.postId;
    if (!postId) return toast('Missing post id', 'error');
    const raw = prompt('Perpetuate value (positive number):', '1');
    if (raw == null) return;
    const val = Number(raw);
    if (!Number.isFinite(val) || val <= 0) return toast('Invalid value', 'warn');
    perpetBtn.disabled = true;
    try {
      const res = await window.Ephemeral.perpetuate(postId, val);
      const score = (res && res.trustScore != null) ? Number(res.trustScore).toFixed(2) : null;
      if (score != null) {
        toast(`Perpetuated (trust x${score})`, 'success');
      } else {
        toast('Perpetuated', 'success');
      }
    } catch (err) {
      if (err && err.body && err.body.maxAllowed) {
        toast(`Max allowed is ${err.body.maxAllowed}. Try a smaller value.`, 'warn');
      } else {
        toast(err?.message || 'Failed to perpetuate', 'error');
      }
    } finally {
      perpetBtn.disabled = false;
    }
  });

  return post;
}

/* ------- Left Panel Menu (wire Display to theme editor, Shortcuts to help) ------- */
function initLeftPanel() {
  // Display dialog
  const displayBtn = document.getElementById('displayBtn');
  if (displayBtn) {
    displayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDisplayModal();
    });
  }

  // Settings & privacy dialog
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettingsModal();
    });
  }

  // Shortcuts dialog
  const shortcutsBtn = document.getElementById('shortcutsBtn');
  if (shortcutsBtn) {
    shortcutsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openShortcutsModal();
    });
  }

  // Notifications: ask permission and send test
  const notificationsBtn = document.getElementById('notificationsBtn');
  if (notificationsBtn) {
    notificationsBtn.addEventListener('click', async (e) => {
      e.stopPropagation();

      // Close the panel so the permission prompt isn't obscured
      closePanel();

      if (!('Notification' in window)) {
        openModal('Notifications', '<p>This browser does not support the Notifications API.</p>');
        return;
      }

      // Some browsers require a secure context (HTTPS) except for localhost
      const isSecure =
        window.isSecureContext ||
        location.protocol === 'https:' ||
        location.hostname === 'localhost';

      if (!isSecure) {
        openModal(
          'Notifications',
          '<p>Notifications require a secure context (HTTPS). Please host this page over HTTPS or run on <code>localhost</code>.</p>'
        );
        return;
      }

      try {
        let permission = Notification.permission;
        if (permission !== 'granted') {
          permission = await Notification.requestPermission();
        }

        if (permission === 'granted') {
          const n = new Notification('Test notification', {
            body: 'Notifications are enabled. This is a test 🎉',
            icon: 'assets/icon.jpg',
            tag: 'test-notification'
          });
          n.onclick = () => {
            window.focus();
            n.close?.();
          };
          openModal('Notifications', '<p>Permission granted. A test notification was sent.</p>');
        } else if (permission === 'denied') {
          openModal(
            'Notifications',
            '<p>Permission denied. You can re-enable notifications in your browser’s site settings.</p>'
          );
        } else {
          openModal(
            'Notifications',
            '<p>Permission request was dismissed. Click Notifications again to retry.</p>'
          );
        }
      } catch (err) {
        openModal(
          'Notifications',
          `<p>Something went wrong requesting notification permission.</p><p class="muted">${(err && err.message) || err}</p>`
        );
      }
    });
  }
  function openProfileModal(handle) {
    fetch(`/profile${handle ? '?handle=' + encodeURIComponent(handle) : ''}`)
      .then(res => res.text())
      .then(html => {
        openModal('Profile', html);

        // If there's a save button, hook it up
        const saveBtn = document.getElementById('save-bio');
        if (saveBtn) {
          saveBtn.addEventListener('click', async () => {
            const bioEditor = document.getElementById('bio-editor');
            const avatarInput = document.getElementById('avatar-input'); // optional avatar field
            const data = {
              bio: bioEditor ? bioEditor.value : '',
              avatar_url: avatarInput ? avatarInput.value : ''
            };

            const response = await fetch('/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
              alert('Profile updated!');
            } else {
              alert('Error: ' + result.message);
            }
          });
        }
      })
      .catch(err => {
        console.error(err);
        openModal('Profile', '<p>Failed to load profile.</p>');
      });
  }

  // Replace just the profile button listener
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openProfileModal(); // your own profile
    });
  }

  // Generic backend placeholder dialog for Explore, Messages, Bookmarks, Lists
  function openBackendModal(title) {
    openModal(
      title,
      `<p>This section depends on backend services and isn't wired up in this demo.</p><p class="muted">Coming soon...</p>`
    );
  }

  const BACKEND_BUTTONS = {
    exploreBtn: 'Explore',
    messagesBtn: 'Messages',
    bookmarksBtn: 'Bookmarks',
    listsBtn: 'Lists',

  };

  Object.entries(BACKEND_BUTTONS).forEach(([id, title]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openBackendModal(title);
      });
    }
  });
}
initLeftPanel();

/**
 * Show the expand "..." button only if content exceeds the clamp (4 lines).
 */
function revealExpandIfNeeded(post) {
  const content = post.querySelector('.post-content');
  const btn = post.querySelector('.expand-btn');
  if (!content || !btn) return;

  requestAnimationFrame(() => {
    let lineHeight = parseFloat(getComputedStyle(content).lineHeight);
    if (Number.isNaN(lineHeight) || lineHeight <= 0) {
      const temp = document.createElement('span');
      temp.textContent = 'A';
      content.appendChild(temp);
      lineHeight = temp.getBoundingClientRect().height || 20;
      temp.remove();
    }
    const clampLines = 4;
    const clampHeight = Math.ceil(lineHeight * clampLines);

    const wasExpanded = content.classList.contains('expanded');
    if (!wasExpanded) content.classList.add('expanded');
    const fullHeight = content.scrollHeight;
    if (!wasExpanded) content.classList.remove('expanded');

    if (fullHeight > clampHeight + 2) {
      btn.classList.add('is-visible');
      btn.textContent = '...';
    } else {
      btn.remove();
    }
  });
}


/* ------- Instantiate sample posts ------- */

const postArea = document.querySelector('.left-main');

// Fixed sample post: properly closed template literal and appended to DOM

/* ------- Custom Scrollbars (native scrollbars hidden) ------- */

const SCROLLBAR_AUTO_HIDDEN = true; // experimental native behavior

if (SCROLLBAR_AUTO_HIDDEN) {
  document.documentElement.classList.add('scrollbar-auto-hidden');
} else {
  document.documentElement.classList.remove('scrollbar-auto-hidden');

  // Manual scrollbar polyfill for WebKit/Blink
  (function () {
    const css = `
      /* Hide native scrollbars */
      ::-webkit-scrollbar {
        display: none;
      }

      /* Track */
      .scrollbar-track {
        position: relative;
        width: var(--scrollbar-w);
        background: var(--bg-elevated);
        border-radius: 999px;
        opacity: 0.7;
      }

      /* Thumb */
      .scrollbar-thumb {
        position: absolute;
        top: 0;
        left: 0;
        height: var(--thumb-min-h);
        background: var(--thumb-color);
        border-radius: 999px;
        cursor: grab;
        opacity: 0.7;
      }
      .scrollbar-thumb:active {
        cursor: grabbing;
      }

      /* Show on hover */
      .scrollbar-track:hover .scrollbar-thumb {
        opacity: 1;
      }
    `;
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);

    // Observe all elements with overflow
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          // Init custom scrollbar
          initCustomScrollbar(entry.target);
        }
      }
    }, { threshold: [0] });

    // Track elements to observe
    const scrollables = document.querySelectorAll(
      '[class*="scroll-"]:not(.scrollbar-initialized)'
    );
    for (const el of scrollables) {
      observer.observe(el);
    }
  })();

  function initCustomScrollbar(scrollEl) {
    if (!scrollEl || scrollEl.classList.contains('scrollbar-initialized')) return;

    const track = document.createElement('div');
    track.className = 'scrollbar-track';

    const thumb = document.createElement('div');
    thumb.className = 'scrollbar-thumb';

    track.appendChild(thumb);
    scrollEl.appendChild(track);

    let isDragging = false;
    let dragStartY = 0;
    let startTop = 0;

    const { viewH, contentH, trackH, maxScroll } = getDims();

    function getDims() {
      const { clientHeight: viewH, scrollHeight: contentH } = scrollEl;
      const { clientHeight: trackH } = track;
      const maxScroll = Math.max(0, contentH - viewH);
      return { viewH, contentH, trackH, maxScroll };
    }

    function setThumb(top, height) {
      thumb.style.height = height+"px";
      thumb.style.top = top+"px";
    }

    function update() {
      const { viewH, contentH, trackH, maxScroll } = getDims();

      // Hide track if no overflow
      if (contentH <= viewH + 1) {
        track.style.display = 'none';
        return;
      } else {
        track.style.display = '';
      }

      const minThumb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--thumb-min-h')) || 28;
      const ratio = viewH / contentH;
      const thumbH = Math.max(minThumb, Math.floor(trackH * ratio));

      const maxThumbTop = trackH - thumbH;
      const scrollTop = scrollEl.scrollTop;
      const scrollRatio = maxScroll > 0 ? (scrollTop / maxScroll) : 0;
      const thumbTop = Math.round(maxThumbTop * scrollRatio);

      setThumb(thumbTop, thumbH);

      // Accessibility value (0-100)
      const valueNow = Math.round(scrollRatio * 100);
      thumb.setAttribute('aria-valuenow', String(valueNow));
    }

    function scrollToThumbTop(thumbTop) {
      const { viewH, contentH, trackH, maxScroll } = getDims();
      const thumbH = thumb.getBoundingClientRect().height || 1;
      const maxThumbTop = Math.max(0, trackH - thumbH);
      const clampedTop = Math.min(maxThumbTop, Math.max(0, thumbTop));
      const ratio = maxThumbTop > 0 ? (clampedTop / maxThumbTop) : 0;
      const newScroll = Math.round(maxScroll * ratio);
      scrollEl.scrollTop = newScroll;
    }

    function onThumbPointerDown(e) {
      e.preventDefault();
      isDragging = true;
      dragStartY = e.clientY;
      startTop = parseFloat(thumb.style.top || '0') || 0;
      thumb.setPointerCapture?.(e.pointerId);
      thumb.classList.add('dragging');
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const dy = e.clientY - dragStartY;
      const targetTop = startTop + dy;
      scrollToThumbTop(targetTop);
    }

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      thumb.releasePointerCapture?.(e.pointerId);
      thumb.classList.remove('dragging');
    }

    function onTrackPointerDown(e) {
      if (e.target === thumb) return; // handled by thumb
      const trackRect = track.getBoundingClientRect();
      const clickY = e.clientY - trackRect.top;
      const thumbH = thumb.getBoundingClientRect().height || 1;
      // Center thumb on click
      scrollToThumbTop(clickY - thumbH / 2);
    }

    // Sync on scroll/resize/content changes
    scrollEl.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    // Observe size/content changes to keep thumb updated
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(update);
      ro.observe(scrollEl);
    }
    if ('MutationObserver' in window) {
      const mo = new MutationObserver(() => queueScrollbarUpdate());
      mo.observe(scrollEl, { childList: true, subtree: true, characterData: true });
    }

    // Pointer events for dragging
    thumb.addEventListener('pointerdown', onThumbPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    track.addEventListener('pointerdown', onTrackPointerDown);

    // Public updater used by other code (e.g., expand/collapse)
    window.queueScrollbarUpdate = queueScrollbarUpdate;

    let rafId = 0;
    function queueScrollbarUpdate() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        update();
      });
    }

    // Initial paint
    queueScrollbarUpdate();

    // Mark as initialized
    scrollEl.classList.add('scrollbar-initialized');
  }

}

/* ------- Keyboard Shortcuts Dialog ------- */

// Utility: detect if target is editable (avoid capturing typing)
function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return el.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT';
}

function buildShortcutsHTML() {
  return (
    '<div class="shortcuts-wrapper">' +
      '<div class="shortcut-section">' +
        '<h3>General</h3>' +
        '<dl class="shortcuts-dl">' +
          '<dt><span class="keys"><kbd>?</kbd></span></dt>' +
          '<dd>Open keyboard shortcuts</dd>' +
          '<dt><span class="keys"><kbd>Esc</kbd></span></dt>' +
          '<dd>Close dialogs. If the menu is open, closes the menu</dd>' +
          '<dt><span class="keys"><kbd>M</kbd></span></dt>' +
          '<dd>Toggle left menu</dd>' +
          '<dt><span class="keys"><kbd>Tab</kbd></span></dt>' +
          '<dd>Move focus. Use <kbd>Shift</kbd> + <kbd>Tab</kbd> to move focus backward</dd>' +
        '</dl>' +
      '</div>' +
      '<div class="shortcut-section">' +
        '<h3>Comments</h3>' +
        '<dl class="shortcuts-dl">' +
          '<dt><span class="keys"><kbd>Enter</kbd></span></dt>' +
          '<dd>Post the comment (when typing in the comment box)</dd>' +
          '<dt><span class="keys"><kbd>Shift</kbd>+<kbd>Enter</kbd></span></dt>' +
          '<dd>Insert a new line in the comment box</dd>' +
        '</dl>' +
      '</div>' +
      '<p class="muted">Note: Some shortcuts are context-aware and only work when applicable.</p>' +
    '</div>'
  );
}

// Optional: allow any element with [data-open-shortcuts] to open the shortcuts modal
(() => {
  document.addEventListener('click', (e) => {
    const target = e.target.closest?.('[data-open-shortcuts]');
    if (!target) return;
    e.preventDefault();
    if (modalBackdrop.hidden === false) return; // already open
    openShortcutsModal();
  });
})();
function openShortcutsModal() {
  openModal('Keyboard shortcuts', buildShortcutsHTML());
}

// Global shortcut listeners
document.addEventListener('keydown', (e) => {
  const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

  // '?' to open shortcuts (ignore when typing)
  if (e.key === '?' && !hasModifier && !isEditableTarget(e.target)) {
    e.preventDefault();
    // If already open, do nothing
    if (modalBackdrop.hidden === false) return;
    openShortcutsModal();
    return;
  }

  // 'M' to toggle left menu (only when modal not open and not typing)
  if ((e.key === 'm' || e.key === 'M') && !hasModifier && !isEditableTarget(e.target)) {
    if (modalBackdrop.hidden === false) return;
    e.preventDefault();
    if (leftPanel.classList.contains('show')) {
      closePanel();
    } else {
      openPanel();
    }
    return;
  }

  // Esc closes left panel if open and no modal showing (modal Esc handled separately)
  if (e.key === 'Escape' && modalBackdrop.hidden && leftPanel.classList.contains('show')) {
    e.preventDefault();
    closePanel();
  }
});