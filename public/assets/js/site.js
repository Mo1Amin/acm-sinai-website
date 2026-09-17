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
      var c = e.target.closest('.album-card'); if (c) open(+c.getAttribute('data-album'));
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

  // ---------- Particle sphere background ----------
  function startSphere() {
    var THREE = window.THREE;
    var container = document.getElementById('canvas-container');
    if (!THREE || !container) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count * 3; i += 3) {
      var r = 7 + (Math.random() - 0.5), th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i] = r * Math.sin(ph) * Math.cos(th); pos[i + 1] = r * Math.sin(ph) * Math.sin(th); pos[i + 2] = r * Math.cos(ph);
    }
    var sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var sMat = new THREE.PointsMaterial({ size: small ? 0.13 : 0.1, map: dot, transparent: true, depthWrite: false });
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
        // Softer on light backgrounds so it does not compete with the text.
        sMat.blending = THREE.NormalBlending; sMat.color.setHex(0x3b82f6); sMat.opacity = 0.35;
        tMat.color.setHex(0x64748b); tMat.opacity = 0.25;
      }
      sMat.needsUpdate = true; tMat.needsUpdate = true;
    }
    applyTheme(root.classList.contains('dark'));
    onThemeChange.push(applyTheme);

    var mx = 0, my = 0;
    document.addEventListener('mousemove', function (e) { mx = (e.clientX / window.innerWidth) * 2 - 1; my = -(e.clientY / window.innerHeight) * 2 + 1; }, { passive: true });
    var clock = new THREE.Clock();
    var running = true;
    document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) requestAnimationFrame(loop); });
    function loop() {
      if (!running) return;
      var t = clock.getElapsedTime();
      sphere.rotation.y = t * 0.1 + mx * 0.05; sphere.rotation.x = t * 0.02 + my * 0.05;
      stars.rotation.y = -t * 0.02;
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
