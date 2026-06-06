require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('../pool');

async function runMigrations() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Migrations completed successfully');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
