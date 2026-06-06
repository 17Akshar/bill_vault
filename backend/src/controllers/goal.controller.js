const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const { goal: goalV } = require('../validations/common.validation');

const list = asyncWrapper(async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT *, ROUND((current_amount/NULLIF(target_amount,0)*100),2) AS progress_pct FROM goals WHERE user_id = $1';
  const params = [req.user.id];
  let i = 2;

  if (status && status !== 'all') { query += ` AND status = $${i++}`; params.push(status); }
  query += ' ORDER BY priority DESC, target_date ASC NULLS LAST';

  const result = await pool.query(query, params);
  return success(res, result.rows);
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    `SELECT *, ROUND((current_amount/NULLIF(target_amount,0)*100),2) AS progress_pct,
      (target_amount - current_amount) AS remaining
     FROM goals WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Goal not found');
  return success(res, result.rows[0]);
});

const create = asyncWrapper(async (req, res) => {
  const { error, value } = goalV.validate(req.body);
  if (error) throw ApiError.badRequest(error.details[0].message);

  const result = await pool.query(
    `INSERT INTO goals (user_id, name, target_amount, current_amount, target_date, category, icon, color, priority, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user.id, value.name, value.target_amount, value.current_amount, value.target_date,
     value.category, value.icon, value.color, value.priority, value.notes]
  );
  return created(res, result.rows[0], 'Goal created');
});

const update = asyncWrapper(async (req, res) => {
  const existing = await pool.query(
    'SELECT id FROM goals WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Goal not found');

  const fields = [];
  const params = [];
  let i = 1;
  for (const [key, val] of Object.entries(req.body)) {
    if (val !== undefined) { fields.push(`${key} = $${i++}`); params.push(val); }
  }

  // Auto-mark achieved
  if (req.body.current_amount !== undefined && req.body.target_amount === undefined) {
    const goal = await pool.query('SELECT target_amount FROM goals WHERE id = $1', [req.params.id]);
    if (parseFloat(req.body.current_amount) >= parseFloat(goal.rows[0].target_amount)) {
      fields.push(`status = $${i++}`);
      params.push('achieved');
    }
  }

  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE goals SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return success(res, result.rows[0], 'Goal updated');
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Goal not found');
  return success(res, {}, 'Goal deleted');
});

const addContribution = asyncWrapper(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) throw ApiError.badRequest('Valid amount required');

  const result = await pool.query(
    `UPDATE goals SET
      current_amount = current_amount + $1,
      status = CASE WHEN current_amount + $1 >= target_amount THEN 'achieved' ELSE status END
     WHERE id = $2 AND user_id = $3 RETURNING *`,
    [amount, req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Goal not found');
  return success(res, result.rows[0], 'Contribution added');
});

module.exports = { list, getOne, create, update, remove, addContribution };
