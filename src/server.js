const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const rateLimit = require('express-rate-limit');

const config = require('./config');
const db = require('./db');
const helpers = require('./lib/helpers');
const { sessionUser, csrfProtect, ROLE_LABELS } = require('./lib/auth');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Behind LiteSpeed / Passenger: trust the first proxy so req.ip and secure cookies work.
  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(config.root, 'views'));

  Object.assign(app.locals, helpers, { ROLE_LABELS, version: config.version, baseUrl: config.baseUrl });

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
        ...(config.isProd ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    crossOriginEmbedderPolicy: false,
    strictTransportSecurity: config.isProd ? { maxAge: 31536000 } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.use(compression());

  // Force HTTPS in production. Only redirect when the proxy explicitly reports plain http,
  // so a proxy that omits the header cannot cause a redirect loop.
  if (config.isProd) {
    app.use((req, res, next) => {
      const proto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
      if (proto === 'http') return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
      if (!proto && req.get('x-forwarded-ssl') !== 'on' && !req.secure && process.env.ASSUME_HTTPS === '1') {
        req.headers['x-forwarded-proto'] = 'https';
      }
      next();
    });
  }

  // Static files. Uploads are served as plain files only (never executed).
  app.use('/assets', express.static(path.join(config.root, 'public', 'assets'), { maxAge: config.isProd ? '7d' : 0 }));
  app.use('/uploads', express.static(config.uploadsDir, { maxAge: '30d', index: false, dotfiles: 'deny' }));
  app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nSitemap: ${config.baseUrl}/sitemap.xml\n`));
  app.get('/favicon.ico', (req, res) => res.type('image/x-icon').set('Cache-Control', 'public, max-age=86400').sendFile(path.join(config.root, 'public', 'assets', 'img', 'favicon.ico')));
  app.get('/humans.txt', (req, res) => res.type('text/plain').send('/* TEAM */\nDesign and development: Eng. Mohamed Amin Abdelwahed Ahmed\nGitHub: https://github.com/Mo1Amin\nRole: Co-founder, Sinai University ACM Student Chapter\n\n/* SITE */\nStack: Node.js, Express, EJS, MariaDB, Tailwind CSS, three.js\n'));
  app.get('/healthz', (req, res) => res.type('text/plain').send('ok'));

  // Public site + analytics beacon
  const collectLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false });
  app.use('/api/collect', collectLimiter, express.json({ limit: '2kb' }));
  app.use(require('./routes/public'));

  // Admin dashboard: separate session cookie scoped to /admin.
  const store = new MySQLStore({ createDatabaseTable: true, clearExpired: true, checkExpirationInterval: 15 * 60 * 1000, expiration: 8 * 3600 * 1000 }, db.pool);
  const admin = express.Router();
  admin.use((req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.set('Cache-Control', 'no-store');
    next();
  });
  admin.use(session({
    name: 'acm_admin',
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    cookie: { path: '/admin', httpOnly: true, sameSite: 'strict', secure: config.isProd, maxAge: 30 * 60 * 1000 },
  }));
  admin.use(express.urlencoded({ extended: false, limit: '200kb' }));
  admin.use(sessionUser());
  admin.use((req, res, next) => {
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    res.locals.path = req.path;
    next();
  });
  // Multipart forms are parsed per route (multer) before CSRF is checked there.
  admin.use((req, res, next) => (req.is('multipart/form-data') ? next() : csrfProtect()(req, res, next)));
  admin.use(require('./routes/admin'));
  app.use('/admin', admin);

  app.use((req, res) => res.status(404).render('site/404', { pageTitle: 'Page not found · ACM Sinai', settings: res.locals.settings || {} }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}]`, err);
    if (res.headersSent) return;
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).send('Image is larger than 12 MB.');
    res.status(500).send(config.isProd ? 'Something went wrong. Please try again later.' : `<pre>${String(err.stack).replace(/</g, '&lt;')}</pre>`);
  });

  return app;
}

module.exports = { createApp };
