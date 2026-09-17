const express = require('express');
const content = require('../lib/content');
const analytics = require('../lib/analytics');
const config = require('../config');
const { lines } = require('../lib/helpers');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(wrap(async (req, res, next) => {
  res.locals.settings = await content.settings();
  res.locals.canonicalBase = config.baseUrl;
  next();
}));

router.get('/', wrap(async (req, res) => {
  const [tracks, events, albums, founders, sponsors, board] = await Promise.all([
    content.tracks(), content.events(), content.albums(),
    content.people('founder'), content.people('sponsor'), content.people('board'),
  ]);
  res.render('site/home', { pageTitle: res.locals.settings.site_title, canonicalPath: '/', isHome: true, tracks, events, albums, founders, sponsors, board });
}));

// Old query-string link keeps working.
router.get('/track.php', (req, res) => res.redirect(301, `/tracks/${encodeURIComponent(String(req.query.slug || ''))}`));

router.get('/tracks/:slug', wrap(async (req, res, next) => {
  const slug = String(req.params.slug).replace(/[^a-z0-9-]/g, '');
  const track = slug ? await content.track(slug) : null;
  if (!track) return next();
  const others = (await content.tracks()).filter((t) => t.id !== track.id);
  res.render('site/track', {
    pageTitle: `${track.name} Track · ACM Sinai`,
    pageDescription: track.short_desc || track.description,
    canonicalPath: `/tracks/${track.slug}`,
    track, skills: lines(track.skills), roadmap: lines(track.roadmap), others,
  });
}));

router.get('/sitemap.xml', wrap(async (req, res) => {
  const tracks = await content.tracks();
  const urls = ['/', ...tracks.map((t) => `/tracks/${t.slug}`)];
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${config.baseUrl}${u}</loc></url>`).join('')}</urlset>`
  );
}));

router.post('/api/collect', wrap(async (req, res) => {
  const origin = req.get('origin');
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (host !== req.hostname && host !== new URL(config.baseUrl).hostname) return res.status(403).end();
    } catch {
      return res.status(403).end();
    }
  }
  const b = req.body || {};
  try {
    await analytics.record(req, { type: String(b.type || ''), path: b.path, target: b.target, ref: b.ref });
  } catch (e) {
    console.error('[collect]', e.message);
  }
  res.status(204).end();
}));

module.exports = router;
