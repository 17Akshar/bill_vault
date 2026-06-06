const { pool } = require('../database/pool');
const { success } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const { calculateReturns, calculateSavingsRate } = require('../utils/calculations');

const getOverview = asyncWrapper(async (req, res) => {
  const userId = req.user.id;

  const [netWorthRes, investRes, loanRes, ccRes, rentalRes] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(balance),0) AS bank_balance FROM accounts WHERE user_id=$1 AND is_active=true AND include_in_net_worth=true`,
      [userId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(current_value),0) AS current, COALESCE(SUM(invested_amount),0) AS invested
       FROM investments WHERE user_id=$1 AND status='active'`,
      [userId]
    ),
    pool.query(`SELECT COALESCE(SUM(outstanding),0) AS total FROM loans WHERE user_id=$1 AND status='active'`, [userId]),
    pool.query(`SELECT COALESCE(SUM(outstanding),0) AS total FROM credit_cards WHERE user_id=$1 AND status='active'`, [userId]),
    pool.query(`SELECT COALESCE(SUM(market_value),0) AS value FROM rentals WHERE user_id=$1 AND status='active'`, [userId]),
  ]);

  const bankBal = parseFloat(netWorthRes.rows[0].bank_balance);
  const invCurrent = parseFloat(investRes.rows[0].current);
  const invInvested = parseFloat(investRes.rows[0].invested);
  const loans = parseFloat(loanRes.rows[0].total);
  const cc = parseFloat(ccRes.rows[0].total);
  const rental = parseFloat(rentalRes.rows[0].value);

  const totalAssets = bankBal + invCurrent + rental;
  const totalLiabilities = loans + cc;
  const netWorth = totalAssets - totalLiabilities;

  return success(res, {
    netWorth,
    totalAssets,
    totalLiabilities,
    bankBalance: bankBal,
    investmentValue: invCurrent,
    investedAmount: invInvested,
    investmentReturns: calculateReturns(invInvested, invCurrent),
    loans,
    creditCard: cc,
    rentalValue: rental,
  });
});

const getIncomeExpenseReport = asyncWrapper(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const userId = req.user.id;

  const monthly = await pool.query(
    `SELECT
      EXTRACT(MONTH FROM date) AS month,
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id=$1 AND EXTRACT(YEAR FROM date)=$2
     GROUP BY month ORDER BY month`,
    [userId, year]
  );

  const annual = await pool.query(
    `SELECT
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS total_income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS total_expense,
      COUNT(*) AS transaction_count
     FROM transactions
     WHERE user_id=$1 AND EXTRACT(YEAR FROM date)=$2`,
    [userId, year]
  );

  const a = annual.rows[0];
  const income = parseFloat(a.total_income || 0);
  const expense = parseFloat(a.total_expense || 0);

  return success(res, {
    year: parseInt(year),
    monthly: monthly.rows,
    annual: {
      income,
      expense,
      savings: income - expense,
      savingsRate: calculateSavingsRate(income, expense),
    },
  });
});

const getCategoryInsights = asyncWrapper(async (req, res) => {
  const { year, month, type = 'expense' } = req.query;
  const userId = req.user.id;
  const params = [userId, type];
  let dateFilter = '';
  let i = 3;

  if (month && year) {
    dateFilter = `AND EXTRACT(MONTH FROM date)=$${i++} AND EXTRACT(YEAR FROM date)=$${i++}`;
    params.push(month, year);
  } else if (year) {
    dateFilter = `AND EXTRACT(YEAR FROM date)=$${i++}`;
    params.push(year);
  }

  const result = await pool.query(
    `SELECT
      COALESCE(c.name,'Uncategorized') AS category,
      COALESCE(c.icon,'💰') AS icon,
      COALESCE(c.color,'#8888AA') AS color,
      SUM(t.amount) AS amount,
      COUNT(*) AS count,
      AVG(t.amount) AS avg_amount
     FROM transactions t
     LEFT JOIN categories c ON t.category_id=c.id
     WHERE t.user_id=$1 AND t.type=$2 ${dateFilter}
     GROUP BY c.name, c.icon, c.color
     ORDER BY amount DESC`,
    params
  );

  const total = result.rows.reduce((s, r) => s + parseFloat(r.amount), 0);
  const data = result.rows.map((r) => ({
    ...r,
    percentage: total > 0 ? Math.round((parseFloat(r.amount) / total) * 10000) / 100 : 0,
  }));

  return success(res, { categories: data, total });
});

const getPortfolioAllocation = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    `SELECT category, SUM(current_value) AS value, COUNT(*) AS count
     FROM investments WHERE user_id=$1 AND status='active'
     GROUP BY category ORDER BY value DESC`,
    [req.user.id]
  );

  const total = result.rows.reduce((s, r) => s + parseFloat(r.value || 0), 0);
  const data = result.rows.map((r) => ({
    ...r,
    percentage: total > 0 ? Math.round((parseFloat(r.value) / total) * 10000) / 100 : 0,
  }));

  return success(res, { allocations: data, total });
});

const getSavingsRate = asyncWrapper(async (req, res) => {
  const { months = 12 } = req.query;
  const result = await pool.query(
    `SELECT
      TO_CHAR(date_trunc('month', date), 'YYYY-MM') AS period,
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id=$1 AND date >= NOW() - INTERVAL '${parseInt(months)} months'
     GROUP BY period ORDER BY period ASC`,
    [req.user.id]
  );

  const data = result.rows.map((r) => ({
    ...r,
    savings: parseFloat(r.income) - parseFloat(r.expense),
    rate: calculateSavingsRate(parseFloat(r.income), parseFloat(r.expense)),
  }));

  return success(res, data);
});

const getTopSpending = asyncWrapper(async (req, res) => {
  const { limit = 10, month, year } = req.query;
  const params = [req.user.id, parseInt(limit)];
  let dateFilter = '';
  let i = 3;

  if (month && year) {
    dateFilter = `AND EXTRACT(MONTH FROM date)=$${i++} AND EXTRACT(YEAR FROM date)=$${i++}`;
    params.push(month, year);
  }

  const result = await pool.query(
    `SELECT description, payee, SUM(amount) AS total, COUNT(*) AS count
     FROM transactions
     WHERE user_id=$1 AND type='expense' ${dateFilter}
     GROUP BY description, payee ORDER BY total DESC LIMIT $2`,
    params
  );

  return success(res, result.rows);
});

const getTaxSummary = asyncWrapper(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  const [taxTx, invGains, fdInterest] = await Promise.all([
    pool.query(
      `SELECT SUM(amount) AS total, COUNT(*) AS count
       FROM transactions WHERE user_id=$1 AND is_tax_related=true AND EXTRACT(YEAR FROM date)=$2`,
      [req.user.id, year]
    ),
    pool.query(
      `SELECT category, SUM(current_value - invested_amount) AS gains
       FROM investments WHERE user_id=$1 AND status IN ('sold','matured')
       GROUP BY category`,
      [req.user.id]
    ),
    pool.query(
      `SELECT SUM(i.current_value - fd.principal) AS fd_interest
       FROM investments i
       JOIN fixed_deposits fd ON fd.investment_id=i.id
       WHERE i.user_id=$1 AND i.status='matured'`,
      [req.user.id]
    ),
  ]);

  return success(res, {
    year: parseInt(year),
    taxRelatedTransactions: taxTx.rows[0],
    investmentGains: invGains.rows,
    fdInterest: fdInterest.rows[0]?.fd_interest || 0,
  });
});

module.exports = {
  getOverview, getIncomeExpenseReport, getCategoryInsights,
  getPortfolioAllocation, getSavingsRate, getTopSpending, getTaxSummary,
};
