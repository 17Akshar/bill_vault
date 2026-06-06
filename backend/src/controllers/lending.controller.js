const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const { lending: lendingV } = require('../validations/common.validation');

const list = asyncWrapper(async (req, res) => {
  const { type, status } = req.query;
  let query = 'SELECT * FROM lending WHERE user_id = $1';
  const params = [req.user.id];
  let i = 2;

  if (type) { query += ` AND type = $${i++}`; params.push(type); }
  if (status && status !== 'all') { query += ` AND status = $${i++}`; params.push(status); }
  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return success(res, result.rows);
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM lending WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Entry not found');

  const txRes = await pool.query(
    'SELECT * FROM lending_transactions WHERE lending_id = $1 ORDER BY date DESC',
    [req.params.id]
  );
  return success(res, { ...result.rows[0], transactions: txRes.rows });
});

const create = asyncWrapper(async (req, res) => {
  const { error, value } = lendingV.validate(req.body, { stripUnknown: true });
  if (error) throw ApiError.badRequest(error.details[0].message);

  const result = await pool.query(
    `INSERT INTO lending
      (user_id, type, person_name, person_phone, amount, remaining, interest_rate, date, due_date, notes, account_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [req.user.id, value.type, value.person_name, value.person_phone, value.amount,
     value.remaining, value.interest_rate, value.date, value.due_date, value.notes, value.account_id]
  );
  return created(res, result.rows[0]);
});

const update = asyncWrapper(async (req, res) => {
  const existing = await pool.query(
    'SELECT id FROM lending WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Entry not found');

  const LENDING_UPDATABLE = new Set(['type','person_name','person_phone','amount','remaining','interest_rate','date','due_date','notes','account_id','status']);
  const fields = [];
  const params = [];
  let i = 1;
  for (const [key, val] of Object.entries(req.body)) {
    if (LENDING_UPDATABLE.has(key) && val !== undefined) { fields.push(`${key} = $${i++}`); params.push(val); }
  }
  if (!fields.length) throw ApiError.badRequest('No valid fields to update');
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE lending SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return success(res, result.rows[0]);
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'DELETE FROM lending WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Entry not found');
  return success(res, {}, 'Deleted');
});

const recordPayment = asyncWrapper(async (req, res) => {
  const { amount, type = 'payment', date, notes } = req.body;
  if (!amount || !date) throw ApiError.badRequest('amount and date required');

  const entryRes = await pool.query(
    'SELECT * FROM lending WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!entryRes.rows.length) throw ApiError.notFound('Entry not found');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO lending_transactions (lending_id, amount, type, date, notes) VALUES ($1,$2,$3,$4,$5)',
      [req.params.id, amount, type, date, notes]
    );

    const newRemaining = Math.max(0, parseFloat(entryRes.rows[0].remaining) - parseFloat(amount));
    await client.query(
      `UPDATE lending SET remaining = $1,
        status = CASE WHEN $1 <= 0 THEN 'settled' ELSE CASE WHEN $1 < amount THEN 'partial' ELSE status END END
       WHERE id = $2`,
      [newRemaining, req.params.id]
    );

    await client.query('COMMIT');
    return success(res, { remaining: newRemaining });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = { list, getOne, create, update, remove, recordPayment };
