const crypto = require('crypto');
const argon2 = require('@node-rs/argon2');
const { authenticator } = require('otplib');
const db = require('../db');

authenticator.options = { window: 1, step: 30, digits: 6 };

const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_MAX_MS = 8 * 3600 * 1000;
const MAX_FAILS_PER_ACCOUNT = 5;
const LOCK_MINUTES = 15;
const MAX_FAILS_PER_IP = 20;

/** Role -> permissions. Owners (founders) can do everything, including managing admins. */
const ROLE_PERMISSIONS = {
  owner: ['*'],
  admin: ['dashboard', 'analytics', 'tracks', 'events', 'gallery', 'people', 'competitions', 'settings', 'logs'],
  editor: ['dashboard', 'events', 'gallery', 'competitions'],
};
const ROLE_LABELS = { owner: 'Owner (Founder)', admin: 'Admin', editor: 'Editor' };

// A real argon2 hash, used to keep response time similar for unknown emails.
let dummyHash = null;
argon2.hash(crypto.randomBytes(16).toString('hex')).then((h) => { dummyHash = h; });

function hashPassword(pw) {
  return argon2.hash(pw); // argon2id with library defaults
}

async function verifyPassword(hash, pw) {
  try {
    return await argon2.verify(hash, pw);
  } catch {
    return false;
  }
}

function passwordProblem(pw) {
  if (String(pw).length < 12) return 'Password must be at least 12 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain letters and numbers.';
  return null;
}

function can(user, permission) {
  if (!user) return false;
  const perms = ROLE_PERMISSIONS[user.role] || [];
  return perms.includes('*') || perms.includes(permission);
}

function uaHash(req) {
  return crypto.createHash('sha256').update(String(req.get('user-agent') || '')).digest('hex');
}

async function logAttempt(req, email, success, reason) {
  await db.insert('login_attempts', {
    email: String(email).slice(0, 190),
    ip: req.ip.slice(0, 45),
    success: success ? 1 : 0,
    reason: reason || null,
    user_agent: String(req.get('user-agent') || '').slice(0, 255),
  });
}

async function audit(req, action, entity, entityId, summary, user) {
  const u = user || req.user || null;
  await db.insert('audit_log', {
    user_id: u ? u.id : null,
    user_name: u ? u.name : null,
    action,
    entity,
    entity_id: entityId != null ? String(entityId) : null,
    summary: String(summary).slice(0, 500),
    ip: req.ip.slice(0, 45),
  });
}

function regenerate(req) {
  return new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
}

/** Step 1: email + password. Returns { ok, message, needs2fa }. */
async function login(req, emailIn, password) {
  const email = String(emailIn || '').trim().toLowerCase();
  const generic = 'Wrong email or password.';

  const ipFails = await db.value(
    'SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND success = 0 AND created_at > (NOW() - INTERVAL 15 MINUTE)',
    [req.ip]
  );
  if (Number(ipFails) >= MAX_FAILS_PER_IP) {
    await logAttempt(req, email, false, 'ip_throttled');
    return { ok: false, message: 'Too many failed attempts from your network. Try again in 15 minutes.' };
  }

  const user = await db.one('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    if (dummyHash) await verifyPassword(dummyHash, String(password));
    await logAttempt(req, email, false, 'unknown_user');
    return { ok: false, message: generic };
  }
  if (!user.is_active) {
    await logAttempt(req, email, false, 'disabled');
    return { ok: false, message: generic };
  }
  if (user.locked_until && new Date(user.locked_until.replace(' ', 'T')) > new Date()) {
    await logAttempt(req, email, false, 'locked');
    return { ok: false, message: 'This account is temporarily locked after several failed attempts. Try again later.' };
  }
  if (!(await verifyPassword(user.password_hash, String(password)))) {
    const fails = Number(user.failed_logins) + 1;
    const lock = fails >= MAX_FAILS_PER_ACCOUNT;
    await db.run(
      'UPDATE users SET failed_logins = ?, locked_until = IF(?, NOW() + INTERVAL ? MINUTE, NULL) WHERE id = ?',
      [lock ? 0 : fails, lock ? 1 : 0, LOCK_MINUTES, user.id]
    );
    await logAttempt(req, email, false, lock ? 'bad_password_locked' : 'bad_password');
    return { ok: false, message: generic };
  }

  await regenerate(req);
  req.session.uid = user.id;
  req.session.started = Date.now();
  req.session.lastSeen = Date.now();
  req.session.ua = uaHash(req);
  req.session.csrf = crypto.randomBytes(32).toString('hex');
  req.session.twofaPassed = !user.totp_enabled;
  req.session.twofaTries = 0;

  if (!user.totp_enabled) await completeLogin(req, user, 'password_only');
  return { ok: true, needs2fa: !!user.totp_enabled };
}

async function completeLogin(req, user, method) {
  await db.run('UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = ? WHERE id = ?', [req.ip, user.id]);
  await logAttempt(req, user.email, true, method);
  await audit(req, 'login', 'user', user.id, `Signed in (${method})`, user);
}

/** Step 2: TOTP or a one-time recovery code. Returns 'ok' | 'bad' | 'locked'. */
async function verifySecondFactor(req, code) {
  const user = req.session.uid ? await db.one('SELECT * FROM users WHERE id = ? AND is_active = 1', [req.session.uid]) : null;
  if (!user || !user.totp_enabled) return 'locked';

  req.session.twofaTries = (req.session.twofaTries || 0) + 1;
  if (req.session.twofaTries > 6) {
    await logAttempt(req, user.email, false, '2fa_too_many');
    return 'locked';
  }

  const clean = String(code || '').replace(/\s+/g, '');
  let method = null;
  if (/^\d{6}$/.test(clean) && authenticator.check(clean, user.totp_secret)) {
    method = 'totp';
  } else {
    const codes = JSON.parse(user.recovery_codes || '[]');
    for (let i = 0; i < codes.length; i++) {
      if (await verifyPassword(codes[i], clean.toUpperCase())) {
        codes.splice(i, 1);
        await db.run('UPDATE users SET recovery_codes = ? WHERE id = ?', [JSON.stringify(codes), user.id]);
        method = 'recovery_code';
        break;
      }
    }
  }
  if (!method) {
    await logAttempt(req, user.email, false, 'bad_2fa');
    return 'bad';
  }
  const uid = user.id;
  const csrf = req.session.csrf;
  await regenerate(req);
  Object.assign(req.session, { uid, started: Date.now(), lastSeen: Date.now(), ua: uaHash(req), csrf, twofaPassed: true });
  await completeLogin(req, user, method);
  return 'ok';
}

async function newRecoveryCodes() {
  const plain = [];
  const hashed = [];
  for (let i = 0; i < 8; i++) {
    const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `${hex.slice(0, 4)}-${hex.slice(4)}`;
    plain.push(code);
    hashed.push(await hashPassword(code));
  }
  return { plain, json: JSON.stringify(hashed) };
}

/** Loads req.user from the session and enforces idle/absolute timeouts and UA binding. */
function sessionUser() {
  return async (req, res, next) => {
    req.user = null;
    const s = req.session;
    if (s && s.uid) {
      const now = Date.now();
      const expired = now - (s.lastSeen || 0) > SESSION_IDLE_MS || now - (s.started || 0) > SESSION_MAX_MS || s.ua !== uaHash(req);
      if (expired) {
        await new Promise((r) => s.regenerate(r));
        req.session.flash = { type: 'warn', msg: 'Your session expired. Please sign in again.' };
      } else {
        s.lastSeen = now;
        if (s.twofaPassed) {
          req.user = await db.one('SELECT * FROM users WHERE id = ? AND is_active = 1', [s.uid]);
          if (!req.user) await new Promise((r) => s.regenerate(r));
        }
      }
    }
    res.locals.user = req.user;
    res.locals.can = (perm) => can(req.user, perm);
    next();
  };
}

function csrfToken(req) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(32).toString('hex');
  return req.session.csrf;
}

function csrfProtect() {
  return (req, res, next) => {
    res.locals.csrfToken = csrfToken(req);
    if (req.method === 'POST') {
      const sent = String((req.body && req.body._csrf) || req.get('x-csrf-token') || '');
      const expected = Buffer.from(req.session.csrf || '');
      const got = Buffer.from(sent);
      if (expected.length === 0 || expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) {
        return res.status(419).send('The form expired. Go back, refresh the page, and try again.');
      }
    }
    next();
  };
}

function requireUser(permission) {
  return (req, res, next) => {
    if (!req.user) {
      if (req.session.uid && !req.session.twofaPassed) return res.redirect('/admin/2fa');
      return res.redirect('/admin/login');
    }
    if (['owner', 'admin'].includes(req.user.role) && !req.user.totp_enabled && !req.path.startsWith('/account')) {
      req.session.flash = { type: 'warn', msg: 'Turn on two-step verification to protect the dashboard before continuing.' };
      return res.redirect('/admin/account#twofa');
    }
    if (permission && !can(req.user, permission)) {
      return res.status(403).render('admin/forbidden', { title: 'Not allowed' });
    }
    next();
  };
}

module.exports = {
  ROLE_LABELS, ROLE_PERMISSIONS, authenticator,
  hashPassword, verifyPassword, passwordProblem, can, login, verifySecondFactor, newRecoveryCodes,
  audit, sessionUser, csrfProtect, requireUser,
};
