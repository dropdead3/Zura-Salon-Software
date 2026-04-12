/**
 * Zura Booking Embed Loader
 * Lightweight vanilla JS script (~3KB) for embedding Zura booking on third-party sites.
 *
 * Usage (inline):
 *   <div id="zura-booking" style="min-height:600px"></div>
 *   <script src="https://app.getzura.com/embed.js" data-zura-org="salon-slug" data-zura-mode="inline"></script>
 *
 * Usage (modal):
 *   <button onclick="window.ZuraBooking.open()">Book Now</button>
 *   <script src="https://app.getzura.com/embed.js" data-zura-org="salon-slug" data-zura-mode="modal"></script>
 */
(function () {
  'use strict';

  var NAMESPACE = 'zura-booking';
  var script = document.currentScript;
  if (!script) return;

  var orgSlug = script.getAttribute('data-zura-org') || '';
  var mode = script.getAttribute('data-zura-mode') || 'inline';
  var origin = script.src ? new URL(script.src).origin : '';

  // Collect deep link params from data attributes
  var paramKeys = ['service', 'stylist', 'location', 'category', 'consultation'];
  var params = ['embed=true'];
  paramKeys.forEach(function (key) {
    var val = script.getAttribute('data-zura-' + key);
    if (val) params.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
  });

  var bookingUrl = origin + '/book/' + orgSlug + '?' + params.join('&');

  function createIframe(container) {
    var iframe = document.createElement('iframe');
    iframe.src = bookingUrl;
    iframe.style.cssText = 'width:100%;border:none;display:block;min-height:600px;';
    iframe.setAttribute('allow', 'payment');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', 'Book an appointment');
    container.appendChild(iframe);
    return iframe;
  }

  // ─── Listen for postMessage from iframe ────────────────────────
  var activeIframe = null;

  window.addEventListener('message', function (event) {
    if (!event.data || event.data.namespace !== NAMESPACE) return;

    var type = event.data.type;
    var payload = event.data.payload || {};

    switch (type) {
      case 'ZURA_BOOKING_READY':
        break;

      case 'ZURA_BOOKING_RESIZE':
        if (activeIframe && payload.height) {
          activeIframe.style.height = payload.height + 'px';
        }
        break;

      case 'ZURA_BOOKING_COMPLETE':
        if (window.ZuraBooking && window.ZuraBooking.onComplete) {
          window.ZuraBooking.onComplete(payload);
        }
        break;

      case 'ZURA_MODAL_CLOSE':
        closeModal();
        break;
    }
  });

  // ─── Inline Mode ───────────────────────────────────────────────
  if (mode === 'inline') {
    var container = document.getElementById('zura-booking');
    if (container) {
      activeIframe = createIframe(container);
    }
  }

  // ─── Modal Mode ────────────────────────────────────────────────
  var overlay = null;

  function openModal() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);' +
      'display:flex;align-items:center;justify-content:center;' +
      'animation:zuraFadeIn .2s ease;';

    var modal = document.createElement('div');
    modal.style.cssText =
      'width:90%;max-width:520px;height:90vh;max-height:800px;' +
      'background:#fff;border-radius:16px;overflow:hidden;position:relative;' +
      'box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);';

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText =
      'position:absolute;top:12px;right:14px;z-index:10;' +
      'background:none;border:none;font-size:24px;color:#666;cursor:pointer;' +
      'width:32px;height:32px;display:flex;align-items:center;justify-content:center;' +
      'border-radius:50%;transition:background .15s;';
    closeBtn.onmouseover = function () { closeBtn.style.background = 'rgba(0,0,0,0.06)'; };
    closeBtn.onmouseout = function () { closeBtn.style.background = 'none'; };
    closeBtn.onclick = closeModal;

    modal.appendChild(closeBtn);
    activeIframe = createIframe(modal);
    activeIframe.style.height = '100%';
    activeIframe.style.minHeight = '0';

    overlay.appendChild(modal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    activeIframe = null;
    document.body.style.overflow = '';
  }

  // ─── Add fade-in keyframe ──────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = '@keyframes zuraFadeIn{from{opacity:0}to{opacity:1}}';
  document.head.appendChild(style);

  // ─── Public API ────────────────────────────────────────────────
  window.ZuraBooking = window.ZuraBooking || {};
  window.ZuraBooking.open = openModal;
  window.ZuraBooking.close = closeModal;

  // Auto-open modal if mode is modal and there's no manual trigger intent
  if (mode === 'modal') {
    // Don't auto-open — wait for ZuraBooking.open() call
  }
})();
