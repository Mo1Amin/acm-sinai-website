const db = require('../db');
const { asset, nowSql } = require('./helpers');

async function settings() {
  const rows = await db.all('SELECT `key`, `value` FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value == null ? '' : String(r.value)]));
}

function tracks() {
  return db.all('SELECT * FROM tracks WHERE is_visible = 1 ORDER BY sort_order, id');
}

function track(slug) {
  return db.one('SELECT * FROM tracks WHERE slug = ? AND is_visible = 1', [slug]);
}

async function events() {
  const rows = await db.all('SELECT * FROM events WHERE is_visible = 1 ORDER BY starts_at');
  const now = nowSql();
  return {
    upcoming: rows.filter((r) => r.starts_at >= now),
    // Pinned events lead the list; the rest newest first.
    past: rows.filter((r) => r.starts_at < now).reverse().sort((a, b) => (b.is_featured || 0) - (a.is_featured || 0)),
  };
}

async function albums() {
  const list = await db.all(
    `SELECT a.*, p.thumb AS cover_thumb, (SELECT COUNT(*) FROM photos x WHERE x.album_id = a.id) AS photo_count
       FROM albums a LEFT JOIN photos p ON p.id = a.cover_photo_id
      WHERE a.is_visible = 1 ORDER BY a.sort_order, a.id DESC`
  );
  const withPhotos = list.filter((a) => Number(a.photo_count) > 0);
  if (!withPhotos.length) return [];
  const ids = withPhotos.map((a) => a.id);
  const photos = await db.all(
    `SELECT id, album_id, file, thumb, caption FROM photos WHERE album_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort_order, id`,
    ids
  );
  for (const a of withPhotos) {
    a.photos = photos.filter((p) => p.album_id === a.id).map((p) => ({ src: asset(p.file), thumb: asset(p.thumb), caption: p.caption || '' }));
    a.cover = a.cover_thumb ? asset(a.cover_thumb) : a.photos[0].thumb;
  }
  return withPhotos;
}

/** Visible competitions, newest first, each with its winners ranked by place. */
async function competitions() {
  const list = await db.all('SELECT * FROM competitions WHERE is_visible = 1 ORDER BY held_on DESC, id DESC');
  if (!list.length) return [];
  const ids = list.map((c) => c.id);
  const winners = await db.all(
    `SELECT * FROM competition_winners WHERE competition_id IN (${ids.map(() => '?').join(',')}) ORDER BY place, id`,
    ids
  );
  for (const c of list) c.winners = winners.filter((w) => w.competition_id === c.id);
  return list.filter((c) => c.winners.length);
}

function people(grp) {
  return db.all('SELECT * FROM people WHERE grp = ? AND is_visible = 1 ORDER BY sort_order, id', [grp]);
}

module.exports = { settings, tracks, track, events, albums, people, competitions };
