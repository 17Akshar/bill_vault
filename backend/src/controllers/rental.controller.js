const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const { rental: rentalV } = require('../validations/common.validation');
const { calculateRentalYield } = require('../utils/calculations');

const list = asyncWrapper(async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM rentals WHERE user_id = $1';
  const params = [req.user.id];
  let i = 2;

  if (status && status !== 'all') { query += ` AND status = $${i++}`; params.push(status); }
  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  const rentals = result.rows.map((r) => ({
    ...r,
    annual_rent: parseFloat(r.monthly_rent || 0) * 12,
    rental_yield: calculateRentalYield(parseFloat(r.monthly_rent || 0) * 12, parseFloat(r.market_value || 0)),
  }));
  return success(res, rentals);
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM rentals WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Rental not found');

  const rental = result.rows[0];
  rental.annual_rent = parseFloat(rental.monthly_rent || 0) * 12;
  rental.rental_yield = calculateRentalYield(rental.annual_rent, parseFloat(rental.market_value || 0));

  const txRes = await pool.query(
    'SELECT * FROM rental_transactions WHERE rental_id = $1 ORDER BY date DESC LIMIT 20',
    [rental.id]
  );
  rental.transactions = txRes.rows;

  const statsRes = await pool.query(
    `SELECT
      SUM(CASE WHEN type='rent' THEN amount ELSE 0 END) AS total_rent_collected,
      SUM(CASE WHEN type='expense' OR type='maintenance' THEN amount ELSE 0 END) AS total_expenses
     FROM rental_transactions WHERE rental_id = $1`,
    [rental.id]
  );
  rental.stats = statsRes.rows[0];
  rental.net_income = parseFloat(rental.stats.total_rent_collected || 0) - parseFloat(rental.stats.total_expenses || 0);

  return success(res, rental);
});

const create = asyncWrapper(async (req, res) => {
  const { error, value } = rentalV.validate(req.body, { stripUnknown: true });
  if (error) throw ApiError.badRequest(error.details[0].message);

  const result = await pool.query(
    `INSERT INTO rentals
      (user_id, property_name, property_type, address, market_value, monthly_rent, security_deposit,
       tenant_name, tenant_phone, tenant_email, lease_start, lease_end, rent_due_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [req.user.id, value.property_name, value.property_type, value.address, value.market_value,
     value.monthly_rent, value.security_deposit, value.tenant_name, value.tenant_phone,
     value.tenant_email, value.lease_start, value.lease_end, value.rent_due_date, value.notes]
  );
  return created(res, result.rows[0], 'Rental added');
});

const update = asyncWrapper(async (req, res) => {
  const existing = await pool.query(
    'SELECT id FROM rentals WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Rental not found');

  const fields = [];
  const params = [];
  let i = 1;
  for (const [key, val] of Object.entries(req.body)) {
    if (val !== undefined) { fields.push(`${key} = $${i++}`); params.push(val); }
  }
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE rentals SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return success(res, result.rows[0], 'Rental updated');
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'DELETE FROM rentals WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Rental not found');
  return success(res, {}, 'Rental deleted');
});

const recordRent = asyncWrapper(async (req, res) => {
  const { amount, type = 'rent', date, notes } = req.body;
  if (!amount || !date) throw ApiError.badRequest('amount and date required');

  const rentalRes = await pool.query(
    'SELECT id FROM rentals WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rentalRes.rows.length) throw ApiError.notFound('Rental not found');

  const result = await pool.query(
    'INSERT INTO rental_transactions (rental_id, type, amount, date, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.params.id, type, amount, date, notes]
  );
  return created(res, result.rows[0], 'Transaction recorded');
});

const getTransactions = asyncWrapper(async (req, res) => {
  const { type, from, to, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = 'WHERE rental_id = $1';
  const params = [req.params.id];
  let i = 2;

  if (type) { where += ` AND type = $${i++}`; params.push(type); }
  if (from) { where += ` AND date >= $${i++}`; params.push(from); }
  if (to) { where += ` AND date <= $${i++}`; params.push(to); }

  const countRes = await pool.query(`SELECT COUNT(*) FROM rental_transactions ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT * FROM rental_transactions ${where} ORDER BY date DESC LIMIT $${i++} OFFSET $${i}`,
    params
  );
  return success(res, { transactions: result.rows, total });
});

module.exports = { list, getOne, create, update, remove, recordRent, getTransactions };
