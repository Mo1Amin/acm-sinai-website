const crypto = require('crypto');
const db = require('../db');
const config = require('../config');

const TYPES = new Set(['pageview', 'section', 'click']);

function isBot(ua) {
  return !ua || /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|wget|python|headless|lighthouse/i.test(ua);
}

function device(ua) {
  if (/iPad|Tablet|Nexus 7|Nexus 10|SM-T|Kindle|Silk/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Anonymous visitor id that changes every day. The IP address is never stored. */
function visitorHash(req) {
  const day = new Date().toISOString().slice(0, 10);
  const salt = crypto.createHmac('sha256', config.analyticsSalt).update(day).digest('hex');
  return crypto.createHash('sha256').update(`${salt}|${req.ip}|${req.get('user-agent') || ''}`).digest('hex');
}

async function record(req, { type, path, target, ref }) {
  const ua = String(req.get('user-agent') || '');
  if (!TYPES.has(type) || isBot(ua)) return false;
  const visitor = visitorHash(req);

  const recent = await db.value('SELECT COUNT(*) AS n FROM analytics_events WHERE visitor_hash = ? AND created_at > (NOW() - INTERVAL 10 MINUTE)', [visitor]);
  if (Number(recent) >= 120) return false;

  let referrerHost = null;
  if (ref) {
    try {
      const h = new URL(ref).hostname;
      const own = new URL(config.baseUrl).hostname;
      if (h && h.toLowerCase() !== own.toLowerCase() && h !== req.hostname) referrerHost = h.replace(/^(www|m|l|lm)\./i, '').slice(0, 120);
    } catch { /* ignore */ }
  }

  let cleanPath = '/';
  try { cleanPath = new URL(String(path || '/'), 'http://x').pathname.slice(0, 190); } catch { /* keep / */ }

  await db.insert('analytics_events', {
    type,
    path: cleanPath,
    target: target != null ? String(target).replace(/[^\w\-: .]/gu, '').slice(0, 120) : null,
    visitor_hash: visitor,
    referrer_host: referrerHost,
    device: device(ua),
  });

  if (Math.random() < 1 / 500) {
    const days = Math.max(30, Number((await db.value("SELECT `value` FROM settings WHERE `key` = 'analytics_retention_days'")) || 365));
    await db.run('DELETE FROM analytics_events WHERE created_at < (NOW() - INTERVAL ? DAY)', [days]);
  }
  return true;
}

function dayString(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function summary(days) {
  const since = `${dayString(days - 1)} 00:00:00`;
  const prevSince = `${dayString(2 * days - 1)} 00:00:00`;

  const totals = await db.one(
    `SELECT SUM(type = 'pageview') AS views, COUNT(DISTINCT CASE WHEN type = 'pageview' THEN visitor_hash END) AS visitors, SUM(type = 'click') AS clicks
       FROM analytics_events WHERE created_at >= ?`, [since]);
  const prev = await db.one(
    `SELECT SUM(type = 'pageview') AS views, COUNT(DISTINCT CASE WHEN type = 'pageview' THEN visitor_hash END) AS visitors
       FROM analytics_events WHERE created_at >= ? AND created_at < ?`, [prevSince, since]);

  const daily = await db.all(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, SUM(type = 'pageview') AS views, COUNT(DISTINCT CASE WHEN type = 'pageview' THEN visitor_hash END) AS visitors
       FROM analytics_events WHERE created_at >= ? GROUP BY d ORDER BY d`, [since]);
  const byDay = Object.fromEntries(daily.map((r) => [r.d, r]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = dayString(i);
    series.push({ d, views: Number(byDay[d]?.views || 0), visitors: Number(byDay[d]?.visitors || 0) });
  }

  const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  const heatRows = await db.all(
    `SELECT DAYOFWEEK(created_at) - 1 AS wd, HOUR(created_at) AS h, COUNT(*) AS n
       FROM analytics_events WHERE type = 'pageview' AND created_at >= ? GROUP BY wd, h`, [since]);
  for (const r of heatRows) heat[Number(r.wd)][Number(r.h)] = Number(r.n);

  const top = (sql) => db.all(sql, [since]).then((rows) => rows.map((r) => ({ label: r.label, n: Number(r.n) })));

  return {
    views: Number(totals?.views || 0),
    visitors: Number(totals?.visitors || 0),
    clicks: Number(totals?.clicks || 0),
    prevViews: Number(prev?.views || 0),
    prevVisitors: Number(prev?.visitors || 0),
    series,
    heat,
    sections: await top(`SELECT target AS label, COUNT(DISTINCT visitor_hash) AS n FROM analytics_events WHERE type = 'section' AND created_at >= ? GROUP BY target ORDER BY n DESC LIMIT 10`),
    clicksTop: await top(`SELECT target AS label, COUNT(*) AS n FROM analytics_events WHERE type = 'click' AND created_at >= ? GROUP BY target ORDER BY n DESC LIMIT 10`),
    pages: await top(`SELECT path AS label, COUNT(*) AS n FROM analytics_events WHERE type = 'pageview' AND created_at >= ? GROUP BY path ORDER BY n DESC LIMIT 10`),
    referrers: await top(`SELECT COALESCE(referrer_host, 'Direct / unknown') AS label, COUNT(*) AS n FROM analytics_events WHERE type = 'pageview' AND created_at >= ? GROUP BY referrer_host ORDER BY n DESC LIMIT 10`),
    devices: await top(`SELECT device AS label, COUNT(DISTINCT visitor_hash) AS n FROM analytics_events WHERE type = 'pageview' AND created_at >= ? GROUP BY device ORDER BY n DESC`),
    live: Number(await db.value('SELECT COUNT(DISTINCT visitor_hash) AS n FROM analytics_events WHERE created_at > (NOW() - INTERVAL 5 MINUTE)')),
  };
}

module.exports = { record, summary };
