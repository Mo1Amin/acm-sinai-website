(function () {
  'use strict';
  var root = document.documentElement;

  // ---------- Mobile menu ----------
  var openMenu = document.getElementById('open-menu');
  var menu = document.getElementById('mobile-menu');
  function closeMenu() { if (menu) { menu.classList.add('menu-hidden'); menu.classList.remove('menu-visible'); } }
  if (openMenu && menu) {
    openMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('menu-hidden');
      menu.classList.toggle('menu-visible');
    });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('click', function (e) { if (!menu.contains(e.target) && !openMenu.contains(e.target)) closeMenu(); });
  }

  // ---------- Theme ----------
  var onThemeChange = [];
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
      onThemeChange.forEach(function (fn) { fn(dark); });
    });
  });

  // ---------- Scroll progress ----------
  var bar = document.getElementById('progress-bar');
  if (bar) {
    window.addEventListener('scroll', function () {
      var h = root.scrollHeight - root.clientHeight;
      bar.style.width = (h > 0 ? (root.scrollTop / h) * 100 : 0) + '%';
    }, { passive: true });
  }

  // ---------- Analytics (cookieless) ----------
  var endpoint = document.body.getAttribute('data-collect');
  function send(type, target) {
    if (!endpoint) return;
    var payload = JSON.stringify({ type: type, path: location.pathname + location.search, target: target || null, ref: type === 'pageview' ? document.referrer : null });
    try {
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true, credentials: 'omit' });
    } catch (e) {}
  }
  send('pageview');
  if ('IntersectionObserver' in window) {
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var id = en.target.getAttribute('data-section');
        if (en.isIntersecting && !seen[id]) { seen[id] = true; send('section', id); }
      });
    }, { threshold: 0.35 });
    document.querySelectorAll('[data-section]').forEach(function (el) { io.observe(el); });
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-click]');
    if (el) send('click', el.getAttribute('data-click'));
  });

  // ---------- Gallery lightbox ----------
  var dataEl = document.getElementById('gallery-data');
  var lbRoot = document.getElementById('lightbox');
  if (dataEl && lbRoot) {
    var albums = JSON.parse(dataEl.textContent || '[]');
    var lb = { album: null, index: 0, last: null,
      img: document.getElementById('lb-image'), title: document.getElementById('lb-title'),
      counter: document.getElementById('lb-counter'), caption: document.getElementById('lb-caption'),
      thumbs: document.getElementById('lb-thumbs') };

    var show = function (i) {
      var photos = lb.album.photos;
      lb.index = (i + photos.length) % photos.length;
      var p = photos[lb.index];
      lb.img.style.opacity = 0;
      lb.img.onload = function () { lb.img.style.opacity = 1; };
      lb.img.src = p.src;
      lb.img.alt = p.caption || lb.album.title;
      lb.caption.textContent = p.caption || '';
      lb.counter.textContent = (lb.index + 1) + ' / ' + photos.length;
      lb.thumbs.querySelectorAll('button').forEach(function (b, k) {
        b.classList.toggle('ring-4', k === lb.index);
        b.classList.toggle('opacity-50', k !== lb.index);
        if (k === lb.index) b.scrollIntoView({ block: 'nearest', inline: 'center' });
      });
      [lb.index + 1, lb.index - 1].forEach(function (k) { var n = photos[(k + photos.length) % photos.length]; new Image().src = n.src; });
    };
    var open = function (i) {
      lb.album = albums[i];
      if (!lb.album || !lb.album.photos.length) return;
      lb.last = document.activeElement;
      lb.title.textContent = lb.album.title;
      lb.thumbs.innerHTML = '';
      lb.album.photos.forEach(function (p, k) {
        var b = document.createElement('button');
        b.type = 'button'; b.setAttribute('data-i', k); b.setAttribute('aria-label', 'Photo ' + (k + 1));
        b.className = 'shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden ring-cyan-400 transition-opacity';
        var im = document.createElement('img'); im.src = p.thumb || p.src; im.alt = ''; im.loading = 'lazy'; im.className = 'w-full h-full object-cover';
        b.appendChild(im); lb.thumbs.appendChild(b);
      });
      var single = lb.album.photos.length < 2;
      document.getElementById('lb-prev').classList.toggle('hidden', single);
      document.getElementById('lb-next').classList.toggle('hidden', single);
      lbRoot.classList.remove('lb-hidden');
      document.body.classList.add('lb-open');
      show(0);
      document.getElementById('lb-close').focus();
      send('click', 'album:' + lb.album.title);
    };
    var close = function () {
      lbRoot.classList.add('lb-hidden');
      document.body.classList.remove('lb-open');
      lb.album = null;
      if (lb.last) lb.last.focus();
    };
    document.getElementById('gallery-grid').addEventListener('click', function (e) {
      var c = e.target.closest('.album-tile'); if (c) open(+c.getAttribute('data-album'));
    });
    lb.thumbs.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) show(+b.getAttribute('data-i')); });
    document.getElementById('lb-close').addEventListener('click', close);
    document.getElementById('lb-prev').addEventListener('click', function () { show(lb.index - 1); });
    document.getElementById('lb-next').addEventListener('click', function () { show(lb.index + 1); });
    document.getElementById('lb-stage').addEventListener('click', function (e) { if (e.target.id === 'lb-stage') close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.album) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(lb.index + 1);
      else if (e.key === 'ArrowLeft') show(lb.index - 1);
    });
    var tx = null;
    lb.img.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    lb.img.addEventListener('touchend', function (e) {
      if (tx === null) return;
      var dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) show(lb.index + (dx < 0 ? 1 : -1));
      tx = null;
    });
  }

  // ---------- Scroll reveal (cards appear and disappear as you scroll) ----------
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    var settleTimers = new WeakMap();
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var el = en.target;
        clearTimeout(settleTimers.get(el));
        if (en.isIntersecting) {
          el.classList.remove('is-out-up');
          el.classList.add('is-in');
          var d = parseInt(getComputedStyle(el).getPropertyValue('--d'), 10) || 0;
          settleTimers.set(el, setTimeout(function () { el.classList.add('settled'); }, d + 850));
          countUp(el);
          if (el.getAttribute('data-reveal') !== 'toggle') rio.unobserve(el);
        } else if (el.classList.contains('is-in')) {
          el.classList.remove('is-in', 'settled');
          // Left through the top: lift away. Left through the bottom: sink back to the start pose.
          el.classList.toggle('is-out-up', en.boundingClientRect.top < 0);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { rio.observe(el); });
  }

  function countUp(scope) {
    scope.querySelectorAll('[data-count]:not([data-counted])').forEach(function (n) {
      n.setAttribute('data-counted', '1');
      var end = +n.getAttribute('data-count'), from = end > 1000 ? end - 80 : 0, t0 = null;
      function step(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - k, 3);
        n.textContent = Math.round(from + (end - from) * e);
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  // ---------- Hover tilt (mouse only) ----------
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add('tilting');
        el.style.transform = 'perspective(900px) rotateX(' + (-y * 8).toFixed(2) + 'deg) rotateY(' + (x * 10).toFixed(2) + 'deg) translateY(-8px)';
      });
      el.addEventListener('pointerleave', function () { el.classList.remove('tilting'); el.style.transform = ''; });
    });
  }

  // ---------- Tracks rail: arrows, drag, gentle auto-scroll ----------
  document.querySelectorAll('[data-rail]').forEach(function (rail) {
    var track = rail.querySelector('[data-rail-track]');
    var prev = rail.querySelector('[data-rail-prev]'), next = rail.querySelector('[data-rail-next]');
    if (!track) return;
    function stepSize() { var c = track.querySelector('a'); return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 32) : 320; }
    function atEnd() { return track.scrollLeft + track.clientWidth >= track.scrollWidth - 8; }
    function update() { if (prev) prev.disabled = track.scrollLeft < 8; if (next) next.disabled = atEnd(); }
    var pausedUntil = 0;
    function pause() { pausedUntil = Date.now() + 8000; }
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -stepSize() }); pause(); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: stepSize() }); pause(); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    // Drag to scroll with a mouse (touch already swipes natively).
    var down = false, sx = 0, sl = 0, moved = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0; sx = e.clientX; sl = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 6) { track.classList.add('dragging'); track.scrollLeft = sl - dx; }
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (track.classList.contains('dragging')) {
        track.classList.remove('dragging');
        var s = stepSize(); track.scrollTo({ left: Math.round(track.scrollLeft / s) * s });
        pause();
      }
    });
    track.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); moved = 0; } }, true);

    // Auto-advance slowly while visible; stops while the visitor is using it.
    var hover = false, visible = false;
    rail.addEventListener('mouseenter', function () { hover = true; });
    rail.addEventListener('mouseleave', function () { hover = false; });
    track.addEventListener('touchstart', pause, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.5 }).observe(track);
    setInterval(function () {
      if (!visible || hover || down || document.hidden || Date.now() < pausedUntil) return;
      if (atEnd()) track.scrollTo({ left: 0 }); else track.scrollBy({ left: stepSize() });
    }, 4200);
  });

  // ---------- "Show more" for events and gallery ----------
  document.querySelectorAll('[data-more]').forEach(function (btn) {
    var group = btn.getAttribute('data-more');
    var list = document.querySelector('[data-more-list="' + group + '"]');
    if (!list) return;
    var items = list.querySelectorAll('[data-more-item]');
    var label = btn.querySelector('span');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = btn.getAttribute(open ? 'data-less-label' : 'data-more-label');
      items.forEach(function (el, k) {
        el.classList.toggle('more-hidden', !open);
        if (open) { el.style.setProperty('--d', (k % 4) * 80 + 'ms'); el.classList.remove('is-in', 'settled'); }
      });
      if (!open) list.scrollIntoView({ block: 'nearest' });
      send('click', 'more:' + group + (open ? ':open' : ':close'));
    });
  });

  // ---------- Magnetic buttons (mouse only) ----------
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (x * 0.18).toFixed(1) + 'px,' + (y * 0.28).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  // Signature for anyone who opens the console.
  try {
    console.log('%c ACM Sinai %c Designed & developed by Eng. Mohamed Amin \u2014 https://github.com/Mo1Amin ',
      'background:#1866AD;color:#fff;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:700',
      'background:#0b1220;color:#7dd3fc;padding:4px 8px;border-radius:0 4px 4px 0');
  } catch (e) {}

  // ---------- Particle sphere background (interactive) ----------
  function startSphere() {
    var THREE = window.THREE;
    var container = document.getElementById('canvas-container');
    if (!THREE || !container || container.firstChild) return;
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var small = window.innerWidth < 768;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !small, powerPreference: 'low-power' }); } catch (e) { return; }
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1 : 1.5));
    container.appendChild(renderer.domElement);

    var c = document.createElement('canvas'); c.width = 32; c.height = 32;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
    var dot = new THREE.CanvasTexture(c);

    var count = small ? 900 : 1500;
    var base = new Float32Array(count * 3), pos = new Float32Array(count * 3), push = new Float32Array(count);
    for (var i = 0; i < count * 3; i += 3) {
      var r = 7 + (Math.random() - 0.5), th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      base[i] = pos[i] = r * Math.sin(ph) * Math.cos(th);
      base[i + 1] = pos[i + 1] = r * Math.sin(ph) * Math.sin(th);
      base[i + 2] = pos[i + 2] = r * Math.cos(ph);
    }
    var sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var baseSize = small ? 0.15 : 0.12;
    var sMat = new THREE.PointsMaterial({ size: baseSize, map: dot, transparent: true, depthWrite: false });
    var sphere = new THREE.Points(sGeo, sMat); scene.add(sphere);

    var starCount = small ? 500 : 1000;
    var sp = new Float32Array(starCount * 3);
    for (var j = 0; j < starCount * 3; j++) sp[j] = (Math.random() - 0.5) * 80;
    var tGeo = new THREE.BufferGeometry(); tGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    var tMat = new THREE.PointsMaterial({ size: 0.15, map: dot, transparent: true, depthWrite: false });
    var stars = new THREE.Points(tGeo, tMat); scene.add(stars);
    camera.position.z = small ? 17 : 15;

    function applyTheme(dark) {
      if (dark) {
        sMat.blending = THREE.AdditiveBlending; sMat.color.setHex(0x00d4ff); sMat.opacity = 0.85;
        tMat.color.setHex(0xffffff); tMat.opacity = 0.3;
      } else {
        // Deeper blue on light backgrounds so the dots read against the pale page.
        sMat.blending = THREE.NormalBlending; sMat.color.setHex(0x1d5fb8); sMat.opacity = 0.7;
        tMat.color.setHex(0x3b6ea8); tMat.opacity = 0.35;
      }
      sMat.needsUpdate = true; tMat.needsUpdate = true;
    }
    applyTheme(root.classList.contains('dark'));
    onThemeChange.push(applyTheme);

    // Pointer: the sphere leans toward the cursor and the dots under it bulge outward.
    // A click on empty space sends a ripple; scrolling spins it.
    var mx = 0, my = 0, tx = 0, ty = 0, active = 0, pulse = 0, spin = 0, lastY = window.scrollY;
    function point(x, y) { mx = (x / window.innerWidth) * 2 - 1; my = -(y / window.innerHeight) * 2 + 1; active = 1; }
    document.addEventListener('pointermove', function (e) { point(e.clientX, e.clientY); }, { passive: true });
    document.addEventListener('touchmove', function (e) { if (e.touches[0]) point(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    document.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a,button,input,textarea,select,label,.glass-card')) return;
      pulse = 1; point(e.clientX, e.clientY);
    });
    window.addEventListener('scroll', function () { var y = window.scrollY; spin += (y - lastY) * 0.00012; lastY = y; }, { passive: true });

    var dir = new THREE.Vector3(), inv = new THREE.Quaternion();
    var clock = new THREE.Clock();
    var running = true;
    document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) { clock.getDelta(); requestAnimationFrame(loop); } });
    var speed = calm ? 0.5 : 1, rotY = 0;
    function loop() {
      if (!running) return;
      var dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
      tx += (mx - tx) * 0.06; ty += (my - ty) * 0.06;
      spin *= 0.94;
      rotY += 0.1 * speed * dt + spin;
      sphere.rotation.y = rotY + tx * 0.6;
      sphere.rotation.x = t * 0.02 * speed - ty * 0.45;
      stars.rotation.y = -t * 0.02 * speed + tx * 0.08;
      stars.rotation.x = ty * 0.05;
      active *= 0.99; pulse *= 0.93;

      // Cursor direction in the sphere's own space.
      dir.set(tx * 7, ty * 5, 6).normalize();
      inv.copy(sphere.quaternion).invert();
      dir.applyQuaternion(inv);
      var wave = calm ? 0.02 : 0.045;
      for (var k = 0, p = 0; k < count; k++, p += 3) {
        var bx = base[p], by = base[p + 1], bz = base[p + 2];
        var d = (bx * dir.x + by * dir.y + bz * dir.z) / 7;
        var target = d > 0.8 ? (d - 0.8) * 5 * active : 0;
        push[k] += (target - push[k]) * 0.12;
        var s = 1 + push[k] * 0.35 + Math.sin(t * 1.4 + by * 0.7 + bx * 0.3) * wave + pulse * 0.25 * (0.6 + 0.4 * Math.sin(k));
        pos[p] = bx * s; pos[p + 1] = by * s; pos[p + 2] = bz * s;
      }
      sGeo.attributes.position.needsUpdate = true;
      sMat.size = baseSize * (1 + pulse * 0.6);
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }
    loop();
    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  if (window.THREE) startSphere(); else window.addEventListener('load', startSphere);
})();
