const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const { reminder: reminderV } = require('../validations/common.validation');

const list = asyncWrapper(async (req, res) => {
  const { status, category, from, to, search, sort = 'due_date', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = 'WHERE user_id = $1';
  const params = [req.user.id];
  let i = 2;

  if (status && status !== 'all') { where += ` AND status = $${i++}`; params.push(status); }
  if (category && category !== 'all') { where += ` AND category = $${i++}`; params.push(category); }
  if (from) { where += ` AND due_date >= $${i++}`; params.push(from); }
  if (to) { where += ` AND due_date <= $${i++}`; params.push(to); }
  if (search) { where += ` AND (title ILIKE $${i++} OR provider ILIKE $${i - 1})`; params.push(`%${search}%`); }

  const sortMap = { due_date: 'due_date ASC', amount: 'amount DESC', created: 'created_at DESC' };
  const orderBy = sortMap[sort] || 'due_date ASC';

  const countRes = await pool.query(`SELECT COUNT(*) FROM reminders ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT *, (due_date - CURRENT_DATE) AS days_until_due FROM reminders ${where}
     ORDER BY ${orderBy} LIMIT $${i++} OFFSET $${i}`,
    params
  );

  return success(res, result.rows);
});

const getSummary = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'pending' AND due_date >= CURRENT_DATE) AS upcoming,
      COUNT(*) FILTER (WHERE status = 'overdue' OR (status='pending' AND due_date < CURRENT_DATE)) AS overdue,
      COUNT(*) FILTER (WHERE status = 'paid') AS paid_this_month,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND EXTRACT(MONTH FROM due_date) = EXTRACT(MONTH FROM CURRENT_DATE)), 0) AS this_month_due,
      COALESCE(SUM(amount) FILTER (WHERE status = 'overdue' OR (status='pending' AND due_date < CURRENT_DATE)), 0) AS overdue_amount
     FROM reminders WHERE user_id = $1`,
    [req.user.id]
  );

  return success(res, result.rows[0]);
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'SELECT *, (due_date - CURRENT_DATE) AS days_until_due FROM reminders WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Reminder not found');

  const payments = await pool.query(
    'SELECT * FROM reminder_payments WHERE reminder_id = $1 ORDER BY paid_date DESC',
    [req.params.id]
  );
  return success(res, { ...result.rows[0], payment_history: payments.rows });
});

const create = asyncWrapper(async (req, res) => {
  const { error, value } = reminderV.validate(req.body);
  if (error) throw ApiError.badRequest(error.details[0].message);

  const result = await pool.query(
    `INSERT INTO reminders
      (user_id, title, provider, category, amount, due_date, is_recurring, recurrence_rule,
       recurrence_end, notify_days_before, notify_on_due, account_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [req.user.id, value.title, value.provider, value.category, value.amount, value.due_date,
     value.is_recurring, value.recurrence_rule, value.recurrence_end, value.notify_days_before,
     value.notify_on_due, value.account_id, value.notes]
  );
  return created(res, result.rows[0], 'Reminder created');
});

const update = asyncWrapper(async (req, res) => {
  const existing = await pool.query(
    'SELECT id FROM reminders WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Reminder not found');

  const fields = [];
  const params = [];
  let i = 1;
  for (const [key, val] of Object.entries(req.body)) {
    if (val !== undefined) { fields.push(`${key} = $${i++}`); params.push(val); }
  }
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE reminders SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return success(res, result.rows[0], 'Reminder updated');
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'DELETE FROM reminders WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Reminder not found');
  return success(res, {}, 'Reminder deleted');
});

const markPaid = asyncWrapper(async (req, res) => {
  const { amount, payment_date = new Date().toISOString().split('T')[0], payment_method, reference_no, notes } = req.body;

  const remRes = await pool.query(
    'SELECT * FROM reminders WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!remRes.rows.length) throw ApiError.notFound('Reminder not found');
  const rem = remRes.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO reminder_payments (reminder_id, amount, paid_date, payment_method, reference_no, notes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [rem.id, amount || rem.amount, payment_date, payment_method, reference_no, notes]
    );

    // If recurring, push due date to next occurrence; else mark paid
    let nextStatus = 'paid';
    let nextDueDate = rem.due_date;

    if (rem.is_recurring && rem.recurrence_rule) {
      nextDueDate = calculateNextDueDate(rem.due_date, rem.recurrence_rule);
      nextStatus = 'pending';
    }

    await client.query(
      'UPDATE reminders SET status = $1, due_date = $2 WHERE id = $3',
      [nextStatus, nextDueDate, rem.id]
    );

    await client.query('COMMIT');
    return success(res, { nextDueDate, status: nextStatus }, 'Marked as paid');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

function calculateNextDueDate(currentDue, rule) {
  const d = new Date(currentDue);
  switch (rule) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'half_yearly': d.setMonth(d.getMonth() + 6); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split('T')[0];
}

const getCalendar = asyncWrapper(async (req, res) => {
  const { year, month } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;

  const result = await pool.query(
    `SELECT id, title, amount, due_date, status, category
     FROM reminders
     WHERE user_id = $1
       AND EXTRACT(YEAR FROM due_date) = $2
       AND EXTRACT(MONTH FROM due_date) = $3`,
    [req.user.id, y, m]
  );
  return success(res, result.rows);
});

module.exports = { list, getSummary, getOne, create, update, remove, markPaid, getCalendar };
