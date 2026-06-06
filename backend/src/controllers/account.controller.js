const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const v = require('../validations/account.validation');

const list = asyncWrapper(async (req, res) => {
  const { type, search } = req.query;
  let query = `SELECT * FROM accounts WHERE user_id = $1 AND is_active = true`;
  const params = [req.user.id];

  if (type) {
    params.push(type);
    query += ` AND account_type = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (name ILIKE $${params.length} OR bank_name ILIKE $${params.length})`;
  }
  query += ' ORDER BY created_at ASC';

  const result = await pool.query(query, params);
  return success(res, result.rows, 'Accounts fetched');
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Account not found');
  return success(res, result.rows[0]);
});

const create = asyncWrapper(async (req, res) => {
  const { error, value } = v.createAccount.validate(req.body, { stripUnknown: true });
  if (error) throw ApiError.badRequest(error.details[0].message);

  const {
    name, account_type, bank_name, account_number, balance,
    currency, color, icon, include_in_net_worth, notes,
  } = value;

  const result = await pool.query(
    `INSERT INTO accounts
      (user_id, name, account_type, bank_name, account_number, balance, currency, color, icon, include_in_net_worth, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [req.user.id, name, account_type, bank_name, account_number, balance, currency, color, icon, include_in_net_worth, notes]
  );
  return created(res, result.rows[0], 'Account created');
});

const update = asyncWrapper(async (req, res) => {
  const { error, value } = v.updateAccount.validate(req.body, { stripUnknown: true });
  if (error) throw ApiError.badRequest(error.details[0].message);

  const existing = await pool.query(
    'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Account not found');

  const fields = [];
  const params = [];
  let i = 1;

  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) {
      fields.push(`${key} = $${i++}`);
      params.push(val);
    }
  }
  if (!fields.length) throw ApiError.badRequest('No fields to update');

  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE accounts SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return success(res, result.rows[0], 'Account updated');
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'UPDATE accounts SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Account not found');
  return success(res, {}, 'Account deleted');
});

const getTransactions = asyncWrapper(async (req, res) => {
  const { type, from, to, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT t.*, c.name AS category_name, c.icon AS category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1 AND (t.account_id = $2 OR t.to_account_id = $2)
  `;
  const params = [req.user.id, req.params.id];
  let i = 3;

  if (type && type !== 'all') { query += ` AND t.type = $${i++}`; params.push(type); }
  if (from) { query += ` AND t.date >= $${i++}`; params.push(from); }
  if (to) { query += ` AND t.date <= $${i++}`; params.push(to); }

  const countResult = await pool.query(query.replace('t.*, c.name AS category_name, c.icon AS category_icon', 'COUNT(*)'), params);
  const total = parseInt(countResult.rows[0].count);

  query += ` ORDER BY t.date DESC, t.created_at DESC LIMIT $${i++} OFFSET $${i}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return success(res, { transactions: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
});

const getStats = asyncWrapper(async (req, res) => {
  const { year, month } = req.query;
  let dateFilter = '';
  const params = [req.user.id, req.params.id];
  let i = 3;

  if (year && month) {
    dateFilter = ` AND EXTRACT(YEAR FROM t.date) = $${i++} AND EXTRACT(MONTH FROM t.date) = $${i++}`;
    params.push(year, month);
  }

  const statsResult = await pool.query(
    `SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
      COUNT(*) AS transaction_count
     FROM transactions t
     WHERE user_id = $1 AND (account_id = $2 OR to_account_id = $2) ${dateFilter}`,
    params
  );

  const account = await pool.query('SELECT * FROM accounts WHERE id = $1', [req.params.id]);
  if (!account.rows.length) throw ApiError.notFound('Account not found');

  return success(res, { account: account.rows[0], stats: statsResult.rows[0] });
});

const getSummary = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    `SELECT
      COUNT(*) AS total_accounts,
      COALESCE(SUM(balance), 0) AS total_balance,
      COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) AS total_positive,
      COALESCE(SUM(CASE WHEN balance < 0 THEN balance ELSE 0 END), 0) AS total_negative
     FROM accounts WHERE user_id = $1 AND is_active = true`,
    [req.user.id]
  );
  return success(res, result.rows[0]);
});

module.exports = { list, getOne, create, update, remove, getTransactions, getStats, getSummary };
