/* ============================================================
   APP.JS — Core logic
   - Theme toggle
   - Navbar + mobile menu
   - Scroll progress + back-to-top
   - Active nav highlight
   - Reveal on scroll
   - Counter animation
   - Spotlight cards
   - Photo 3D tilt + sparkle particles
   - Particle canvas
   - Project modal
   - Lightbox
   - Video embed
   ============================================================ */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================
     THEME TOGGLE
     ========================================================== */
  (function initTheme() {
    var root = document.documentElement;
    var themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    function label() {
      var isDark = root.getAttribute('data-theme') === 'dark';
      themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
    }

    themeToggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('rd-theme', next); } catch (e) {}
      label();
    });

    label();
  })();

  /* ==========================================================
     NAVBAR + MOBILE MENU
     ========================================================== */
  (function initNav() {
    var nav = document.getElementById('siteNav');
    var menuBtn = document.getElementById('menuBtn');
    var mobilePanel = document.getElementById('mobilePanel');
    if (!nav || !menuBtn || !mobilePanel) return;

    function setScrolled() {
      nav.classList.toggle('scrolled', window.scrollY > 12);
    }
    setScrolled();

    menuBtn.addEventListener('click', function () {
      var open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      menuBtn.setAttribute('aria-label', open ? 'Buka menu' : 'Tutup menu');
      mobilePanel.classList.toggle('open', !open);
    });

    mobilePanel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobilePanel.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.setAttribute('aria-label', 'Buka menu');
      });
    });

    window.__rd_setNavScrolled = setScrolled;
  })();

  /* ==========================================================
     SCROLL PROGRESS + BACK-TO-TOP
     ========================================================== */
  (function initScrollProgress() {
    var progress = document.getElementById('scrollProgress');
    var toTopFloat = document.getElementById('toTopFloat');
    if (!progress || !toTopFloat) return;

    function update() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? window.scrollY / h : 0;
      progress.style.transform = 'scaleX(' + Math.min(Math.max(p, 0), 1) + ')';
      toTopFloat.classList.toggle('show', window.scrollY > 500);
    }

    toTopFloat.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    window.__rd_updateScroll = update;
    update();
  })();

  /* ==========================================================
     SCROLL HANDLER (rAF-throttled)
     ========================================================== */
  (function initScrollHandler() {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        if (window.__rd_setNavScrolled) window.__rd_setNavScrolled();
        if (window.__rd_updateScroll) window.__rd_updateScroll();
        ticking = false;
      });
    }, { passive: true });
  })();

  /* ==========================================================
     ACTIVE NAV HIGHLIGHT
     ========================================================== */
  (function initActiveNav() {
    var navAnchors = document.querySelectorAll('.nav-links a[data-nav]');
    var tracked = ['home','about','skills','projects','experience','education','contact'];
    if (!navAnchors.length || !('IntersectionObserver' in window)) return;

    function setActive(id) {
      navAnchors.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('data-nav') === id);
      });
    }

    var obs = new IntersectionObserver(function (entries) {
      var vis = entries.filter(function (e) { return e.isIntersecting; });
      if (!vis.length) return;
      vis.sort(function (a,b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      setActive(vis[0].target.id);
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    tracked.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) obs.observe(el);
    });
  })();

  /* ==========================================================
     REVEAL ON SCROLL
     ========================================================== */
  (function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    els.forEach(function (el) { obs.observe(el); });
  })();

  /* ==========================================================
     COUNTER ANIMATION
     ========================================================== */
  (function initCounters() {
    function animate(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (isNaN(target)) return;
      if (reduceMotion) { el.textContent = String(target); return; }

      var start = performance.now(), dur = 1400;
      function frame(now) {
        var t = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(frame);
        else el.textContent = String(target);
      }
      requestAnimationFrame(frame);
    }

    var els = document.querySelectorAll('.count');
    if (!els.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animate(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { obs.observe(el); });
  })();

  /* ==========================================================
     SPOTLIGHT CARDS
     ========================================================== */
  (function initSpotlight() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (reduceMotion) return;

    document.querySelectorAll('[data-spotlight]').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      card.addEventListener('mouseleave', function () {
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      });
    });
  })();

  /* ==========================================================
     PHOTO 3D TILT + SPARKLE PARTICLES
     ========================================================== */
  (function initPhotoStage() {
    var stage = document.getElementById('tiltPhoto');
    if (!stage) return;

    /* --------------------------------------------------------
       Sparkle particles
       -------------------------------------------------------- */
    (function initSparkles() {
      if (reduceMotion) return;
      var container = document.getElementById('sparkles');
      if (!container) return;

      var COUNT = 14;
      var frag = document.createDocumentFragment();

      for (var i = 0; i < COUNT; i++) {
        var s = document.createElement('span');
        s.className = 'spark';
        s.style.left = (Math.random() * 100) + '%';
        s.style.top  = (Math.random() * 100) + '%';
        s.style.setProperty('--dur', (4 + Math.random() * 4) + 's');
        s.style.setProperty('--delay', (Math.random() * 6) + 's');

        var size = 3 + Math.random() * 3;
        s.style.width = size + 'px';
        s.style.height = size + 'px';

        frag.appendChild(s);
      }
      container.appendChild(frag);
    })();

    /* --------------------------------------------------------
       3D Tilt on hover
       -------------------------------------------------------- */
    if (reduceMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var wrap = stage.closest('.hero-media');
    if (!wrap) return;

    var rafId = null;
    var targetRotX = 0, targetRotY = 0;
    var currentRotX = 0, currentRotY = 0;

    function tick() {
      currentRotX += (targetRotX - currentRotX) * 0.12;
      currentRotY += (targetRotY - currentRotY) * 0.12;

      stage.style.transform =
        'rotateX(' + currentRotX + 'deg) ' +
        'rotateY(' + currentRotY + 'deg) ' +
        'translateZ(0)';

      if (Math.abs(targetRotX - currentRotX) > 0.01 ||
          Math.abs(targetRotY - currentRotY) > 0.01) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }

    wrap.addEventListener('mousemove', function (e) {
      var r = wrap.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;

      targetRotY = px * 14;
      targetRotX = -py * 14;

      if (!rafId) rafId = requestAnimationFrame(tick);
    });

    wrap.addEventListener('mouseleave', function () {
      targetRotX = 0;
      targetRotY = 0;
      if (!rafId) rafId = requestAnimationFrame(tick);
    });
  })();

  /* ==========================================================
     PARTICLE CANVAS
     ========================================================== */
  (function initParticles() {
    if (reduceMotion) return;
    var canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var particles = [];
    var mouse = { x: -9999, y: -9999 };
    var rafId = null;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function getColor() {
      var style = getComputedStyle(document.documentElement);
      return {
        dot: style.getPropertyValue('--particle').trim() || 'rgba(76,201,240,.55)',
        line: style.getPropertyValue('--particle-line').trim() || 'rgba(76,201,240,.08)'
      };
    }
    var colors = getColor();

    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.min(Math.floor((w * h) / 22000), 70);
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.6 + 0.6,
          ox: 0, oy: 0
        });
      }
    }

    function draw() {
      var w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        var dx = p.x - mouse.x, dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          var force = (130 - dist) / 130;
          p.ox += (dx / dist) * force * 0.9;
          p.oy += (dy / dist) * force * 0.9;
        }
        p.ox *= 0.92;
        p.oy *= 0.92;
        p.x += p.vx + p.ox;
        p.y += p.vy + p.oy;

        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var ldx = p.x - q.x, ldy = p.y - q.y;
          var ld = Math.sqrt(ldx * ldx + ldy * ldy);
          if (ld < 120) {
            var alpha = (1 - ld / 120) * 0.6;
            ctx.strokeStyle = colors.line;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.dot;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(draw);
    }

    function start() { if (rafId) return; draw(); }
    function stop() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });
    window.addEventListener('mouseleave', function () {
      mouse.x = -9999; mouse.y = -9999;
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    resize();
    start();

    var themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function () {
        setTimeout(function () { colors = getColor(); }, 100);
      });
    }
  })();

  /* ==========================================================
     PROJECT DATA + MODAL
     ========================================================== */
  (function initProjects() {
    var PROJECTS = {
      wa: {
        title: 'WhatsApp Chat Bot',
        category: 'Development / Automation',
        year: '2023 — 2026',
        image: 'https://i.ibb.co/TBvq7wzB/Screenshot-20260930-115422-Whats-App.jpg',
        imageAlt: 'Tangkapan layar proyek WhatsApp Chat Bot',
        overview: [
          'WhatsApp Chat Bot merupakan salah satu proyek yang pernah saya kembangkan untuk membantu berbagai kebutuhan sehari-hari melalui WhatsApp. Proyek ini saya kembangkan secara bertahap, mulai dari mencoba membuat bot pada tahun 2023 hingga kembali mengembangkan dan memperbaruinya pada tahun 2026.',
          'Bot dapat dikembangkan dengan berbagai fitur sesuai kebutuhan, sehingga proyek ini menjadi salah satu cara saya mempelajari lebih jauh tentang automation, API, server, dan pengembangan aplikasi berbasis WhatsApp.'
        ],
        role: 'Developer',
        tech: ['VPS','Panel Pterodactyl','API','JavaScript','Backend','Tools pendukung Bot WhatsApp'],
        timeline: ['2023 — Pengembangan awal','2026 — Pengembangan dan pembaruan terbaru'],
        link: null
      },
      multimedia: {
        title: 'Multimedia Tools',
        category: 'Web Development / Digital Tools',
        year: '2026',
        image: null,
        overview: [
          'Multimedia Tools adalah platform all-in-one yang saya kembangkan untuk menyediakan berbagai kebutuhan multimedia dalam satu tempat.',
          'Proyek ini saya buat sebagai salah satu bentuk eksplorasi saya dalam pengembangan website, integrasi API, serta pemanfaatan berbagai teknologi digital dalam satu platform.'
        ],
        features: ['Video Downloader','TikTok Downloader','YouTube Downloader','Instagram Downloader','Pinterest Search','Video to Audio Converter','AI Background Remover','AI Image Generator','HD Photo Enhancer','Text to Speech','Sound Randomizer','Vocal / Music Separator'],
        role: 'Developer',
        tech: ['API','Netlify','JavaScript','Berbagai layanan dan tools pendukung'],
        timeline: null,
        link: 'https://multimedia-tools.netlify.app'
      }
    };

    var modal = document.getElementById('projectModal');
    var modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;
    var lastFocused = null;

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
      });
    }

    function build(key) {
      var p = PROJECTS[key];
      if (!p) return '';
      var h = '';
      if (p.image) h += '<img class="modal-img" src="' + esc(p.image) + '" alt="' + esc(p.imageAlt) + '" loading="lazy">';
      h += '<p class="modal-cat">' + esc(p.category) + ' — ' + esc(p.year) + '</p>';
      h += '<h2 id="modalTitle">' + esc(p.title) + '</h2>';
      h += '<h3>Overview</h3>';
      p.overview.forEach(function (par) { h += '<p>' + esc(par) + '</p>'; });
      h += '<h3>My Role</h3><p>' + esc(p.role) + '</p>';
      if (p.features) {
        h += '<h3>Features</h3><ul>';
        p.features.forEach(function (f) { h += '<li>' + esc(f) + '</li>'; });
        h += '</ul>';
      }
      h += '<h3>Technology</h3><ul>';
      p.tech.forEach(function (t) { h += '<li>' + esc(t) + '</li>'; });
      h += '</ul>';
      if (p.timeline) {
        h += '<h3>Timeline</h3><ul>';
        p.timeline.forEach(function (t) { h += '<li>' + esc(t) + '</li>'; });
        h += '</ul>';
      }
      if (p.link) {
        h += '<h3>Website</h3><p><a class="link-arrow" href="' + esc(p.link) + '" target="_blank" rel="noopener">Buka Website <svg width="13" height="13"><use href="#i-arrow-up-right"/></svg></a></p>';
      }
      return h;
    }

    function open(key) {
      var c = build(key);
      if (!c) return;
      lastFocused = document.activeElement;
      modalBody.innerHTML = c;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      var cb = modal.querySelector('.modal-close');
      if (cb) cb.focus();
    }

    function close() {
      modal.hidden = true;
      modalBody.innerHTML = '';
      document.body.style.overflow = '';
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    document.querySelectorAll('[data-project]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        open(el.getAttribute('data-project'));
      });
      if (el.tagName === 'ARTICLE') {
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open(el.getAttribute('data-project'));
          }
        });
      }
    });

    modal.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) close();
    });

    window.__rd_closeModal = close;
    window.__rd_modalEl = modal;
  })();

  /* ==========================================================
     LIGHTBOX
     ========================================================== */
  (function initLightbox() {
    var lb = document.getElementById('lightbox');
    var lbImg = document.getElementById('lightboxImg');
    var lbTitle = document.getElementById('lightboxTitle');
    var lbCat = document.getElementById('lightboxCat');
    var lbClose = document.getElementById('lightboxClose');
    if (!lb || !lbClose) return;
    var lastFocus = null;

    function open(btn) {
      lastFocus = btn;
      lbImg.src = btn.getAttribute('data-lightbox');
      lbImg.alt = btn.getAttribute('data-title') || 'Karya';
      lbTitle.textContent = btn.getAttribute('data-title') || '';
      lbCat.textContent = btn.getAttribute('data-category') || '';
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    }

    function close() {
      lb.hidden = true;
      lbImg.src = '';
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.querySelectorAll('[data-lightbox]').forEach(function (btn) {
      btn.addEventListener('click', function () { open(btn); });
    });
    lbClose.addEventListener('click', close);
    lb.addEventListener('click', function (e) {
      if (e.target === lb) close();
    });

    window.__rd_closeLightbox = close;
    window.__rd_lightboxEl = lb;
  })();

  /* ==========================================================
     GLOBAL ESC HANDLER
     ========================================================== */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (window.__rd_lightboxEl && !window.__rd_lightboxEl.hidden) {
      if (window.__rd_closeLightbox) window.__rd_closeLightbox();
      return;
    }
    if (window.__rd_modalEl && !window.__rd_modalEl.hidden) {
      if (window.__rd_closeModal) window.__rd_closeModal();
    }
  });

  /* ==========================================================
     VIDEO EMBED (lazy load on click)
     ========================================================== */
  (function initVideo() {
    var btn = document.getElementById('playVideo');
    var frame = document.getElementById('videoFrame');
    if (!btn || !frame) return;

    btn.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/rUvju1TBRvI?autoplay=1&rel=0';
      iframe.title = 'Video editing';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      frame.innerHTML = '';
      frame.appendChild(iframe);
    });
  })();

})();
