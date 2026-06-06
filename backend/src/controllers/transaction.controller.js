const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created, paginated } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const v = require('../validations/transaction.validation');

const list = asyncWrapper(async (req, res) => {
  const { error, value } = v.listTransactions.validate(req.query);
  if (error) throw ApiError.badRequest(error.details[0].message);

  const { type, month, year, account_id, category_id, search, min_amount, max_amount, sort, page, limit } = value;
  const offset = (page - 1) * limit;

  let where = 'WHERE t.user_id = $1';
  const params = [req.user.id];
  let i = 2;

  if (type && type !== 'all') { where += ` AND t.type = $${i++}`; params.push(type); }
  if (month) { where += ` AND EXTRACT(MONTH FROM t.date) = $${i++}`; params.push(month); }
  if (year) { where += ` AND EXTRACT(YEAR FROM t.date) = $${i++}`; params.push(year); }
  if (account_id) { where += ` AND (t.account_id = $${i++} OR t.to_account_id = $${i - 1})`; params.push(account_id); }
  if (category_id) { where += ` AND t.category_id = $${i++}`; params.push(category_id); }
  if (search) {
    where += ` AND (t.description ILIKE $${i++} OR t.payee ILIKE $${i - 1} OR t.notes ILIKE $${i - 1})`;
    params.push(`%${search}%`);
  }
  if (min_amount) { where += ` AND t.amount >= $${i++}`; params.push(min_amount); }
  if (max_amount) { where += ` AND t.amount <= $${i++}`; params.push(max_amount); }

  const sortMap = {
    date_asc: 't.date ASC, t.created_at ASC',
    date_desc: 't.date DESC, t.created_at DESC',
    amount_asc: 't.amount ASC',
    amount_desc: 't.amount DESC',
  };
  const orderBy = sortMap[sort] || 't.date DESC, t.created_at DESC';

  const countResult = await pool.query(`SELECT COUNT(*) FROM transactions t ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  const dataQuery = `
    SELECT
      t.*,
      c.name AS category_name,
      c.icon AS category_icon,
      c.color AS category_color,
      a.name AS account_name,
      ta.name AS to_account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    ${where}
    ORDER BY ${orderBy}
    LIMIT $${i++} OFFSET $${i}
  `;
  params.push(limit, offset);

  const result = await pool.query(dataQuery, params);
  return paginated(res, result.rows, total, page, limit);
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    `SELECT t.*,
      c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
      a.name AS account_name,
      ta.name AS to_account_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts a ON t.account_id = a.id
     LEFT JOIN accounts ta ON t.to_account_id = ta.id
     WHERE t.id = $1 AND t.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Transaction not found');
  return success(res, result.rows[0]);
});

const create = asyncWrapper(async (req, res) => {
  const { error, value } = v.createTransaction.validate(req.body);
  if (error) throw ApiError.badRequest(error.details[0].message);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      type, amount, description, category_id, account_id, to_account_id,
      date, notes, tags, is_recurring, recurrence_rule, is_tax_related,
      reference_no, payee,
    } = value;

    const result = await client.query(
      `INSERT INTO transactions
        (user_id, type, amount, description, category_id, account_id, to_account_id,
         date, notes, tags, is_recurring, recurrence_rule, is_tax_related, reference_no, payee)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [req.user.id, type, amount, description, category_id, account_id, to_account_id,
       date, notes, tags, is_recurring, recurrence_rule, is_tax_related, reference_no, payee]
    );

    // Update account balances
    if (account_id) {
      const delta = type === 'income' ? amount : type === 'expense' ? -amount : -amount;
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3',
        [delta, account_id, req.user.id]
      );
    }
    if (type === 'transfer' && to_account_id) {
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3',
        [amount, to_account_id, req.user.id]
      );
    }

    await client.query('COMMIT');
    return created(res, result.rows[0], 'Transaction created');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const update = asyncWrapper(async (req, res) => {
  const { error, value } = v.updateTransaction.validate(req.body);
  if (error) throw ApiError.badRequest(error.details[0].message);

  const existing = await pool.query(
    'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Transaction not found');

  const old = existing.rows[0];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fields = [];
    const params = [];
    let i = 1;
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) { fields.push(`${key} = $${i++}`); params.push(val); }
    }
    if (!fields.length) throw ApiError.badRequest('No fields to update');

    params.push(req.params.id);
    const result = await client.query(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );

    // Revert old balance effect and apply new
    if (old.account_id) {
      const revert = old.type === 'income' ? -old.amount : old.type === 'expense' ? old.amount : old.amount;
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3',
        [revert, old.account_id, req.user.id]
      );
    }
    const updated = result.rows[0];
    if (updated.account_id) {
      const delta = updated.type === 'income' ? updated.amount : updated.type === 'expense' ? -updated.amount : -updated.amount;
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3',
        [delta, updated.account_id, req.user.id]
      );
    }

    await client.query('COMMIT');
    return success(res, result.rows[0], 'Transaction updated');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const remove = asyncWrapper(async (req, res) => {
  const existing = await pool.query(
    'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Transaction not found');

  const tx = existing.rows[0];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);

    // Revert balance
    if (tx.account_id) {
      const revert = tx.type === 'income' ? -tx.amount : tx.type === 'expense' ? tx.amount : tx.amount;
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3',
        [revert, tx.account_id, req.user.id]
      );
    }
    if (tx.type === 'transfer' && tx.to_account_id) {
      await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND user_id = $3',
        [tx.amount, tx.to_account_id, req.user.id]
      );
    }
    await client.query('COMMIT');
    return success(res, {}, 'Transaction deleted');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const getSummary = asyncWrapper(async (req, res) => {
  const { month, year } = req.query;
  const params = [req.user.id];
  let dateFilter = '';
  let i = 2;

  if (month && year) {
    dateFilter = `AND EXTRACT(MONTH FROM date) = $${i++} AND EXTRACT(YEAR FROM date) = $${i++}`;
    params.push(month, year);
  } else if (year) {
    dateFilter = `AND EXTRACT(YEAR FROM date) = $${i++}`;
    params.push(year);
  }

  const result = await pool.query(
    `SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
      SUM(CASE WHEN type = 'transfer' THEN amount ELSE 0 END) AS total_transfer,
      COUNT(CASE WHEN type = 'income' THEN 1 END) AS income_count,
      COUNT(CASE WHEN type = 'expense' THEN 1 END) AS expense_count,
      COUNT(*) AS total_count
     FROM transactions
     WHERE user_id = $1 ${dateFilter}`,
    params
  );

  const summary = result.rows[0];
  summary.net = (parseFloat(summary.total_income) || 0) - (parseFloat(summary.total_expense) || 0);
  summary.savings_rate = summary.total_income > 0
    ? Math.round((summary.net / summary.total_income) * 10000) / 100
    : 0;

  return success(res, summary, 'Summary fetched');
});

const getCategoryBreakdown = asyncWrapper(async (req, res) => {
  const { month, year, type = 'expense' } = req.query;
  const params = [req.user.id, type];
  let dateFilter = '';
  let i = 3;

  if (month && year) {
    dateFilter = `AND EXTRACT(MONTH FROM t.date) = $${i++} AND EXTRACT(YEAR FROM t.date) = $${i++}`;
    params.push(month, year);
  }

  const result = await pool.query(
    `SELECT
      c.id AS category_id,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      COALESCE(c.icon, '💰') AS category_icon,
      COALESCE(c.color, '#8888AA') AS category_color,
      SUM(t.amount) AS total,
      COUNT(*) AS count
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = $1 AND t.type = $2 ${dateFilter}
     GROUP BY c.id, c.name, c.icon, c.color
     ORDER BY total DESC`,
    params
  );

  const total = result.rows.reduce((s, r) => s + parseFloat(r.total), 0);
  const data = result.rows.map((r) => ({
    ...r,
    percentage: total > 0 ? Math.round((parseFloat(r.total) / total) * 10000) / 100 : 0,
  }));

  return success(res, { categories: data, total }, 'Category breakdown fetched');
});

const getMonthlyTrend = asyncWrapper(async (req, res) => {
  const { year = new Date().getFullYear(), months = 12 } = req.query;

  const result = await pool.query(
    `SELECT
      EXTRACT(YEAR FROM date) AS year,
      EXTRACT(MONTH FROM date) AS month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = $1
       AND date >= NOW() - INTERVAL '${parseInt(months)} months'
     GROUP BY year, month
     ORDER BY year ASC, month ASC`,
    [req.user.id]
  );

  return success(res, result.rows, 'Monthly trend fetched');
});

module.exports = { list, getOne, create, update, remove, getSummary, getCategoryBreakdown, getMonthlyTrend };
