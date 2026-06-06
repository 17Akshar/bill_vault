const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const { budget: budgetV } = require('../validations/common.validation');
const { calculateBudgetUsed } = require('../utils/calculations');

const list = asyncWrapper(async (req, res) => {
  const { period, is_active = 'true' } = req.query;
  let query = `
    SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
      COALESCE((
        SELECT SUM(t.amount) FROM transactions t
        WHERE t.user_id = b.user_id
          AND t.category_id = b.category_id
          AND t.type = 'expense'
          AND t.date >= b.start_date
          AND (b.end_date IS NULL OR t.date <= b.end_date)
      ), 0) AS spent
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = $1
  `;
  const params = [req.user.id];
  let i = 2;

  if (is_active !== 'all') { query += ` AND b.is_active = $${i++}`; params.push(is_active === 'true'); }
  if (period) { query += ` AND b.period = $${i++}`; params.push(period); }
  query += ' ORDER BY b.created_at DESC';

  const result = await pool.query(query, params);
  const budgets = result.rows.map((b) => ({
    ...b,
    used_pct: calculateBudgetUsed(parseFloat(b.spent), parseFloat(b.budget_amount)),
    remaining: Math.max(0, parseFloat(b.budget_amount) - parseFloat(b.spent)),
  }));

  return success(res, budgets);
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    `SELECT b.*, c.name AS category_name, c.icon AS category_icon,
      COALESCE((
        SELECT SUM(t.amount) FROM transactions t
        WHERE t.user_id = b.user_id AND t.category_id = b.category_id
          AND t.type = 'expense' AND t.date >= b.start_date
      ), 0) AS spent
     FROM budgets b
     LEFT JOIN categories c ON b.category_id = c.id
     WHERE b.id = $1 AND b.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Budget not found');

  const b = result.rows[0];
  b.used_pct = calculateBudgetUsed(parseFloat(b.spent), parseFloat(b.budget_amount));
  b.remaining = Math.max(0, parseFloat(b.budget_amount) - parseFloat(b.spent));

  return success(res, b);
});

const create = asyncWrapper(async (req, res) => {
  const { error, value } = budgetV.validate(req.body, { stripUnknown: true });
  if (error) throw ApiError.badRequest(error.details[0].message);

  const result = await pool.query(
    `INSERT INTO budgets (user_id, name, category_id, budget_amount, period, start_date, end_date, alert_at_pct, rollover, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user.id, value.name, value.category_id, value.budget_amount, value.period,
     value.start_date, value.end_date, value.alert_at_pct, value.rollover, value.notes]
  );
  return created(res, result.rows[0], 'Budget created');
});

const update = asyncWrapper(async (req, res) => {
  const existing = await pool.query(
    'SELECT id FROM budgets WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Budget not found');

  const fields = [];
  const params = [];
  let i = 1;
  for (const [key, val] of Object.entries(req.body)) {
    if (val !== undefined) { fields.push(`${key} = $${i++}`); params.push(val); }
  }
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE budgets SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return success(res, result.rows[0], 'Budget updated');
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Budget not found');
  return success(res, {}, 'Budget deleted');
});

const getAnalytics = asyncWrapper(async (req, res) => {
  const { year, month } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;

  const result = await pool.query(
    `SELECT
      b.id, b.name, b.budget_amount,
      c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
      COALESCE(SUM(t.amount), 0) AS spent
     FROM budgets b
     LEFT JOIN categories c ON b.category_id = c.id
     LEFT JOIN transactions t ON t.user_id = b.user_id
       AND t.category_id = b.category_id
       AND t.type = 'expense'
       AND EXTRACT(YEAR FROM t.date) = $2
       AND EXTRACT(MONTH FROM t.date) = $3
     WHERE b.user_id = $1 AND b.is_active = true
     GROUP BY b.id, b.name, b.budget_amount, c.name, c.icon, c.color`,
    [req.user.id, y, m]
  );

  const budgets = result.rows.map((b) => ({
    ...b,
    used_pct: calculateBudgetUsed(parseFloat(b.spent), parseFloat(b.budget_amount)),
    remaining: Math.max(0, parseFloat(b.budget_amount) - parseFloat(b.spent)),
    is_exceeded: parseFloat(b.spent) > parseFloat(b.budget_amount),
  }));

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.budget_amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + parseFloat(b.spent), 0);

  return success(res, {
    budgets,
    summary: {
      total_budget: totalBudget,
      total_spent: totalSpent,
      total_remaining: Math.max(0, totalBudget - totalSpent),
      used_pct: calculateBudgetUsed(totalSpent, totalBudget),
      exceeded_count: budgets.filter((b) => b.is_exceeded).length,
    },
  });
});

module.exports = { list, getOne, create, update, remove, getAnalytics };
