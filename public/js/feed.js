(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const toast = (msg, type = 'info') => (window.toast ? window.toast(msg, type) : console.log(`[${type}]`, msg));

  const FEED_LIMIT = 25;
  let CURRENT_HANDLE = null;

  function setCurrentHandle(h) { CURRENT_HANDLE = h || CURRENT_HANDLE; }
  if (window.CURRENT_HANDLE) setCurrentHandle(window.CURRENT_HANDLE);
  document.addEventListener('ephemeral:session', (e) => setCurrentHandle(e?.detail?.handle));

  function shortUser(authorHandle, userId) {
    const handle = authorHandle || CURRENT_HANDLE;
    const looksHex64 = (s) => typeof s === 'string' && /^[0-9a-f]{64}$/i.test(s);
    if (handle && typeof handle === 'string' && handle.trim()) {
      return looksHex64(handle) ? `user_${handle.slice(-6)}` : handle;
    }
    const s = String(userId || '');
    return s.length > 6 ? `user_${s.slice(-6)}` : `user_${s}`;
  }

  function timeAgo(iso) {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function isVideo(url) {
    if (!url) return false;
    const u = String(url).toLowerCase();
    return u.endsWith('.mp4') || u.endsWith('.webm') || u.endsWith('.ogg');
  }

  function renderMedia(mediaUrl) {
    if (!mediaUrl) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'post-media';

    if (isVideo(mediaUrl)) {
      const v = document.createElement('video');
      v.src = mediaUrl;
      v.controls = true;
      v.preload = 'metadata';
      v.playsInline = true;
      v.style.width = '100%';
      v.style.height = '100%'; // fill wrapper height (capped via CSS)
      wrapper.appendChild(v);
      return wrapper;
    }
    const img = document.createElement('img');
    img.src = mediaUrl;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.style.width = '100%';
    img.style.height = '100%'; // fill wrapper height (capped via CSS)
    wrapper.appendChild(img);
    return wrapper;
  }

  function renderPost(post) {
    const author = shortUser(post.author_handle, post.user_id);
    const dateLabel = timeAgo(post.created_at || post.updated_at || new Date().toISOString());
    const content = post.content || '';

    if (typeof window.createPost !== 'function') {
      console.warn('uiHandler.createPost not available');
      const fallback = document.createElement('div');
      fallback.textContent = `${author}: ${content}`;
      return fallback;
    }

    const el = window.createPost(author, dateLabel, content);

    // Attach the post id for action handlers
    try {
      if (post && (post.id !== undefined && post.id !== null)) {
        el.dataset.postId = String(post.id);
      }
    } catch {}

    // Initialize like button state if present in payload
    try {
      const likeBtn = el.querySelector('.like-btn');
      const heartPath = likeBtn?.querySelector('.heart-path');
      if (likeBtn && heartPath && post.user_liked) {
        likeBtn.classList.add('liked');
        heartPath.setAttribute('stroke', '#e0245e');
        heartPath.setAttribute('fill', '#e0245e');
      }
    } catch {}

    // Show expand button only when needed
    try { window.revealExpandIfNeeded?.(el); } catch {}

    // Insert a compact @handle next to author for clarity (masked for hashes)
    try {
      const handleText = '@' + shortUser(post.author_handle, post.user_id);
      const authorInfo = el.querySelector('.author-info');
      if (authorInfo && !authorInfo.querySelector('.post-handle')) {
        const h = document.createElement('span');
        h.className = 'post-handle';
        h.textContent = handleText;
        const nameEl = authorInfo.querySelector('.post-author');
        if (nameEl) nameEl.insertAdjacentElement('afterend', h);
        else authorInfo.appendChild(h);
      }
    } catch {}

    if (post.media_url) {
      const mediaWrap = renderMedia(post.media_url);
      if (mediaWrap) {
        const contentEl = el.querySelector('.post-content') || el;
        contentEl.insertAdjacentElement('afterend', mediaWrap);
      }
    }

    return el;
  }

  function ensureFeedList(feedRoot) {
    let list = $('#feed-list', feedRoot);
    if (!list) {
      list = document.createElement('div');
      list.id = 'feed-list';
      feedRoot.appendChild(list);
    }
    return list;
  }

  // Minimal custom scrollbar controller for #feed using existing markup
  function bindCustomScrollbar(scroller) {
    const track = $('.custom-scrollbar');
    const thumb = track ? $('.custom-thumb', track) : null;
    if (!scroller || !track || !thumb) return () => {};

    function dims() {
      const viewH = scroller.clientHeight;
      const contentH = scroller.scrollHeight;
      const trackH = track.clientHeight;
      const maxScroll = Math.max(0, contentH - viewH);
      const minThumb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--thumb-min-h')) || 28;
      const ratio = contentH > 0 ? (viewH / contentH) : 1;
      const thumbH = Math.max(minThumb, Math.floor(trackH * ratio));
      return { viewH, contentH, trackH, maxScroll, thumbH };
    }

    function updateThumb() {
      const { trackH, maxScroll, thumbH } = dims();
      // Hide track if no overflow
      if (maxScroll <= 0) {
        track.style.display = 'none';
        return;
      }
      track.style.display = '';

      const maxThumbTop = Math.max(0, trackH - thumbH);
      const scrollRatio = maxScroll > 0 ? (scroller.scrollTop / maxScroll) : 0;
      const thumbTop = Math.round(maxThumbTop * scrollRatio);
      thumb.style.height = thumbH + 'px';
      thumb.style.top = thumbTop + 'px';
      thumb.setAttribute('aria-valuenow', String(Math.round(scrollRatio * 100)));
    }

    function scrollToThumbTop(thumbTop) {
      const { trackH, maxScroll, thumbH } = dims();
      const maxThumbTop = Math.max(0, trackH - thumbH);
      const clamped = Math.max(0, Math.min(maxThumbTop, thumbTop));
      const ratio = maxThumbTop > 0 ? clamped / maxThumbTop : 0;
      scroller.scrollTop = Math.round(maxScroll * ratio);
    }

    let dragging = false;
    let startY = 0;
    let startTop = 0;

    function onThumbDown(e) {
      dragging = true;
      startY = e.clientY;
      startTop = parseFloat(thumb.style.top || '0') || 0;
      thumb.setPointerCapture?.(e.pointerId);
      thumb.classList.add('dragging');
      e.preventDefault();
    }
    function onThumbMove(e) {
      if (!dragging) return;
      const dy = e.clientY - startY;
      scrollToThumbTop(startTop + dy);
    }
    function onThumbUp(e) {
      if (!dragging) return;
      dragging = false;
      thumb.releasePointerCapture?.(e.pointerId);
      thumb.classList.remove('dragging');
    }
    function onTrackClick(e) {
      if (e.target === thumb) return;
      const rect = track.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const th = thumb.getBoundingClientRect().height || 1;
      scrollToThumbTop(clickY - th / 2);
    }

    scroller.addEventListener('scroll', updateThumb, { passive: true });
    window.addEventListener('resize', updateThumb);
    thumb.addEventListener('pointerdown', onThumbDown);
    window.addEventListener('pointermove', onThumbMove);
    window.addEventListener('pointerup', onThumbUp);
    track.addEventListener('pointerdown', onTrackClick);

    // Expose queueScrollbarUpdate if not already
    if (!window.queueScrollbarUpdate) {
      window.queueScrollbarUpdate = () => requestAnimationFrame(updateThumb);
    }

    // Initial paint
    updateThumb();

    return () => {
      scroller.removeEventListener('scroll', updateThumb);
      window.removeEventListener('resize', updateThumb);
      window.removeEventListener('pointermove', onThumbMove);
      window.removeEventListener('pointerup', onThumbUp);
      thumb.removeEventListener('pointerdown', onThumbDown);
      track.removeEventListener('pointerdown', onTrackClick);
    };
  }

  function FeedController() {
    const feedRoot = $('#feed');
    const list = ensureFeedList(feedRoot);
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'btn-secondary';
    loadMoreBtn.textContent = 'Load more';
    loadMoreBtn.style.display = 'none';
    feedRoot.appendChild(loadMoreBtn);

    let offset = 0;
    let loading = false;
    let done = false;

    const unbindScrollbar = bindCustomScrollbar(feedRoot);

    async function fetchBatch() {
      if (loading || done) return [];
      loading = true;
      loadMoreBtn.disabled = true;
      try {
        const res = await window.Ephemeral.getMyFeed({ limit: FEED_LIMIT, offset });
        const posts = Array.isArray(res?.posts) ? res.posts : [];
        if (posts.length === 0) {
          done = true;
          loadMoreBtn.style.display = 'none';
          if (offset === 0) {
            const empty = document.createElement('div');
            empty.className = 'feed-empty';
            empty.textContent = 'No posts yet. Follow tags and creators, or create the first post!';
            list.appendChild(empty);
          }
          return [];
        }
        offset += posts.length;
        loadMoreBtn.style.display = posts.length >= FEED_LIMIT ? '' : 'none';
        return posts;
      } catch (err) {
        if (err && err.status === 401) {
          toast('Please log in to see your feed', 'warn');
        } else {
          toast(err?.message || 'Failed to load feed', 'error');
        }
        return [];
      } finally {
        loading = false;
        loadMoreBtn.disabled = false;
      }
    }

    async function loadInitial() {
      offset = 0; loading = false; done = false;
      list.innerHTML = '';
      const posts = await fetchBatch();
      for (const p of posts) list.appendChild(renderPost(p));
      window.queueScrollbarUpdate?.();
    }

    async function loadMore() {
      const posts = await fetchBatch();
      for (const p of posts) list.appendChild(renderPost(p));
      window.queueScrollbarUpdate?.();
    }

    function onScroll() {
      const scroller = feedRoot.closest('.left-col') || document.documentElement;
      const el = scroller === document.documentElement ? document.documentElement : scroller;
      const scrollTop = el.scrollTop;
      const height = el.clientHeight;
      const scrollHeight = el.scrollHeight;
      if (scrollTop + height >= scrollHeight - 300) loadMore();
    }

    loadMoreBtn.addEventListener('click', loadMore);
    document.addEventListener('scroll', onScroll, { passive: true });

    // Prepend newly created posts
    document.addEventListener('ephemeral:postCreated', (e) => {
      const data = e.detail || {};
      const post = data.post || data?.post?.post || data?.post;
      if (!post) return;
      post.author_handle = CURRENT_HANDLE || post.author_handle;
      const card = renderPost(post);
      list.prepend(card);
      window.queueScrollbarUpdate?.();
    });

    // Initial load
    loadInitial();

    return { loadInitial, loadMore, destroy: unbindScrollbar };
  }

  async function renderTrending() {
    try {
      const res = await fetch('/api/feed/trending?limit=5', { credentials: 'include' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      const items = Array.isArray(body?.posts) ? body.posts : [];
      const top = document.querySelector('.right .top');
      if (!top) return;
      let list = top.querySelector('#trending-list');
      if (!list) {
        list = document.createElement('ul');
        list.id = 'trending-list';
        list.className = 'trending-list';
        top.appendChild(list);
      }
      list.innerHTML = '';
      for (const p of items) {
        const li = document.createElement('li');
        li.className = 'trending-item';
        const author = shortUser(p.author_handle, p.user_id);
        li.textContent = `${author}: ${(p.content || '').slice(0, 80)}${(p.content && p.content.length > 80 ? '…' : '')}`;
        list.appendChild(li);
      }
    } catch (err) {
      console.warn('Trending load failed', err);
    }
  }

  function init() {
    try { FeedController(); } catch (e) { console.error(e); }
    renderTrending();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    } else {
    init();
  }
})();
