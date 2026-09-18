// End-to-end check against a local server (not part of the deploy). Run: node test/e2e.local.js
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '..', '..', 'acm', 'node_modules', 'playwright-core'));
const { authenticator } = require('otplib');

const B = process.env.E2E_BASE || 'http://localhost:3187';
const EMAIL = 'owner@test.local';
const PASS = 'TestOwner-Pass-2026';
const shots = path.join(__dirname, '..', '..', 'e2e-shots');
fs.mkdirSync(shots, { recursive: true });
const img = path.join(__dirname, '..', 'public', 'uploads', 'seed', 'team', 'mohamed-amin.webp');

const results = [];
const check = (name, ok, extra = '') => { results.push([ok ? 'PASS' : 'FAIL', name, extra]); };

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g|cdnjs|jsdelivr|status of (401|403|419|422)/.test(m.text())) errors.push(m.text()); });

  // ---- public site
  await page.goto(B + '/', { waitUntil: 'networkidle' });
  check('home shows hero', await page.locator('h1:has-text("Future")').count() === 1);
  check('home lists 8 tracks', await page.locator('#tracks a[href^="/tracks/"]').count() === 8);
  check('sphere canvas rendered', await page.locator('#canvas-container canvas').count() === 1);
  check('tracks rail scrolls sideways', await page.evaluate(() => { const r = document.querySelector('[data-rail-track]'); return r.scrollWidth > r.clientWidth; }));
  check('favicon.ico served', (await page.request.get(B + '/favicon.ico')).headers()['content-type'] === 'image/x-icon');
  await page.screenshot({ path: path.join(shots, 'home-light.png') });
  check('past events: 4 shown, rest behind a button', await page.locator('#events article:visible').count() === 4 && await page.locator('[data-more=events]').count() === 1);
  await page.click('[data-more=events]');
  check('show more reveals every past event', await page.locator('#events article:visible').count() === 5);
  check('developer credit in footer', await page.locator('footer .dev-credit:has-text("Mohamed Amin")').count() === 1);
  await page.click('#gallery .album-tile >> nth=1');
  await page.waitForTimeout(400);
  check('lightbox opens', !(await page.locator('#lightbox').evaluate((el) => el.classList.contains('lb-hidden'))));
  await page.keyboard.press('Escape');
  await page.goto(B + '/tracks/cyber-security', { waitUntil: 'networkidle' });
  check('track page roadmap', await page.locator('.roadmap li').count() >= 3);

  // ---- admin: CSRF and brute force protections
  const bad = await page.request.post(B + '/admin/login', { form: { email: EMAIL, password: 'x' } });
  check('POST without CSRF token rejected', bad.status() === 419, String(bad.status()));

  await page.goto(B + '/admin/login');
  await page.fill('#email', EMAIL);
  await page.fill('#password', 'wrong-password-123');
  await page.click('button:has-text("Sign in")');
  check('wrong password shows generic error', await page.locator('text=Wrong email or password.').count() === 1);

  // ---- login -> forced 2FA setup
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASS);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/admin\/account/);
  check('owner without 2FA is forced to account page', page.url().includes('/admin/account'));
  const secret = (await page.locator('.select-all').first().textContent()).trim();
  await page.fill('input[name=code]', authenticator.generate(secret));
  await page.click('button:has-text("Turn on")');
  await page.waitForLoadState('networkidle');
  check('2FA enabled + recovery codes shown', await page.locator('#recovery .font-mono div').count() === 8);
  const recovery = (await page.locator('#recovery .font-mono div').first().textContent()).trim();

  // ---- sign out, sign in with TOTP
  await page.click('button:has-text("Sign out")');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASS);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/admin\/2fa/);
  await page.fill('input[name=code]', '000000');
  await page.click('button:has-text("Verify")');
  check('wrong 2FA code rejected', await page.locator('text=That code is not valid').count() === 1);
  await page.fill('input[name=code]', recovery);
  await page.click('button:has-text("Verify")');
  await page.waitForURL(B + '/admin');
  check('recovery code signs in', page.url() === B + '/admin');
  await page.screenshot({ path: path.join(shots, 'admin-overview.png') });

  // ---- tracks: create with mentor photo, open registration
  await page.goto(B + '/admin/tracks/new');
  await page.fill('#name', 'Game Development');
  await page.fill('#short_desc', 'Unity, game design and publishing.');
  await page.fill('#skills', 'Unity & C#\nGame design\nPhysics\nPublishing');
  await page.fill('#roadmap', 'C# basics\nUnity editor\nFirst 2D game\nFirst 3D game');
  await page.selectOption('#status', 'open');
  await page.fill('#join_url', 'https://forms.gle/example');
  await page.fill('#mentor_name', 'Test Mentor');
  await page.setInputFiles('#mentor_photo', img);
  await page.check('input[value="fa-gamepad"]', { force: true });
  await page.click('button:has-text("Save track")');
  await page.waitForURL(/\/admin\/tracks$/);
  check('track created', await page.locator('text=Game Development').count() >= 1);
  const pub = await page.request.get(B + '/tracks/game-development');
  const pubHtml = await pub.text();
  check('new track page public + join button', pub.status() === 200 && pubHtml.includes('Join now') && pubHtml.includes('/uploads/mentors/'));

  // invalid join link
  await page.goto(B + '/admin/tracks/new');
  await page.fill('#name', 'Bad Link');
  await page.fill('#join_url', 'javascript:alert(1)');
  await page.evaluate(() => { document.querySelector('#join_url').type = 'text'; });
  await page.click('button:has-text("Save track")');
  check('javascript: link refused', await page.locator('text=Join link must start with').count() === 1);

  // ---- events: upcoming event
  await page.goto(B + '/admin/events/new');
  await page.fill('#title', 'Orientation Day 2026');
  const d = new Date(Date.now() + 5 * 86400000);
  const p = (n) => String(n).padStart(2, '0');
  await page.fill('#starts_at', `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T18:00`);
  await page.fill('#location', 'Arish campus');
  await page.fill('#register_url', 'https://forms.gle/orientation');
  await page.setInputFiles('#image', img);
  await page.click('button:has-text("Save event")');
  await page.waitForURL(/\/admin\/events$/);
  const home = await (await page.request.get(B + '/')).text();
  check('upcoming event on home', home.includes('Upcoming Events') && home.includes('Orientation Day 2026'));

  // ---- gallery: album + multi upload + fake image rejected
  await page.goto(B + '/admin/gallery');
  await page.fill('#title', 'Orientation Day');
  await page.click('button:has-text("Create album")');
  await page.waitForURL(/\/admin\/gallery\/\d+/);
  const fake = path.join(shots, 'fake.jpg');
  fs.writeFileSync(fake, '<?php echo "hack"; ?>');
  await page.setInputFiles('#photos', [img, img, fake]);
  await page.click('button[data-upload-btn]');
  await page.waitForLoadState('networkidle');
  check('2 photos uploaded, fake skipped', await page.locator('[id^=photo-]').count() === 2, await page.locator('[role=status]').first().textContent().catch(() => ''));

  // ---- people: add board member
  await page.goto(B + '/admin/people/new?grp=board');
  await page.fill('#name', 'New Chair');
  await page.fill('#role', 'Chair');
  await page.click('button:has-text("Save")');
  await page.waitForURL(/\/admin\/people$/);
  const teaserHome = await (await page.request.get(B + '/')).text();
  check('new board hidden while teaser is on', !teaserHome.includes('New Chair') && (teaserHome.match(/mystery-card/g) || []).length === 8);

  // ---- settings: open registration
  await page.goto(B + '/admin/settings');
  await page.check('input[name=registration_open]');
  await page.uncheck('input[name=board_reveal]');
  await page.click('button:has-text("Save settings")');
  await page.waitForLoadState('networkidle');
  const openHome = await (await page.request.get(B + '/')).text();
  check('registration opened on home', openHome.includes('data-click="join-register"'));
  check('board shown after teaser off', openHome.includes('New Chair') && !openHome.includes('mystery-card'));

  // ---- users: add editor, editor permissions
  await page.goto(B + '/admin/users');
  await page.fill('#u-name', 'Editor Person');
  await page.fill('#u-email', 'editor@test.local');
  await page.selectOption('#u-role', 'editor');
  await page.fill('#u-password', 'EditorPass-2026-x');
  await page.click('button:has-text("Create account")');
  await page.waitForLoadState('networkidle');
  check('editor created', await page.locator('text=editor@test.local').count() === 1);

  // ---- analytics & logs pages render
  await page.goto(B + '/admin/analytics?days=7');
  check('analytics renders', await page.locator('text=When people visit').count() === 1);
  await page.screenshot({ path: path.join(shots, 'admin-analytics.png'), fullPage: true });
  await page.goto(B + '/admin/logs');
  check('audit log has entries', await page.locator('tbody tr').count() >= 5);
  await page.goto(B + '/admin/logs?tab=logins');
  check('login attempts logged', await page.locator('text=Wrong password').count() >= 1);

  // ---- editor limited
  const ed = await browser.newContext();
  const ep = await ed.newPage();
  await ep.goto(B + '/admin/login');
  await ep.fill('#email', 'editor@test.local');
  await ep.fill('#password', 'EditorPass-2026-x');
  await ep.click('button:has-text("Sign in")');
  await ep.waitForURL(B + '/admin');
  await ep.goto(B + '/admin/users');
  check('editor blocked from admins page', await ep.locator('text=You don\'t have access').count() === 1);
  await ep.goto(B + '/admin/tracks');
  check('editor blocked from tracks', await ep.locator('text=You don\'t have access').count() === 1);
  await ed.close();

  // ---- lockout after 5 wrong passwords
  const lc = await browser.newContext();
  const lp = await lc.newPage();
  for (let i = 0; i < 5; i++) {
    await lp.goto(B + '/admin/login');
    await lp.fill('#email', 'editor@test.local');
    await lp.fill('#password', 'nope-nope-1234');
    await lp.click('button:has-text("Sign in")');
  }
  await lp.goto(B + '/admin/login');
  await lp.fill('#email', 'editor@test.local');
  await lp.fill('#password', 'EditorPass-2026-x');
  await lp.click('button:has-text("Sign in")');
  check('account locks after 5 failures', await lp.locator('text=temporarily locked').count() === 1);
  await lc.close();

  // ---- phone layout
  const mob = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const mp = await mob.newPage();
  await mp.goto(B + '/', { waitUntil: 'networkidle' });
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('home: no horizontal scroll on phone', !overflow);
  check('sphere also on phone', await mp.locator('#canvas-container canvas').count() === 1);
  await mp.screenshot({ path: path.join(shots, 'home-phone.png') });
  await mp.evaluate(() => { localStorage.setItem('theme', 'dark'); });
  await mp.reload({ waitUntil: 'networkidle' });
  await mp.screenshot({ path: path.join(shots, 'home-phone-dark.png') });
  await mob.close();

  check('no page JS errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  for (const r of results) console.log(r.join('  '));
  console.log(`${results.filter((r) => r[0] === 'PASS').length}/${results.length} passed`);
})().catch((e) => { console.error(e); process.exit(1); });
