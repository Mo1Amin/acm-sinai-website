const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

function required(name, devDefault) {
  const v = process.env[name];
  if (v && v !== 'change-me') return v;
  if (!isProd && devDefault !== undefined) return devDefault;
  throw new Error(`Missing required setting ${name} in .env`);
}

const root = path.join(__dirname, '..');

function assetVersion() {
  const hash = require('crypto').createHash('sha1');
  for (const f of ['public/assets/css/app.css', 'public/assets/js/site.js', 'public/assets/js/theme.js', 'public/assets/js/admin.js']) {
    try { hash.update(require('fs').readFileSync(require('path').join(__dirname, '..', f))); } catch (e) { /* not built yet */ }
  }
  return hash.digest('hex').slice(0, 10);
}

module.exports = {
  env,
  isProd,
  root,
  port: Number(process.env.PORT_LOCAL || 3000),
  baseUrl: (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    database: required('DB_NAME', 'acm_sinai'),
    user: required('DB_USER', 'acm'),
    password: required('DB_PASS', ''),
  },
  sessionSecret: required('SESSION_SECRET', 'dev-only-session-secret'),
  analyticsSalt: required('ANALYTICS_SALT', 'dev-only-analytics-salt'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(root, 'public', 'uploads'),
  // Changes whenever a built asset changes, so browsers never keep an old CSS/JS after a deploy.
  version: assetVersion(),
};
