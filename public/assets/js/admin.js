(function () {
  'use strict';
  var root = document.documentElement;

  // Theme toggle
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
      if (window.__chart) window.__chart.update();
    });
  });

  // Mobile sidebar
  var sidebar = document.getElementById('admin-sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  var openBtn = document.getElementById('sidebar-open');
  function setSidebar(open) {
    if (!sidebar) return;
    sidebar.classList.toggle('-translate-x-full', !open);
    backdrop.classList.toggle('hidden', !open);
  }
  if (openBtn) openBtn.addEventListener('click', function () { setSidebar(true); });
  if (backdrop) backdrop.addEventListener('click', function () { setSidebar(false); });

  // Confirm destructive actions
  document.addEventListener('submit', function (e) {
    var msg = e.target.getAttribute('data-confirm');
    if (msg && !window.confirm(msg)) e.preventDefault();
  }, true);

  // Auto-submit selects
  document.querySelectorAll('select[data-autosubmit]').forEach(function (s) {
    s.addEventListener('change', function () { s.form.submit(); });
  });

  // Photo upload: show count, drag & drop, busy state
  document.querySelectorAll('form[data-upload]').forEach(function (form) {
    var input = form.querySelector('input[type=file]');
    var zone = form.querySelector('[data-dropzone]');
    var count = form.querySelector('[data-file-count]');
    var btn = form.querySelector('[data-upload-btn]');
    function update() { if (count) count.textContent = input.files.length ? input.files.length + ' photo(s) selected' : ''; }
    input.addEventListener('change', update);
    if (zone) {
      ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('bg-surface-2'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('bg-surface-2'); }); });
      zone.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) { input.files = e.dataTransfer.files; update(); } });
    }
    form.addEventListener('submit', function () { if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…'; } });
  });

  // Daily chart
  function drawChart() {
    var canvas = document.getElementById('chart-daily');
    if (!canvas || !window.Chart) return;
    var series = JSON.parse(canvas.getAttribute('data-series') || '[]');
    var styles = getComputedStyle(root);
    var brand = 'rgb(' + styles.getPropertyValue('--brand').trim().replace(/ /g, ',') + ')';
    var muted = 'rgb(' + styles.getPropertyValue('--ink-muted').trim().replace(/ /g, ',') + ')';
    window.__chart = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: series.map(function (p) { var d = new Date(p.d + 'T00:00:00'); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }),
        datasets: [
          { label: 'Visitors', data: series.map(function (p) { return p.visitors; }), borderColor: brand, backgroundColor: 'transparent', tension: 0.35, borderWidth: 2.5, pointRadius: 0 },
          { label: 'Page views', data: series.map(function (p) { return p.views; }), borderColor: muted, borderDash: [5, 4], backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, pointRadius: 0 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: muted, boxWidth: 12 } } },
        scales: { x: { ticks: { color: muted, maxTicksLimit: 8 }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: muted, precision: 0 }, grid: { color: 'rgba(127,127,127,.12)' } } },
      },
    });
  }
  if (window.Chart) drawChart(); else window.addEventListener('load', drawChart);
})();
