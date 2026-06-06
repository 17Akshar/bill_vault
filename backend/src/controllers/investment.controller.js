const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created, paginated } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const v = require('../validations/investment.validation');
const { calculateReturns, calculateCAGR } = require('../utils/calculations');

const list = asyncWrapper(async (req, res) => {
  const { category, status = 'active', search, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  const params = [req.user.id];
  let where = 'WHERE user_id = $1';
  let i = 2;

  if (category) { where += ` AND category = $${i++}`; params.push(category); }
  if (status && status !== 'all') { where += ` AND status = $${i++}`; params.push(status); }
  if (search) { where += ` AND name ILIKE $${i++}`; params.push(`%${search}%`); }

  const countRes = await pool.query(`SELECT COUNT(*) FROM investments ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT *, (current_value - invested_amount) AS absolute_gain,
       CASE WHEN invested_amount > 0 THEN ROUND(((current_value - invested_amount)/invested_amount)*100, 2) ELSE 0 END AS gain_pct
     FROM investments ${where}
     ORDER BY current_value DESC
     LIMIT $${i++} OFFSET $${i}`,
    params
  );

  return paginated(res, result.rows, total, page, limit);
});

const getPortfolioSummary = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    `SELECT
      category,
      COUNT(*) AS count,
      SUM(invested_amount) AS invested,
      SUM(current_value) AS current,
      SUM(current_value - invested_amount) AS gain,
      CASE WHEN SUM(invested_amount) > 0
        THEN ROUND((SUM(current_value - invested_amount)/SUM(invested_amount))*100, 2)
        ELSE 0 END AS gain_pct
     FROM investments
     WHERE user_id = $1 AND status = 'active'
     GROUP BY category
     ORDER BY current DESC`,
    [req.user.id]
  );

  const totalCurrent = result.rows.reduce((s, r) => s + parseFloat(r.current || 0), 0);
  const totalInvested = result.rows.reduce((s, r) => s + parseFloat(r.invested || 0), 0);

  const data = result.rows.map((r) => ({
    ...r,
    allocation_pct: totalCurrent > 0 ? Math.round((parseFloat(r.current) / totalCurrent) * 10000) / 100 : 0,
  }));

  return success(res, {
    categories: data,
    totals: {
      invested: totalInvested,
      current: totalCurrent,
      ...calculateReturns(totalInvested, totalCurrent),
    },
  });
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM investments WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Investment not found');

  const inv = result.rows[0];
  inv.returns = calculateReturns(parseFloat(inv.invested_amount), parseFloat(inv.current_value));

  if (inv.purchase_date) {
    const years = (new Date() - new Date(inv.purchase_date)) / (365.25 * 24 * 3600 * 1000);
    inv.cagr = calculateCAGR(parseFloat(inv.invested_amount), parseFloat(inv.current_value), years);
  }

  // Fetch category-specific data
  const detailTables = {
    mutual_fund: 'mutual_funds',
    fd: 'fixed_deposits',
    rd: 'recurring_deposits',
    gold: 'gold_investments',
    crypto: 'crypto_investments',
    epf: 'provident_funds', ppf: 'provident_funds', nps: 'provident_funds',
  };
  const detailTable = detailTables[inv.category];
  if (detailTable) {
    const detail = await pool.query(
      `SELECT * FROM ${detailTable} WHERE investment_id = $1`,
      [inv.id]
    );
    inv.details = detail.rows[0] || null;
  }

  return success(res, inv);
});

const create = asyncWrapper(async (req, res) => {
  const { error, value } = v.createInvestment.validate(req.body, { stripUnknown: true });
  if (error) throw ApiError.badRequest(error.details[0].message);

  const { extra, ...invData } = value;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO investments
        (user_id, category, name, invested_amount, current_value, quantity,
         purchase_price, current_price, purchase_date, maturity_date, currency, status, notes, color)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [req.user.id, invData.category, invData.name, invData.invested_amount, invData.current_value,
       invData.quantity, invData.purchase_price, invData.current_price, invData.purchase_date,
       invData.maturity_date, invData.currency, invData.status, invData.notes, invData.color]
    );
    const inv = result.rows[0];

    // Insert category-specific data
    if (extra) {
      await insertCategoryDetails(client, inv.id, inv.category, extra);
    }

    // Log buy transaction
    await client.query(
      `INSERT INTO investment_transactions (investment_id, type, amount, quantity, price, date)
       VALUES ($1, 'buy', $2, $3, $4, $5)`,
      [inv.id, invData.invested_amount, invData.quantity, invData.purchase_price,
       invData.purchase_date || new Date().toISOString().split('T')[0]]
    );

    await client.query('COMMIT');
    return created(res, inv, 'Investment created');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

async function insertCategoryDetails(client, investmentId, category, data) {
  switch (category) {
    case 'mutual_fund':
      await client.query(
        `INSERT INTO mutual_funds (investment_id, fund_type, isin, amc, nav, units, expense_ratio,
          fund_manager, aum, risk_level, return_1y, return_3y, return_5y, sip_amount, folio_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (investment_id) DO UPDATE SET
           nav = EXCLUDED.nav, units = EXCLUDED.units`,
        [investmentId, data.fund_type, data.isin, data.amc, data.nav, data.units,
         data.expense_ratio, data.fund_manager, data.aum, data.risk_level,
         data.return_1y, data.return_3y, data.return_5y, data.sip_amount, data.folio_number]
      );
      break;
    case 'fd':
      await client.query(
        `INSERT INTO fixed_deposits (investment_id, bank_name, fd_number, principal,
          interest_rate, tenure_months, interest_type, auto_renewal, maturity_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (investment_id) DO UPDATE SET interest_rate = EXCLUDED.interest_rate`,
        [investmentId, data.bank_name || '', data.fd_number, data.principal || 0,
         data.interest_rate || 0, data.tenure_months || 12, data.interest_type,
         data.auto_renewal, data.maturity_amount]
      );
      break;
    case 'rd':
      await client.query(
        `INSERT INTO recurring_deposits (investment_id, bank_name, monthly_installment,
          tenure_months, interest_rate, maturity_amount, installments_paid)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (investment_id) DO UPDATE SET installments_paid = EXCLUDED.installments_paid`,
        [investmentId, data.bank_name || '', data.monthly_installment || 0,
         data.tenure_months || 12, data.interest_rate || 0, data.maturity_amount,
         data.installments_paid || 0]
      );
      break;
    case 'gold':
      await client.query(
        `INSERT INTO gold_investments (investment_id, gold_type, purity, weight_grams, storage_location)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (investment_id) DO UPDATE SET weight_grams = EXCLUDED.weight_grams`,
        [investmentId, data.gold_type, data.purity, data.weight_grams, data.storage_location]
      );
      break;
    case 'crypto':
      await client.query(
        `INSERT INTO crypto_investments (investment_id, symbol, blockchain, exchange_name)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (investment_id) DO UPDATE SET symbol = EXCLUDED.symbol`,
        [investmentId, data.symbol || '', data.blockchain, data.exchange_name]
      );
      break;
    case 'epf': case 'ppf': case 'nps':
      await client.query(
        `INSERT INTO provident_funds (investment_id, fund_type, uan_number, account_number,
          employer_name, interest_rate, maturity_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (investment_id) DO UPDATE SET fund_type = EXCLUDED.fund_type`,
        [investmentId, category, data.uan_number, data.account_number,
         data.employer_name, data.interest_rate, data.maturity_date]
      );
      break;
  }
}

const update = asyncWrapper(async (req, res) => {
  const { error, value } = v.updateInvestment.validate(req.body, { stripUnknown: true });
  if (error) throw ApiError.badRequest(error.details[0].message);

  const existing = await pool.query(
    'SELECT id FROM investments WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Investment not found');

  const { extra, ...invData } = value;

  const fields = [];
  const params = [];
  let i = 1;
  for (const [key, val] of Object.entries(invData)) {
    if (val !== undefined) { fields.push(`${key} = $${i++}`); params.push(val); }
  }

  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE investments SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return success(res, result.rows[0], 'Investment updated');
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    "UPDATE investments SET status = 'sold' WHERE id = $1 AND user_id = $2 RETURNING id",
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Investment not found');
  return success(res, {}, 'Investment removed');
});

const addTransaction = asyncWrapper(async (req, res) => {
  const { error, value } = v.addTransaction.validate(req.body, { stripUnknown: true });
  if (error) throw ApiError.badRequest(error.details[0].message);

  const inv = await pool.query(
    'SELECT id, invested_amount, current_value FROM investments WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!inv.rows.length) throw ApiError.notFound('Investment not found');

  const { type, amount, quantity, price, date, notes } = value;

  const result = await pool.query(
    `INSERT INTO investment_transactions (investment_id, type, amount, quantity, price, date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.id, type, amount, quantity, price, date, notes]
  );

  // Update investment value on buy/sell
  if (type === 'buy') {
    await pool.query(
      'UPDATE investments SET invested_amount = invested_amount + $1, current_value = current_value + $1 WHERE id = $2',
      [amount, req.params.id]
    );
  } else if (type === 'sell') {
    await pool.query(
      "UPDATE investments SET current_value = GREATEST(0, current_value - $1), status = CASE WHEN current_value - $1 <= 0 THEN 'sold' ELSE status END WHERE id = $2",
      [amount, req.params.id]
    );
  }

  return created(res, result.rows[0], 'Transaction added');
});

const getTransactions = asyncWrapper(async (req, res) => {
  const inv = await pool.query(
    'SELECT id FROM investments WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!inv.rows.length) throw ApiError.notFound('Investment not found');

  const result = await pool.query(
    'SELECT * FROM investment_transactions WHERE investment_id = $1 ORDER BY date DESC',
    [req.params.id]
  );
  return success(res, result.rows);
});

const getNotes = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM investment_notes WHERE investment_id = $1 ORDER BY created_at DESC',
    [req.params.id]
  );
  return success(res, result.rows);
});

const addNote = asyncWrapper(async (req, res) => {
  const { content, note_type = 'general' } = req.body;
  if (!content) throw ApiError.badRequest('Content is required');

  const result = await pool.query(
    'INSERT INTO investment_notes (investment_id, content, note_type) VALUES ($1,$2,$3) RETURNING *',
    [req.params.id, content, note_type]
  );
  return created(res, result.rows[0]);
});

const updatePrice = asyncWrapper(async (req, res) => {
  const { current_price, current_value } = req.body;

  const result = await pool.query(
    `UPDATE investments SET
      current_price = COALESCE($1, current_price),
      current_value = COALESCE($2, current_value)
     WHERE id = $3 AND user_id = $4 RETURNING *`,
    [current_price, current_value, req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Investment not found');
  return success(res, result.rows[0], 'Price updated');
});

module.exports = {
  list, getPortfolioSummary, getOne, create, update, remove,
  addTransaction, getTransactions, getNotes, addNote, updatePrice,
};
