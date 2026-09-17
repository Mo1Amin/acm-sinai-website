const mysql = require('mysql2/promise');
const config = require('./config');

function cairoOffset() {
  const min = -new Date().getTimezoneOffset();
  const sign = min >= 0 ? '+' : '-';
  const abs = Math.abs(min);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

const pool = mysql.createPool({
  ...config.db,
  charset: 'utf8mb4',
  connectionLimit: 8,
  dateStrings: true, // DATETIME values come back as 'YYYY-MM-DD HH:MM:SS' in Cairo time
  multipleStatements: false,
});

// Keep MySQL NOW()/CURRENT_TIMESTAMP in the same zone as the app.
pool.on('connection', (conn) => {
  conn.query(`SET time_zone = '${cairoOffset()}'`);
});

async function all(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function one(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0] || null;
}

async function value(sql, params = []) {
  const row = await one(sql, params);
  return row ? Object.values(row)[0] : null;
}

async function run(sql, params = []) {
  const [res] = await pool.execute(sql, params);
  return res;
}

async function insert(table, data) {
  const cols = Object.keys(data);
  const sql = `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
  const res = await run(sql, cols.map((c) => data[c]));
  return res.insertId;
}

async function update(table, data, id) {
  const cols = Object.keys(data);
  const sql = `UPDATE \`${table}\` SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`;
  await run(sql, [...cols.map((c) => data[c]), id]);
}

module.exports = { pool, all, one, value, run, insert, update };
