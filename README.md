# ACM Sinai Website

Website and admin dashboard of the Sinai University ACM Student Chapter, served at [su.acm.org](https://su.acm.org).

- **Stack:** Node.js 22, Express, EJS (server-rendered pages), MariaDB/MySQL, Tailwind CSS
- **Hosting:** cPanel "Setup Node.js App" (Phusion Passenger) on the chapter's A2 Hosting account
- **Dashboard:** `https://su.acm.org/admin`

## What the dashboard manages

| Area | Who | What |
|---|---|---|
| Overview | everyone | Key numbers, recent activity, security status |
| Analytics | owner, admin | Visitors, page views, clicks, busiest day/hour heatmap, sections reached, referrers, devices. Cookieless, no IPs stored |
| Tracks | owner, admin | Add, edit, reorder, hide, delete. Icon, skills, roadmap, mentor, registration status (open / soon / closed), join link. Each track has a page at `/tracks/<slug>` |
| Events | owner, admin, editor | Poster, date, location, registration and meeting links. Upcoming/past switches automatically |
| Gallery | owner, admin, editor | Albums, bulk photo upload (drag and drop), captions, cover, ordering |
| Team | owner, admin | High Board (founders), faculty sponsor, current board, advisory board |
| Site settings | owner, admin | Hero and about text, registration open/closed and link, contact and social links |
| Admins | owner | Create accounts, change roles, disable, reset two-step verification, unlock |
| Activity logs | owner, admin | Every change (who, what, when, IP) and every sign-in attempt |

## Security

- Passwords hashed with Argon2id; minimum 12 characters with letters and numbers.
- Two-step verification (TOTP apps) with one-time recovery codes. **Required for owners and admins.**
- Account lock after 5 wrong passwords (15 min) and per-network throttling; generic error messages.
- Sessions stored in the database, cookie limited to `/admin`, `HttpOnly`, `SameSite=Strict`, `Secure`; 30 min idle and 8 h absolute timeout; bound to the browser.
- CSRF token on every form; strict Content-Security-Policy and security headers (helmet); HTTPS enforced.
- Uploaded images are decoded and re-encoded to WebP with `sharp`; anything that is not a real image is rejected, and uploads are only ever served as static files.
- Only `http(s)` links are accepted in forms. All output is escaped.
- `/admin` is `noindex` and disallowed in `robots.txt`.

## Local development

```bash
cp .env.example .env        # fill in local database settings
npm install
npm run migrate             # creates tables and the initial content
npm run create-owner -- --email you@example.com --name "Your Name"
npm run build:css
npm run dev                 # http://localhost:3000
```

## Deploying on cPanel

### First time

1. **Database** — cPanel → *Manage My Databases*: create a database and a user, give the user *All privileges* on it.
2. **Code** — cPanel → *Terminal*:
   ```bash
   cd ~ && git clone https://github.com/Mo1Amin/acm-sinai-website.git
   ```
   (private repo: use a GitHub fine-grained token with read access when git asks for a password, or add a deploy key).
3. **Node app** — cPanel → *Setup Node.js App* → *Create application*:
   - Node.js version: **22**
   - Application mode: **Production**
   - Application root: `acm-sinai-website`
   - Application URL: `su.acm.org`
   - Application startup file: `app.js`
   - Environment variables: none (they live in `.env`)
4. **Settings** — in the terminal, create `~/acm-sinai-website/.env` from `.env.example` and fill in the database and the two random secrets.
5. **Install and set up** — copy the "Enter to the virtual environment" command shown at the top of the Node.js app page, then:
   ```bash
   cd ~/acm-sinai-website
   npm ci --omit=dev && npm install --no-save --include=dev tailwindcss@3 && npm run build:css
   npm run migrate
   npm run create-owner -- --email you@example.com --name "Your Name"
   ```
   Restart the app from the Node.js app page. Sign in at `/admin` and turn on two-step verification.
6. **Keep it awake** — cPanel → *Cron Jobs*, every 5 minutes:
   ```
   curl -fsS https://su.acm.org/healthz > /dev/null 2>&1
   ```
7. Refresh the Facebook link preview with the [Sharing Debugger](https://developers.facebook.com/tools/debug/).

### Updates

Every push to `main` deploys automatically once these repository secrets exist (*Settings → Secrets and variables → Actions*): `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_KEY` (a private key whose public key is authorized in cPanel → *SSH Access*), and `NODEVENV` (the path in the "Enter to the virtual environment" command, for example `/home/suhosting/nodevenv/acm-sinai-website/22/bin/activate`).

Manual update from the cPanel terminal:

```bash
source /home/suhosting/nodevenv/acm-sinai-website/22/bin/activate
cd ~/acm-sinai-website && git pull && npm ci --omit=dev && npm install --no-save --include=dev tailwindcss@3 && npm run build:css && npm run migrate -- --no-seed
mkdir -p tmp && touch tmp/restart.txt
```

Uploaded images live in `public/uploads/` on the server and are never overwritten by a deploy. Back them up together with the database (cPanel → *Backup*).
