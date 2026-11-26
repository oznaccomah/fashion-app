/**
 * db.js – pg Pool with one important trick:
 * pg parses DATE columns as JS Date objects by default, which silently shifts
 * dates by timezone offset. We override the type parser so DATE columns come
 * back as plain "YYYY-MM-DD" strings, which is what the front-end expects.
 */

import pg from 'pg';
import 'dotenv/config';

const { Pool, types } = pg;

// DATE type OID = 1082  → return the raw string, not a JS Date
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected pg pool error', err);
});

export default pool;

