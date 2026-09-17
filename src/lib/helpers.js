const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parses 'YYYY-MM-DD HH:MM:SS' (Cairo, from MySQL) into a Date. */
function parseDateTime(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}

function formatDate(s) {
  const d = parseDateTime(s);
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : '';
}

function formatDateTime(s) {
  const d = parseDateTime(s);
  if (!d) return '';
  return `${formatDate(s)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toLocalInput(s) {
  const d = parseDateTime(s);
  if (!d) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function nowSql() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function timeAgo(s) {
  const d = parseDateTime(s);
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} d ago`;
  return formatDate(s);
}

function asset(p) {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  return '/' + String(p).replace(/^\/+/, '');
}

function initials(name) {
  return String(name || '?')
    .replace(/^(Prof|Dr|Eng)\.\s*/i, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function lines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function slugify(s) {
  const out = String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return out || `item-${Math.random().toString(16).slice(2, 8)}`;
}

/** Only http(s) links are accepted from forms. Returns null for empty or invalid. */
function cleanUrl(u) {
  const v = String(u || '').trim();
  if (!v) return null;
  try {
    const url = new URL(v);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return v.slice(0, 500);
  } catch {
    return null;
  }
}

function str(v, max = 255) {
  return String(v ?? '').trim().slice(0, max);
}

function int(v, def = 0) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function trackStatus(status) {
  if (status === 'open') return { label: 'Registration open', key: 'open' };
  if (status === 'closed') return { label: 'Registration closed', key: 'closed' };
  return { label: 'Coming soon', key: 'soon' };
}

module.exports = {
  parseDateTime, formatDate, formatDateTime, toLocalInput, nowSql, timeAgo,
  asset, initials, lines, slugify, cleanUrl, str, int, trackStatus, esc,
};
