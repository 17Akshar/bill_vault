const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const { creditCard: ccV } = require('../validations/common.validation');

const list = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    `SELECT *, (credit_limit - outstanding) AS available_limit,
      ROUND((outstanding / NULLIF(credit_limit, 0) * 100), 2) AS utilization_pct
     FROM credit_cards WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  return success(res, result.rows);
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    `SELECT *, (credit_limit - outstanding) AS available_limit,
      ROUND((outstanding / NULLIF(credit_limit, 0) * 100), 2) AS utilization_pct
     FROM credit_cards WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Credit card not found');

  const card = result.rows[0];

  const recentTx = await pool.query(
    `SELECT cct.*, c.name AS category_name, c.icon AS category_icon
     FROM credit_card_transactions cct
     LEFT JOIN categories c ON cct.category_id = c.id
     WHERE cct.card_id = $1 ORDER BY cct.date DESC LIMIT 10`,
    [card.id]
  );
  card.recent_transactions = recentTx.rows;

  return success(res, card);
});

const create = asyncWrapper(async (req, res) => {
  const { error, value } = ccV.validate(req.body, { stripUnknown: true });
  if (error) throw ApiError.badRequest(error.details[0].message);

  const result = await pool.query(
    `INSERT INTO credit_cards
      (user_id, card_name, issuer, card_number, credit_limit, outstanding, minimum_payment,
       bill_due_date, billing_date, reward_points, annual_fee, color, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [req.user.id, value.card_name, value.issuer, value.card_number, value.credit_limit,
     value.outstanding, value.minimum_payment, value.bill_due_date, value.billing_date,
     value.reward_points, value.annual_fee, value.color, value.notes]
  );
  return created(res, result.rows[0], 'Credit card added');
});

const update = asyncWrapper(async (req, res) => {
  const existing = await pool.query(
    'SELECT id FROM credit_cards WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Credit card not found');

  const CC_UPDATABLE = new Set(['card_name','issuer','card_number','credit_limit','outstanding','minimum_payment','bill_due_date','billing_date','reward_points','annual_fee','color','notes','status']);
  const fields = [];
  const params = [];
  let i = 1;
  for (const [key, val] of Object.entries(req.body)) {
    if (CC_UPDATABLE.has(key) && val !== undefined) { fields.push(`${key} = $${i++}`); params.push(val); }
  }
  if (!fields.length) throw ApiError.badRequest('No valid fields to update');
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE credit_cards SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return success(res, result.rows[0], 'Card updated');
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    "UPDATE credit_cards SET status = 'cancelled' WHERE id = $1 AND user_id = $2 RETURNING id",
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Credit card not found');
  return success(res, {}, 'Card removed');
});

const addTransaction = asyncWrapper(async (req, res) => {
  const { description, amount, type, category_id, date, merchant, emi_months, notes } = req.body;
  if (!description || !amount || !type || !date) {
    throw ApiError.badRequest('description, amount, type, date required');
  }

  const cardRes = await pool.query(
    'SELECT id, outstanding FROM credit_cards WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!cardRes.rows.length) throw ApiError.notFound('Credit card not found');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO credit_card_transactions
        (card_id, description, amount, type, category_id, date, merchant, emi_months, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.id, description, amount, type, category_id, date, merchant, emi_months, notes]
    );

    const delta = type === 'debit' ? amount : type === 'payment' || type === 'cashback' ? -amount : 0;
    if (delta !== 0) {
      await client.query(
        'UPDATE credit_cards SET outstanding = GREATEST(0, outstanding + $1) WHERE id = $2',
        [delta, req.params.id]
      );
    }

    await client.query('COMMIT');
    return created(res, result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const makePayment = asyncWrapper(async (req, res) => {
  const { amount, payment_type = 'full', account_id, notes } = req.body;
  const payment_date = req.body.payment_date || new Date().toISOString().split('T')[0];

  const cardRes = await pool.query(
    'SELECT * FROM credit_cards WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!cardRes.rows.length) throw ApiError.notFound('Credit card not found');
  const card = cardRes.rows[0];

  const payAmount = payment_type === 'full'
    ? parseFloat(card.outstanding)
    : payment_type === 'minimum'
    ? parseFloat(card.minimum_payment || 0)
    : parseFloat(amount);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO credit_card_payments (card_id, amount, payment_date, payment_type, account_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [card.id, payAmount, payment_date, payment_type, account_id, notes]
    );

    await client.query(
      'UPDATE credit_cards SET outstanding = GREATEST(0, outstanding - $1) WHERE id = $2',
      [payAmount, card.id]
    );

    if (account_id) {
      await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND user_id = $3',
        [payAmount, account_id, req.user.id]
      );
    }

    await client.query('COMMIT');
    return success(res, { amount_paid: payAmount }, 'Payment recorded');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const getTransactions = asyncWrapper(async (req, res) => {
  const { from, to, type, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = 'WHERE cct.card_id = $1';
  const params = [req.params.id];
  let i = 2;

  if (type) { where += ` AND cct.type = $${i++}`; params.push(type); }
  if (from) { where += ` AND cct.date >= $${i++}`; params.push(from); }
  if (to) { where += ` AND cct.date <= $${i++}`; params.push(to); }

  const countRes = await pool.query(`SELECT COUNT(*) FROM credit_card_transactions cct ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT cct.*, c.name AS category_name, c.icon AS category_icon
     FROM credit_card_transactions cct
     LEFT JOIN categories c ON cct.category_id = c.id
     ${where} ORDER BY cct.date DESC LIMIT $${i++} OFFSET $${i}`,
    params
  );

  return success(res, { transactions: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
});

module.exports = { list, getOne, create, update, remove, addTransaction, makePayment, getTransactions };
