require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('../pool');

async function runSeeders() {
  const sql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Seeders completed successfully');
  } catch (err) {
    console.error('Seeder failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeders();
