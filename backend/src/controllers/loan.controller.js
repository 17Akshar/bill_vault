const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const { loan: loanV } = require('../validations/common.validation');
const { calculateEMI, calculateOutstanding } = require('../utils/calculations');

const list = asyncWrapper(async (req, res) => {
  const { status, type } = req.query;
  let query = 'SELECT * FROM loans WHERE user_id = $1';
  const params = [req.user.id];
  let i = 2;

  if (status && status !== 'all') { query += ` AND status = $${i++}`; params.push(status); }
  if (type) { query += ` AND loan_type = $${i++}`; params.push(type); }

  query += ' ORDER BY created_at DESC';
  const result = await pool.query(query, params);
  return success(res, result.rows);
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM loans WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Loan not found');

  const loan = result.rows[0];

  // Compute EMI if not stored
  if (!loan.emi_amount && loan.interest_rate && loan.tenure_months) {
    loan.emi_amount = calculateEMI(loan.principal, loan.interest_rate, loan.tenure_months);
  }

  // Transaction history
  const txRes = await pool.query(
    'SELECT * FROM loan_transactions WHERE loan_id = $1 ORDER BY paid_date DESC',
    [loan.id]
  );
  loan.transactions = txRes.rows;

  const paidMonths = txRes.rows.filter((t) => t.type === 'emi').length;
  loan.paid_months = paidMonths;
  loan.remaining_months = Math.max(0, loan.tenure_months - paidMonths);

  return success(res, loan);
});

const create = asyncWrapper(async (req, res) => {
  const { error, value } = loanV.validate(req.body, { stripUnknown: true });
  if (error) throw ApiError.badRequest(error.details[0].message);

  // Auto-calculate EMI if not provided
  if (!value.emi_amount && value.interest_rate && value.tenure_months) {
    value.emi_amount = calculateEMI(value.principal, value.interest_rate, value.tenure_months);
  }

  const result = await pool.query(
    `INSERT INTO loans (user_id, loan_type, lender_name, loan_account_no, principal, outstanding,
      interest_rate, tenure_months, emi_amount, emi_type, start_date, end_date, emi_due_date, account_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [req.user.id, value.loan_type, value.lender_name, value.loan_account_no, value.principal,
     value.outstanding, value.interest_rate, value.tenure_months, value.emi_amount,
     value.emi_type, value.start_date, value.end_date, value.emi_due_date, value.account_id, value.notes]
  );
  return created(res, result.rows[0], 'Loan added');
});

const LOAN_UPDATABLE = new Set(['loan_type','lender_name','loan_account_no','principal','outstanding',
  'interest_rate','tenure_months','emi_amount','emi_type','start_date','end_date','emi_due_date','account_id','notes','status']);

const update = asyncWrapper(async (req, res) => {
  const existing = await pool.query(
    'SELECT id FROM loans WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Loan not found');

  const fields = [];
  const params = [];
  let i = 1;
  for (const [key, val] of Object.entries(req.body)) {
    if (LOAN_UPDATABLE.has(key) && val !== undefined) { fields.push(`${key} = $${i++}`); params.push(val); }
  }
  if (!fields.length) throw ApiError.badRequest('No valid fields to update');
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE loans SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return success(res, result.rows[0], 'Loan updated');
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    "UPDATE loans SET status = 'closed' WHERE id = $1 AND user_id = $2 RETURNING id",
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Loan not found');
  return success(res, {}, 'Loan closed');
});

const addTransaction = asyncWrapper(async (req, res) => {
  const { type, amount, principal, interest, paid_date, notes } = req.body;
  if (!type || !amount || !paid_date) throw ApiError.badRequest('type, amount, paid_date required');

  const loanRes = await pool.query(
    'SELECT * FROM loans WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!loanRes.rows.length) throw ApiError.notFound('Loan not found');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO loan_transactions (loan_id, type, amount, principal, interest, paid_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, type, amount, principal, interest, paid_date, notes]
    );

    const newOutstanding = Math.max(0, parseFloat(loanRes.rows[0].outstanding) - (parseFloat(principal) || parseFloat(amount)));
    await client.query(
      `UPDATE loans SET outstanding = $1::numeric,
        status = CASE WHEN $1::numeric <= 0 THEN 'closed' ELSE status END
       WHERE id = $2`,
      [newOutstanding, req.params.id]
    );

    await client.query('COMMIT');
    return created(res, result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const getInsights = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    `SELECT
      l.*,
      COALESCE(SUM(lt.amount), 0) AS total_paid,
      COUNT(lt.id) AS emi_count
     FROM loans l
     LEFT JOIN loan_transactions lt ON lt.loan_id = l.id AND lt.type = 'emi'
     WHERE l.user_id = $1 AND l.status = 'active'
     GROUP BY l.id`,
    [req.user.id]
  );

  const loans = result.rows.map((l) => ({
    ...l,
    emi: calculateEMI(l.principal, l.interest_rate, l.tenure_months),
    progress_pct: l.principal > 0
      ? Math.round(((l.principal - l.outstanding) / l.principal) * 10000) / 100
      : 0,
    total_interest: l.tenure_months * calculateEMI(l.principal, l.interest_rate, l.tenure_months) - l.principal,
  }));

  const totalOutstanding = loans.reduce((s, l) => s + parseFloat(l.outstanding), 0);
  const totalEMI = loans.reduce((s, l) => s + l.emi, 0);

  return success(res, loans);
});

module.exports = { list, getOne, create, update, remove, addTransaction, getInsights };
