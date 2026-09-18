// Runs in <head> before paint to avoid a light/dark flash.
(function () {
  // Scroll-reveal styles only apply once this class exists, so pages stay readable without JS.
  if ('IntersectionObserver' in window) document.documentElement.classList.add('js-motion');
  try {
    var saved = localStorage.getItem('theme');
    var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
  }
})();
