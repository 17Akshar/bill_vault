const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const { insurance: insuranceV } = require('../validations/common.validation');

const list = asyncWrapper(async (req, res) => {
  const { type, status } = req.query;
  let query = 'SELECT *, (premium_due_date - CURRENT_DATE) AS days_to_renewal FROM insurance_policies WHERE user_id = $1';
  const params = [req.user.id];
  let i = 2;

  if (type) { query += ` AND type = $${i++}`; params.push(type); }
  if (status && status !== 'all') { query += ` AND status = $${i++}`; params.push(status); }
  query += ' ORDER BY premium_due_date ASC NULLS LAST';

  const result = await pool.query(query, params);
  return success(res, result.rows);
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM insurance_policies WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Policy not found');

  const policy = result.rows[0];

  const [payments, claims, members] = await Promise.all([
    pool.query('SELECT * FROM insurance_premium_payments WHERE policy_id = $1 ORDER BY paid_date DESC', [policy.id]),
    pool.query('SELECT * FROM insurance_claims WHERE policy_id = $1 ORDER BY claim_date DESC', [policy.id]),
    policy.type === 'mediclaim'
      ? pool.query('SELECT * FROM mediclaim_members WHERE policy_id = $1', [policy.id])
      : { rows: [] },
  ]);

  return success(res, {
    ...policy,
    payment_history: payments.rows,
    claims: claims.rows,
    members: members.rows,
  });
});

const create = asyncWrapper(async (req, res) => {
  const { error, value } = insuranceV.validate(req.body, { stripUnknown: true });
  if (error) throw ApiError.badRequest(error.details[0].message);

  const result = await pool.query(
    `INSERT INTO insurance_policies
      (user_id, type, policy_number, provider, plan_name, sum_assured, premium_amount,
       premium_frequency, start_date, end_date, maturity_date, premium_due_date,
       nominee_name, nominee_relation, agent_name, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
    [req.user.id, value.type, value.policy_number, value.provider, value.plan_name,
     value.sum_assured, value.premium_amount, value.premium_frequency, value.start_date,
     value.end_date, value.maturity_date, value.premium_due_date, value.nominee_name,
     value.nominee_relation, value.agent_name, value.notes]
  );
  return created(res, result.rows[0], 'Policy added');
});

const update = asyncWrapper(async (req, res) => {
  const existing = await pool.query(
    'SELECT id FROM insurance_policies WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Policy not found');

  const INS_UPDATABLE = new Set(['type','policy_number','provider','plan_name','sum_assured','premium_amount',
    'premium_frequency','start_date','end_date','maturity_date','premium_due_date',
    'nominee_name','nominee_relation','agent_name','notes','status']);
  const fields = [];
  const params = [];
  let i = 1;
  for (const [key, val] of Object.entries(req.body)) {
    if (INS_UPDATABLE.has(key) && val !== undefined) { fields.push(`${key} = $${i++}`); params.push(val); }
  }
  if (!fields.length) throw ApiError.badRequest('No valid fields to update');
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE insurance_policies SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return success(res, result.rows[0], 'Policy updated');
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    "UPDATE insurance_policies SET status = 'surrendered' WHERE id = $1 AND user_id = $2 RETURNING id",
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Policy not found');
  return success(res, {}, 'Policy removed');
});

const payPremium = asyncWrapper(async (req, res) => {
  const { amount, receipt_no, notes } = req.body;
  const paid_date = req.body.paid_date || new Date().toISOString().split('T')[0];

  const policyRes = await pool.query(
    'SELECT * FROM insurance_policies WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!policyRes.rows.length) throw ApiError.notFound('Policy not found');

  const result = await pool.query(
    `INSERT INTO insurance_premium_payments (policy_id, amount, paid_date, receipt_no, notes)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.params.id, amount || policyRes.rows[0].premium_amount, paid_date, receipt_no, notes]
  );

  // Advance premium due date
  const policy = policyRes.rows[0];
  if (policy.premium_due_date) {
    const d = new Date(policy.premium_due_date);
    switch (policy.premium_frequency) {
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
      case 'half_yearly': d.setMonth(d.getMonth() + 6); break;
      case 'annual': case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    }
    await pool.query(
      'UPDATE insurance_policies SET premium_due_date = $1 WHERE id = $2',
      [d.toISOString().split('T')[0], req.params.id]
    );
  }

  return created(res, result.rows[0], 'Premium payment recorded');
});

const fileClaim = asyncWrapper(async (req, res) => {
  const { claim_number, claim_date, claim_amount, reason } = req.body;
  if (!claim_date) throw ApiError.badRequest('claim_date required');

  const result = await pool.query(
    `INSERT INTO insurance_claims (policy_id, claim_number, claim_date, claim_amount, reason)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.params.id, claim_number, claim_date, claim_amount, reason]
  );
  return created(res, result.rows[0], 'Claim filed');
});

const updateClaim = asyncWrapper(async (req, res) => {
  const { status, approved_amount, notes } = req.body;
  const result = await pool.query(
    `UPDATE insurance_claims SET
      status = COALESCE($1, status),
      approved_amount = COALESCE($2, approved_amount),
      notes = COALESCE($3, notes)
     WHERE id = $4 RETURNING *`,
    [status, approved_amount, notes, req.params.claimId]
  );
  if (!result.rows.length) throw ApiError.notFound('Claim not found');
  return success(res, result.rows[0], 'Claim updated');
});

module.exports = { list, getOne, create, update, remove, payPremium, fileClaim, updateClaim };
