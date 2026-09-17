// Creates (or resets) an owner account from the server terminal. Nothing is exposed on the web.
// Usage: npm run create-owner -- --email you@example.com --name "Your Name"
// The password is asked interactively (hidden) so it never lands in shell history.
process.env.TZ = 'Africa/Cairo';
const readline = require('readline');
const db = require('../db');
const { hashPassword, passwordProblem } = require('../lib/auth');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
}

function askHidden(question) {
  if (process.env.OWNER_PASSWORD) return Promise.resolve(process.env.OWNER_PASSWORD);
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

(async () => {
  const email = String(arg('email') || '').trim().toLowerCase();
  const name = String(arg('name') || '').trim();
  if (!email || !name) {
    console.error('Usage: npm run create-owner -- --email you@example.com --name "Your Name"');
    process.exit(1);
  }
  const pw = await askHidden('Password (min 12 chars, letters + numbers): ');
  const problem = passwordProblem(pw);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  const hash = await hashPassword(pw);
  const existing = await db.one('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    await db.run("UPDATE users SET name = ?, password_hash = ?, role = 'owner', is_active = 1, failed_logins = 0, locked_until = NULL WHERE id = ?", [name, hash, existing.id]);
    console.log(`Updated ${email} as owner.`);
  } else {
    await db.insert('users', { name, email, password_hash: hash, role: 'owner' });
    console.log(`Created owner ${email}. Sign in at /admin and turn on two-step verification.`);
  }
  await db.insert('audit_log', { user_name: 'Terminal', action: 'create', entity: 'user', entity_id: email, summary: `Owner account set up for ${email} from the server terminal`, ip: '127.0.0.1' });
  await db.pool.end();
})();
