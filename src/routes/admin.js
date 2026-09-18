const express = require('express');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const auth = require('../lib/auth');
const analytics = require('../lib/analytics');
const { upload, storeImage, deleteUpload } = require('../lib/uploads');
const { str, int, slugify, cleanUrl } = require('../lib/helpers');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const flash = (req, type, msg) => { req.session.flash = { type, msg }; };
const need = auth.requireUser;

/** Parses a multipart form, then checks CSRF (the token is inside the form body). */
function multipart(field, maxCount = 1) {
  const parse = maxCount > 1 ? upload.array(field, maxCount) : upload.single(field);
  return [parse, auth.csrfProtect()];
}

/** Swaps sort_order with the neighbour inside a scope. */
async function moveRow(table, id, dir, scopeSql = '1=1', scopeParams = []) {
  const rows = await db.all(`SELECT id FROM \`${table}\` WHERE ${scopeSql} ORDER BY sort_order, id`, scopeParams);
  const idx = rows.findIndex((r) => r.id === id);
  const swap = dir === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= rows.length) return;
  [rows[idx], rows[swap]] = [rows[swap], rows[idx]];
  for (let i = 0; i < rows.length; i++) await db.run(`UPDATE \`${table}\` SET sort_order = ? WHERE id = ?`, [i + 1, rows[i].id]);
}

// ---------------------------------------------------------------- auth
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: 'Too many attempts. Try again later.' });

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/admin');
  res.render('admin/login', { title: 'Sign in', error: null, email: '' });
});

router.post('/login', loginLimiter, wrap(async (req, res) => {
  const result = await auth.login(req, req.body.email, req.body.password);
  if (!result.ok) return res.status(401).render('admin/login', { title: 'Sign in', error: result.message, email: str(req.body.email, 190), csrfToken: req.session.csrf });
  res.redirect(result.needs2fa ? '/admin/2fa' : '/admin');
}));

router.get('/2fa', (req, res) => {
  if (!req.session.uid) return res.redirect('/admin/login');
  if (req.user) return res.redirect('/admin');
  res.render('admin/twofa', { title: 'Two-step verification', error: null });
});

router.post('/2fa', loginLimiter, wrap(async (req, res) => {
  if (!req.session.uid) return res.redirect('/admin/login');
  const r = await auth.verifySecondFactor(req, req.body.code);
  if (r === 'ok') return res.redirect('/admin');
  if (r === 'locked') {
    await new Promise((done) => req.session.regenerate(done));
    flash(req, 'warn', 'Too many wrong codes. Sign in again.');
    return res.redirect('/admin/login');
  }
  res.status(401).render('admin/twofa', { title: 'Two-step verification', error: 'That code is not valid. Check the time on your phone and try again.' });
}));

router.post('/logout', wrap(async (req, res) => {
  if (req.user) await auth.audit(req, 'logout', 'user', req.user.id, 'Signed out');
  await new Promise((done) => req.session.regenerate(done));
  flash(req, 'ok', 'You have signed out.');
  res.redirect('/admin/login');
}));

// ---------------------------------------------------------------- overview & analytics
router.get('/', need('dashboard'), wrap(async (req, res) => {
  const stats = auth.can(req.user, 'analytics') ? await analytics.summary(7) : null;
  const counts = {
    tracks: await db.value('SELECT COUNT(*) AS n FROM tracks'),
    openTracks: await db.value("SELECT COUNT(*) AS n FROM tracks WHERE status = 'open' AND is_visible = 1"),
    upcoming: await db.value('SELECT COUNT(*) AS n FROM events WHERE starts_at >= NOW() AND is_visible = 1'),
    photos: await db.value('SELECT COUNT(*) AS n FROM photos'),
    albums: await db.value('SELECT COUNT(*) AS n FROM albums'),
  };
  const activity = await db.all('SELECT * FROM audit_log ORDER BY id DESC LIMIT 8');
  const failed24h = auth.can(req.user, 'logs') ? await db.value('SELECT COUNT(*) AS n FROM login_attempts WHERE success = 0 AND created_at > (NOW() - INTERVAL 1 DAY)') : null;
  res.render('admin/dashboard', { title: 'Overview', stats, counts, activity, failed24h });
}));

router.get('/analytics', need('analytics'), wrap(async (req, res) => {
  const days = [7, 30, 90, 365].includes(int(req.query.days)) ? int(req.query.days) : 30;
  res.render('admin/analytics', { title: 'Analytics', stats: await analytics.summary(days), days });
}));

// ---------------------------------------------------------------- tracks
const TRACK_ICONS = ['fa-code', 'fa-globe', 'fa-mobile-screen', 'fa-brain', 'fa-shield-halved', 'fa-pen-ruler', 'fa-microchip', 'fa-cloud',
  'fa-database', 'fa-robot', 'fa-gamepad', 'fa-server', 'fa-network-wired', 'fa-cube', 'fa-chart-pie', 'fa-terminal',
  'fa-vr-cardboard', 'fa-link', 'fa-bug', 'fa-laptop-code', 'fa-diagram-project', 'fa-palette', 'fa-microscope', 'fa-rocket'];
const STATUSES = ['open', 'soon', 'closed'];

router.get('/tracks', need('tracks'), wrap(async (req, res) => {
  res.render('admin/tracks', { title: 'Tracks', tracks: await db.all('SELECT * FROM tracks ORDER BY sort_order, id') });
}));

router.post('/tracks/:id/action', need('tracks'), wrap(async (req, res) => {
  const id = int(req.params.id);
  const t = await db.one('SELECT * FROM tracks WHERE id = ?', [id]);
  const action = str(req.body.action, 20);
  if (t) {
    if (action === 'up' || action === 'down') {
      await moveRow('tracks', id, action);
      await auth.audit(req, 'reorder', 'track', id, `Moved track "${t.name}" ${action}`);
    } else if (action === 'toggle') {
      await db.run('UPDATE tracks SET is_visible = 1 - is_visible WHERE id = ?', [id]);
      await auth.audit(req, 'update', 'track', id, `${t.is_visible ? 'Hid' : 'Showed'} track "${t.name}"`);
    } else if (action === 'status' && STATUSES.includes(req.body.status)) {
      await db.run('UPDATE tracks SET status = ? WHERE id = ?', [req.body.status, id]);
      await auth.audit(req, 'update', 'track', id, `Set "${t.name}" registration to ${req.body.status}`);
    } else if (action === 'delete') {
      await db.run('DELETE FROM tracks WHERE id = ?', [id]);
      await deleteUpload(t.mentor_photo);
      await auth.audit(req, 'delete', 'track', id, `Deleted track "${t.name}"`);
      flash(req, 'ok', 'Track deleted.');
    }
  }
  res.redirect('/admin/tracks');
}));

async function trackForm(req, res) {
  const id = int(req.params.id);
  const track = id ? await db.one('SELECT * FROM tracks WHERE id = ?', [id]) : null;
  if (id && !track) { flash(req, 'error', 'Track not found.'); return res.redirect('/admin/tracks'); }
  res.render('admin/track-form', { title: track ? 'Edit track' : 'New track', track: track || {}, errors: [], icons: TRACK_ICONS });
}
router.get('/tracks/new', need('tracks'), wrap(trackForm));
router.get('/tracks/:id', need('tracks'), wrap(trackForm));

router.post(['/tracks/new', '/tracks/:id'], need('tracks'), ...multipart('mentor_photo'), wrap(async (req, res) => {
  const id = int(req.params.id);
  const existing = id ? await db.one('SELECT * FROM tracks WHERE id = ?', [id]) : null;
  const b = req.body;
  const data = {
    name: str(b.name, 120),
    slug: slugify(str(b.slug, 80) || str(b.name, 120)),
    icon: TRACK_ICONS.includes(b.icon) ? b.icon : 'fa-code',
    short_desc: str(b.short_desc, 200),
    description: str(b.description, 3000),
    skills: str(b.skills, 3000),
    roadmap: str(b.roadmap, 3000),
    mentor_name: str(b.mentor_name, 120) || null,
    mentor_title: str(b.mentor_title, 160) || null,
    status: STATUSES.includes(b.status) ? b.status : 'soon',
    join_url: cleanUrl(b.join_url),
    is_visible: b.is_visible ? 1 : 0,
  };
  const errors = [];
  if (!data.name) errors.push('Name is required.');
  if (str(b.join_url) && !data.join_url) errors.push('Join link must start with http:// or https://');
  if (await db.value('SELECT id FROM tracks WHERE slug = ? AND id <> ?', [data.slug, id || 0])) errors.push('Another track already uses this URL name.');
  if (!errors.length && req.file) {
    try {
      data.mentor_photo = (await storeImage(req.file, 'mentors', { maxSide: 480, thumbSide: null, square: true })).file;
    } catch (e) { errors.push(e.message); }
  }
  if (errors.length) {
    return res.status(422).render('admin/track-form', { title: existing ? 'Edit track' : 'New track', track: { ...(existing || {}), ...data }, errors, icons: TRACK_ICONS });
  }
  if (existing && (data.mentor_photo || b.remove_mentor_photo)) {
    await deleteUpload(existing.mentor_photo);
    if (!data.mentor_photo) data.mentor_photo = null;
  }
  if (existing) {
    await db.update('tracks', data, id);
    await auth.audit(req, 'update', 'track', id, `Edited track "${data.name}"`);
  } else {
    data.sort_order = Number(await db.value('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM tracks'));
    const newId = await db.insert('tracks', data);
    await auth.audit(req, 'create', 'track', newId, `Added track "${data.name}"`);
  }
  flash(req, 'ok', 'Track saved.');
  res.redirect('/admin/tracks');
}));

// ---------------------------------------------------------------- events
router.get('/events', need('events'), wrap(async (req, res) => {
  res.render('admin/events', { title: 'Events', events: await db.all('SELECT * FROM events ORDER BY starts_at DESC') });
}));

async function eventForm(req, res) {
  const id = int(req.params.id);
  const event = id ? await db.one('SELECT * FROM events WHERE id = ?', [id]) : null;
  if (id && !event) { flash(req, 'error', 'Event not found.'); return res.redirect('/admin/events'); }
  res.render('admin/event-form', { title: event ? 'Edit event' : 'New event', event: event || {}, errors: [] });
}
router.get('/events/new', need('events'), wrap(eventForm));
router.get('/events/:id', need('events'), wrap(eventForm));

router.post('/events/:id/delete', need('events'), wrap(async (req, res) => {
  const ev = await db.one('SELECT * FROM events WHERE id = ?', [int(req.params.id)]);
  if (ev) {
    await db.run('DELETE FROM events WHERE id = ?', [ev.id]);
    await deleteUpload(ev.image);
    await auth.audit(req, 'delete', 'event', ev.id, `Deleted event "${ev.title}"`);
    flash(req, 'ok', 'Event deleted.');
  }
  res.redirect('/admin/events');
}));

router.post(['/events/new', '/events/:id'], need('events'), ...multipart('image'), wrap(async (req, res) => {
  const id = int(req.params.id);
  const existing = id ? await db.one('SELECT * FROM events WHERE id = ?', [id]) : null;
  const b = req.body;
  const startsAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(b.starts_at || '')) ? `${b.starts_at.replace('T', ' ')}:00` : null;
  const data = {
    title: str(b.title, 200),
    description: str(b.description, 3000),
    starts_at: startsAt,
    location: str(b.location, 200) || null,
    register_url: cleanUrl(b.register_url),
    meeting_url: cleanUrl(b.meeting_url),
    is_visible: b.is_visible ? 1 : 0,
    is_featured: b.is_featured ? 1 : 0,
  };
  const errors = [];
  if (!data.title) errors.push('Title is required.');
  if (!data.starts_at) errors.push('Date and time are required.');
  if (str(b.register_url) && !data.register_url) errors.push('Registration link must start with https://');
  if (str(b.meeting_url) && !data.meeting_url) errors.push('Meeting link must start with https://');
  if (!errors.length && req.file) {
    try { data.image = (await storeImage(req.file, 'events', { maxSide: 1200, thumbSide: null })).file; } catch (e) { errors.push(e.message); }
  }
  if (errors.length) return res.status(422).render('admin/event-form', { title: existing ? 'Edit event' : 'New event', event: { ...(existing || {}), ...data, starts_at: data.starts_at || '' }, errors });
  if (existing && data.image) await deleteUpload(existing.image);
  if (existing) {
    await db.update('events', data, id);
    await auth.audit(req, 'update', 'event', id, `Edited event "${data.title}"`);
  } else {
    const newId = await db.insert('events', data);
    await auth.audit(req, 'create', 'event', newId, `Added event "${data.title}"`);
  }
  flash(req, 'ok', 'Event saved.');
  res.redirect('/admin/events');
}));

// ---------------------------------------------------------------- gallery
router.get('/gallery', need('gallery'), wrap(async (req, res) => {
  const albums = await db.all(`SELECT a.*, p.thumb AS cover_thumb, (SELECT COUNT(*) FROM photos x WHERE x.album_id = a.id) AS photo_count
                                 FROM albums a LEFT JOIN photos p ON p.id = a.cover_photo_id ORDER BY a.sort_order, a.id DESC`);
  res.render('admin/gallery', { title: 'Gallery', albums });
}));

router.post('/gallery', need('gallery'), wrap(async (req, res) => {
  const title = str(req.body.title, 200);
  if (!title) { flash(req, 'error', 'Album title is required.'); return res.redirect('/admin/gallery'); }
  const sort = Number(await db.value('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM albums'));
  const id = await db.insert('albums', { title, date_label: str(req.body.date_label, 80) || null, sort_order: sort });
  await auth.audit(req, 'create', 'album', id, `Created album "${title}"`);
  flash(req, 'ok', 'Album created. Now add photos.');
  res.redirect(`/admin/gallery/${id}`);
}));

router.get('/gallery/:id', need('gallery'), wrap(async (req, res) => {
  const album = await db.one('SELECT * FROM albums WHERE id = ?', [int(req.params.id)]);
  if (!album) { flash(req, 'error', 'Album not found.'); return res.redirect('/admin/gallery'); }
  const photos = await db.all('SELECT * FROM photos WHERE album_id = ? ORDER BY sort_order, id', [album.id]);
  res.render('admin/album', { title: album.title, album, photos });
}));

router.post('/gallery/:id/details', need('gallery'), wrap(async (req, res) => {
  const album = await db.one('SELECT * FROM albums WHERE id = ?', [int(req.params.id)]);
  if (album) {
    const title = str(req.body.title, 200) || album.title;
    await db.update('albums', { title, date_label: str(req.body.date_label, 80) || null, description: str(req.body.description, 1000) || null, is_visible: req.body.is_visible ? 1 : 0 }, album.id);
    await auth.audit(req, 'update', 'album', album.id, `Edited album "${title}"`);
    flash(req, 'ok', 'Album saved.');
  }
  res.redirect(`/admin/gallery/${int(req.params.id)}`);
}));

router.post('/gallery/:id/photos', need('gallery'), ...multipart('photos', 40), wrap(async (req, res) => {
  const album = await db.one('SELECT * FROM albums WHERE id = ?', [int(req.params.id)]);
  if (!album) return res.redirect('/admin/gallery');
  const files = req.files || [];
  let sort = Number(await db.value('SELECT COALESCE(MAX(sort_order), 0) AS n FROM photos WHERE album_id = ?', [album.id]));
  let added = 0;
  const failed = [];
  for (const f of files) {
    try {
      const img = await storeImage(f, `gallery/${album.id}`);
      const pid = await db.insert('photos', { album_id: album.id, file: img.file, thumb: img.thumb, width: img.width, height: img.height, sort_order: ++sort });
      if (!album.cover_photo_id && added === 0) await db.run('UPDATE albums SET cover_photo_id = ? WHERE id = ?', [pid, album.id]);
      added++;
    } catch (e) {
      failed.push(`${f.originalname}: ${e.message}`);
    }
  }
  if (added) await auth.audit(req, 'create', 'photo', album.id, `Added ${added} photo(s) to "${album.title}"`);
  flash(req, failed.length ? 'warn' : 'ok', added ? `${added} photo(s) added.${failed.length ? ` Skipped: ${failed.join('; ')}` : ''}` : 'No valid images were uploaded. Use JPG, PNG, WebP or GIF up to 12 MB.');
  res.redirect(`/admin/gallery/${album.id}`);
}));

router.post('/gallery/:id/photo/:pid', need('gallery'), wrap(async (req, res) => {
  const albumId = int(req.params.id);
  const photo = await db.one('SELECT * FROM photos WHERE id = ? AND album_id = ?', [int(req.params.pid), albumId]);
  const action = str(req.body.action, 20);
  if (photo) {
    if (action === 'caption') {
      await db.run('UPDATE photos SET caption = ? WHERE id = ?', [str(req.body.caption, 255) || null, photo.id]);
    } else if (action === 'cover') {
      await db.run('UPDATE albums SET cover_photo_id = ? WHERE id = ?', [photo.id, albumId]);
      await auth.audit(req, 'update', 'album', albumId, 'Changed album cover');
    } else if (action === 'up' || action === 'down') {
      await moveRow('photos', photo.id, action, 'album_id = ?', [albumId]);
    } else if (action === 'delete') {
      await db.run('DELETE FROM photos WHERE id = ?', [photo.id]);
      await db.run('UPDATE albums SET cover_photo_id = NULL WHERE id = ? AND cover_photo_id = ?', [albumId, photo.id]);
      await deleteUpload(photo.file);
      await deleteUpload(photo.thumb);
      await auth.audit(req, 'delete', 'photo', photo.id, 'Deleted a photo');
    }
  }
  res.redirect(`/admin/gallery/${albumId}#photo-${photo ? photo.id : ''}`);
}));

router.post('/gallery/:id/action', need('gallery'), wrap(async (req, res) => {
  const album = await db.one('SELECT * FROM albums WHERE id = ?', [int(req.params.id)]);
  const action = str(req.body.action, 20);
  if (album) {
    if (action === 'up' || action === 'down') {
      await moveRow('albums', album.id, action);
    } else if (action === 'toggle') {
      await db.run('UPDATE albums SET is_visible = 1 - is_visible WHERE id = ?', [album.id]);
      await auth.audit(req, 'update', 'album', album.id, `${album.is_visible ? 'Hid' : 'Showed'} album "${album.title}"`);
    } else if (action === 'delete') {
      const photos = await db.all('SELECT file, thumb FROM photos WHERE album_id = ?', [album.id]);
      await db.run('DELETE FROM albums WHERE id = ?', [album.id]);
      for (const p of photos) { await deleteUpload(p.file); await deleteUpload(p.thumb); }
      await auth.audit(req, 'delete', 'album', album.id, `Deleted album "${album.title}" (${photos.length} photos)`);
      flash(req, 'ok', 'Album deleted.');
    }
  }
  res.redirect('/admin/gallery');
}));

// ---------------------------------------------------------------- people (team)
const GROUPS = { founder: 'High Board (founders)', sponsor: 'Faculty sponsor', board: 'Current board', advisor: 'Advisory board' };

router.get('/people', need('people'), wrap(async (req, res) => {
  const people = await db.all("SELECT * FROM people ORDER BY FIELD(grp, 'founder', 'sponsor', 'board', 'advisor'), sort_order, id");
  res.render('admin/people', { title: 'Team', people, groups: GROUPS });
}));

async function personForm(req, res) {
  const id = int(req.params.id);
  const person = id ? await db.one('SELECT * FROM people WHERE id = ?', [id]) : null;
  if (id && !person) { flash(req, 'error', 'Person not found.'); return res.redirect('/admin/people'); }
  res.render('admin/person-form', { title: person ? 'Edit person' : 'Add person', person: person || { grp: req.query.grp || 'board', is_visible: 1 }, errors: [], groups: GROUPS });
}
router.get('/people/new', need('people'), wrap(personForm));
router.get('/people/:id', need('people'), wrap(personForm));

router.post('/people/:id/action', need('people'), wrap(async (req, res) => {
  const p = await db.one('SELECT * FROM people WHERE id = ?', [int(req.params.id)]);
  const action = str(req.body.action, 20);
  if (p) {
    if (action === 'up' || action === 'down') {
      await moveRow('people', p.id, action, 'grp = ?', [p.grp]);
    } else if (action === 'toggle') {
      await db.run('UPDATE people SET is_visible = 1 - is_visible WHERE id = ?', [p.id]);
      await auth.audit(req, 'update', 'person', p.id, `${p.is_visible ? 'Hid' : 'Showed'} ${p.name}`);
    } else if (action === 'delete') {
      await db.run('DELETE FROM people WHERE id = ?', [p.id]);
      await deleteUpload(p.photo);
      await auth.audit(req, 'delete', 'person', p.id, `Removed ${p.name} (${p.role})`);
      flash(req, 'ok', 'Removed from the team.');
    }
  }
  res.redirect('/admin/people');
}));

router.post(['/people/new', '/people/:id'], need('people'), ...multipart('photo'), wrap(async (req, res) => {
  const id = int(req.params.id);
  const existing = id ? await db.one('SELECT * FROM people WHERE id = ?', [id]) : null;
  const b = req.body;
  const data = {
    name: str(b.name, 120),
    role: str(b.role, 120),
    grp: Object.keys(GROUPS).includes(b.grp) ? b.grp : 'board',
    linkedin_url: cleanUrl(b.linkedin_url),
    is_visible: b.is_visible ? 1 : 0,
  };
  const errors = [];
  if (!data.name) errors.push('Name is required.');
  if (!data.role) errors.push('Role is required.');
  if (!errors.length && req.file) {
    try { data.photo = (await storeImage(req.file, 'team', { maxSide: 480, thumbSide: null, square: true })).file; } catch (e) { errors.push(e.message); }
  }
  if (errors.length) return res.status(422).render('admin/person-form', { title: existing ? 'Edit person' : 'Add person', person: { ...(existing || {}), ...data }, errors, groups: GROUPS });
  if (existing && (data.photo || b.remove_photo)) {
    await deleteUpload(existing.photo);
    if (!data.photo) data.photo = null;
  }
  if (existing) {
    await db.update('people', data, id);
    await auth.audit(req, 'update', 'person', id, `Edited ${data.name} (${data.role})`);
  } else {
    data.sort_order = Number(await db.value('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM people WHERE grp = ?', [data.grp]));
    const newId = await db.insert('people', data);
    await auth.audit(req, 'create', 'person', newId, `Added ${data.name} as ${data.role}`);
  }
  flash(req, 'ok', 'Saved.');
  res.redirect('/admin/people');
}));

// ---------------------------------------------------------------- settings
const SETTING_FIELDS = [
  ['hero_kicker', 'Hero small title', 120], ['hero_line1', 'Hero title line 1', 60], ['hero_line2', 'Hero title line 2 (highlighted)', 60],
  ['hero_text', 'Hero text', 400], ['about_text', 'About text', 1200],
  ['registration_url', 'Membership registration link', 500, 'url'], ['whatsapp_url', 'WhatsApp link', 500, 'url'],
  ['contact_email', 'Contact email', 190, 'email'],
  ['facebook_url', 'Facebook', 500, 'url'], ['instagram_url', 'Instagram', 500, 'url'], ['tiktok_url', 'TikTok', 500, 'url'], ['linkedin_url', 'LinkedIn', 500, 'url'],
  ['board_reveal_title', 'Teaser headline', 120], ['board_reveal_roles', 'Seats to tease (one per line)', 1000],
];

router.get('/settings', need('settings'), wrap(async (req, res) => {
  const rows = await db.all('SELECT `key`, `value` FROM settings');
  res.render('admin/settings', { title: 'Site settings', values: Object.fromEntries(rows.map((r) => [r.key, r.value || ''])), fields: SETTING_FIELDS, errors: [] });
}));

router.post('/settings', need('settings'), wrap(async (req, res) => {
  const errors = [];
  const values = {};
  for (const [key, label, max, type] of SETTING_FIELDS) {
    let v = str(req.body[key], max);
    if (type === 'url' && v) { const c = cleanUrl(v); if (!c) errors.push(`${label}: must start with https://`); v = c || v; }
    if (type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors.push(`${label}: not a valid email.`);
    values[key] = v;
  }
  values.registration_open = req.body.registration_open ? '1' : '0';
  values.board_reveal = req.body.board_reveal ? '1' : '0';
  values.board_reveal_date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.board_reveal_date || '')) ? req.body.board_reveal_date : '';
  values.analytics_retention_days = String(Math.min(730, Math.max(30, int(req.body.analytics_retention_days, 365))));
  if (errors.length) return res.status(422).render('admin/settings', { title: 'Site settings', values, fields: SETTING_FIELDS, errors });
  for (const [k, v] of Object.entries(values)) {
    await db.run('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [k, v]);
  }
  await auth.audit(req, 'update', 'settings', null, `Updated site settings (registration ${values.registration_open === '1' ? 'open' : 'closed'})`);
  flash(req, 'ok', 'Settings saved.');
  res.redirect('/admin/settings');
}));

// ---------------------------------------------------------------- admins (owners only)
router.get('/users', need('users'), wrap(async (req, res) => {
  res.render('admin/users', { title: 'Admins', users: await db.all('SELECT * FROM users ORDER BY FIELD(role, "owner", "admin", "editor"), name'), errors: [] });
}));

router.post('/users', need('users'), wrap(async (req, res) => {
  const b = req.body;
  const data = { name: str(b.name, 120), email: str(b.email, 190).toLowerCase(), role: ['owner', 'admin', 'editor'].includes(b.role) ? b.role : 'editor' };
  const errors = [];
  if (!data.name) errors.push('Name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('A valid email is required.');
  const pwProblem = auth.passwordProblem(String(b.password || ''));
  if (pwProblem) errors.push(pwProblem);
  if (await db.value('SELECT id FROM users WHERE email = ?', [data.email])) errors.push('This email already has an account.');
  if (errors.length) {
    return res.status(422).render('admin/users', { title: 'Admins', users: await db.all('SELECT * FROM users ORDER BY name'), errors, draft: data });
  }
  const id = await db.insert('users', { ...data, password_hash: await auth.hashPassword(String(b.password)) });
  await auth.audit(req, 'create', 'user', id, `Added ${data.role} ${data.email}`);
  flash(req, 'ok', `Account created. Share the temporary password privately; ${data.role === 'editor' ? 'they can' : 'they must'} turn on two-step verification after signing in.`);
  res.redirect('/admin/users');
}));

router.post('/users/:id/action', need('users'), wrap(async (req, res) => {
  const target = await db.one('SELECT * FROM users WHERE id = ?', [int(req.params.id)]);
  const action = str(req.body.action, 20);
  if (!target) return res.redirect('/admin/users');
  const owners = Number(await db.value("SELECT COUNT(*) AS n FROM users WHERE role = 'owner' AND is_active = 1"));
  const isLastOwner = target.role === 'owner' && target.is_active && owners <= 1;

  if (action === 'role' && ['owner', 'admin', 'editor'].includes(req.body.role)) {
    if (isLastOwner && req.body.role !== 'owner') flash(req, 'error', 'There must always be at least one active owner.');
    else {
      await db.run('UPDATE users SET role = ? WHERE id = ?', [req.body.role, target.id]);
      await auth.audit(req, 'update', 'user', target.id, `Changed ${target.email} role to ${req.body.role}`);
    }
  } else if (action === 'toggle') {
    if (target.id === req.user.id || (isLastOwner && target.is_active)) flash(req, 'error', 'You cannot disable yourself or the last owner.');
    else {
      await db.run('UPDATE users SET is_active = 1 - is_active WHERE id = ?', [target.id]);
      if (target.is_active) await db.run('DELETE FROM sessions WHERE data LIKE ?', [`%"uid":${target.id},%`]);
      await auth.audit(req, 'update', 'user', target.id, `${target.is_active ? 'Disabled' : 'Enabled'} ${target.email}`);
    }
  } else if (action === 'reset2fa') {
    await db.run('UPDATE users SET totp_enabled = 0, totp_secret = NULL, recovery_codes = NULL WHERE id = ?', [target.id]);
    await auth.audit(req, 'security', 'user', target.id, `Reset two-step verification for ${target.email}`);
    flash(req, 'ok', 'Two-step verification was reset. They will set it up again at next sign-in.');
  } else if (action === 'unlock') {
    await db.run('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?', [target.id]);
    await auth.audit(req, 'security', 'user', target.id, `Unlocked ${target.email}`);
  } else if (action === 'delete') {
    if (target.id === req.user.id || isLastOwner) flash(req, 'error', 'You cannot delete yourself or the last owner.');
    else {
      await db.run('DELETE FROM users WHERE id = ?', [target.id]);
      await db.run('DELETE FROM sessions WHERE data LIKE ?', [`%"uid":${target.id},%`]);
      await auth.audit(req, 'delete', 'user', target.id, `Deleted account ${target.email}`);
    }
  }
  res.redirect('/admin/users');
}));

// ---------------------------------------------------------------- logs
router.get('/logs', need('logs'), wrap(async (req, res) => {
  const tab = req.query.tab === 'logins' ? 'logins' : 'activity';
  const page = Math.max(1, int(req.query.page, 1));
  const per = 50;
  const offset = (page - 1) * per;
  let rows;
  let total;
  if (tab === 'logins') {
    const onlyFailed = req.query.failed === '1';
    const where = onlyFailed ? 'WHERE success = 0' : '';
    total = Number(await db.value(`SELECT COUNT(*) AS n FROM login_attempts ${where}`));
    rows = await db.all(`SELECT * FROM login_attempts ${where} ORDER BY id DESC LIMIT ${per} OFFSET ${offset}`);
  } else {
    const q = str(req.query.q, 100);
    const where = q ? 'WHERE summary LIKE ? OR user_name LIKE ? OR entity LIKE ?' : '';
    const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
    total = Number(await db.value(`SELECT COUNT(*) AS n FROM audit_log ${where}`, params));
    rows = await db.all(`SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT ${per} OFFSET ${offset}`, params);
  }
  res.render('admin/logs', { title: 'Activity logs', tab, rows, page, pages: Math.max(1, Math.ceil(total / per)), query: req.query });
}));

// ---------------------------------------------------------------- my account & security
router.get('/account', need(), wrap(async (req, res) => {
  let setup = null;
  if (!req.user.totp_enabled) {
    if (!req.session.pendingTotp) req.session.pendingTotp = auth.authenticator.generateSecret(20);
    const uri = auth.authenticator.keyuri(req.user.email, 'ACM Sinai Admin', req.session.pendingTotp);
    setup = { secret: req.session.pendingTotp, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) };
  }
  const recoveryLeft = JSON.parse(req.user.recovery_codes || '[]').length;
  const codes = req.session.freshRecoveryCodes || null;
  delete req.session.freshRecoveryCodes;
  const myLogins = await db.all('SELECT * FROM login_attempts WHERE email = ? ORDER BY id DESC LIMIT 10', [req.user.email]);
  res.render('admin/account', { title: 'Account & security', setup, recoveryLeft, codes, myLogins, errors: [] });
}));

router.post('/account/password', need(), wrap(async (req, res) => {
  const { current, next: nextPw, confirm } = req.body;
  if (!(await auth.verifyPassword(req.user.password_hash, String(current || '')))) flash(req, 'error', 'Your current password is wrong.');
  else if (nextPw !== confirm) flash(req, 'error', 'The new passwords do not match.');
  else if (auth.passwordProblem(String(nextPw || ''))) flash(req, 'error', auth.passwordProblem(String(nextPw || '')));
  else {
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [await auth.hashPassword(String(nextPw)), req.user.id]);
    // sign out other sessions of this user
    await db.run('DELETE FROM sessions WHERE session_id <> ? AND data LIKE ?', [req.sessionID, `%"uid":${req.user.id},%`]);
    await auth.audit(req, 'security', 'user', req.user.id, 'Changed password (other sessions signed out)');
    flash(req, 'ok', 'Password changed. Other devices were signed out.');
  }
  res.redirect('/admin/account');
}));

router.post('/account/2fa/enable', need(), wrap(async (req, res) => {
  const secret = req.session.pendingTotp;
  const code = String(req.body.code || '').replace(/\s+/g, '');
  if (!secret || !/^\d{6}$/.test(code) || !auth.authenticator.check(code, secret)) {
    flash(req, 'error', 'That code did not match. Scan the QR code again and enter the current 6-digit code.');
    return res.redirect('/admin/account#twofa');
  }
  const { plain, json } = await auth.newRecoveryCodes();
  await db.run('UPDATE users SET totp_secret = ?, totp_enabled = 1, recovery_codes = ? WHERE id = ?', [secret, json, req.user.id]);
  delete req.session.pendingTotp;
  req.session.freshRecoveryCodes = plain;
  await auth.audit(req, 'security', 'user', req.user.id, 'Turned on two-step verification');
  flash(req, 'ok', 'Two-step verification is on. Save your recovery codes now.');
  res.redirect('/admin/account#recovery');
}));

router.post('/account/2fa/recovery', need(), wrap(async (req, res) => {
  if (!req.user.totp_enabled) return res.redirect('/admin/account');
  const { plain, json } = await auth.newRecoveryCodes();
  await db.run('UPDATE users SET recovery_codes = ? WHERE id = ?', [json, req.user.id]);
  req.session.freshRecoveryCodes = plain;
  await auth.audit(req, 'security', 'user', req.user.id, 'Generated new recovery codes');
  res.redirect('/admin/account#recovery');
}));

router.post('/account/2fa/disable', need(), wrap(async (req, res) => {
  if (['owner', 'admin'].includes(req.user.role)) {
    flash(req, 'error', 'Owners and admins must keep two-step verification on. Ask an owner to reset it if you lost your phone.');
  } else if (!(await auth.verifyPassword(req.user.password_hash, String(req.body.password || '')))) {
    flash(req, 'error', 'Wrong password.');
  } else {
    await db.run('UPDATE users SET totp_enabled = 0, totp_secret = NULL, recovery_codes = NULL WHERE id = ?', [req.user.id]);
    await auth.audit(req, 'security', 'user', req.user.id, 'Turned off two-step verification');
    flash(req, 'ok', 'Two-step verification is off.');
  }
  res.redirect('/admin/account');
}));

module.exports = router;
