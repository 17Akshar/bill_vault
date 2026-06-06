const { pool } = require('../database/pool');
const { success } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const { calculateReturns, calculateSavingsRate } = require('../utils/calculations');

const getDashboard = asyncWrapper(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const [
    accountsRes,
    txSummaryRes,
    prevTxSummaryRes,
    investmentsRes,
    loansRes,
    creditCardsRes,
    rentalsRes,
    remindersRes,
    recentTxRes,
    goalsRes,
  ] = await Promise.all([
    pool.query(
      `SELECT account_type, SUM(balance) AS total, COUNT(*) AS count
       FROM accounts WHERE user_id = $1 AND is_active = true AND include_in_net_worth = true
       GROUP BY account_type`,
      [userId]
    ),
    pool.query(
      `SELECT
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
       FROM transactions
       WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
      [userId, month, year]
    ),
    pool.query(
      `SELECT
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
       FROM transactions
       WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
      [userId, prevMonth, prevYear]
    ),
    pool.query(
      `SELECT category, SUM(current_value) AS total, SUM(invested_amount) AS invested, COUNT(*) AS count
       FROM investments WHERE user_id = $1 AND status = 'active'
       GROUP BY category`,
      [userId]
    ),
    pool.query(
      `SELECT SUM(outstanding) AS total, COUNT(*) AS count FROM loans WHERE user_id = $1 AND status = 'active'`,
      [userId]
    ),
    pool.query(
      `SELECT SUM(outstanding) AS total, COUNT(*) AS count FROM credit_cards WHERE user_id = $1 AND status = 'active'`,
      [userId]
    ),
    pool.query(
      `SELECT SUM(market_value) AS total, SUM(monthly_rent) AS monthly_income, COUNT(*) AS count
       FROM rentals WHERE user_id = $1 AND status = 'active'`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(*) AS overdue, SUM(CASE WHEN status='overdue' THEN amount ELSE 0 END) AS overdue_amount
       FROM reminders
       WHERE user_id = $1 AND status IN ('pending','overdue') AND due_date <= NOW() + INTERVAL '7 days'`,
      [userId]
    ),
    pool.query(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
              a.name AS account_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN accounts a ON t.account_id = a.id
       WHERE t.user_id = $1
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT 10`,
      [userId]
    ),
    pool.query(
      `SELECT id, name, target_amount, current_amount, target_date, color, icon, priority, status
       FROM goals WHERE user_id = $1 AND status = 'active'
       ORDER BY priority DESC, target_date ASC LIMIT 5`,
      [userId]
    ),
  ]);

  // Compute net worth
  const accountsTotal = accountsRes.rows.reduce((s, r) => s + parseFloat(r.total || 0), 0);
  const investmentsTotal = investmentsRes.rows.reduce((s, r) => s + parseFloat(r.total || 0), 0);
  const investedTotal = investmentsRes.rows.reduce((s, r) => s + parseFloat(r.invested || 0), 0);
  const rentalsValue = parseFloat(rentalsRes.rows[0]?.total || 0);
  const loansTotal = parseFloat(loansRes.rows[0]?.total || 0);
  const ccTotal = parseFloat(creditCardsRes.rows[0]?.total || 0);

  const totalAssets = accountsTotal + investmentsTotal + rentalsValue;
  const totalLiabilities = loansTotal + ccTotal;
  const netWorth = totalAssets - totalLiabilities;

  const txCurrent = txSummaryRes.rows[0];
  const txPrev = prevTxSummaryRes.rows[0];
  const income = parseFloat(txCurrent.income || 0);
  const expense = parseFloat(txCurrent.expense || 0);
  const prevIncome = parseFloat(txPrev.income || 0);
  const prevExpense = parseFloat(txPrev.expense || 0);

  const savingsRate = calculateSavingsRate(income, expense);
  const investReturns = calculateReturns(investedTotal, investmentsTotal);

  return success(res, {
    netWorth: {
      value: netWorth,
      assets: totalAssets,
      liabilities: totalLiabilities,
    },
    currentMonth: {
      income,
      expense,
      savings: income - expense,
      savingsRate,
      incomeChange: prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 10000) / 100 : 0,
      expenseChange: prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 10000) / 100 : 0,
    },
    accounts: {
      total: accountsTotal,
      count: accountsRes.rows.reduce((s, r) => s + parseInt(r.count), 0),
      breakdown: accountsRes.rows,
    },
    investments: {
      total: investmentsTotal,
      invested: investedTotal,
      returns: investReturns,
      count: investmentsRes.rows.reduce((s, r) => s + parseInt(r.count), 0),
      breakdown: investmentsRes.rows,
    },
    loans: {
      total: loansTotal,
      count: parseInt(loansRes.rows[0]?.count || 0),
    },
    creditCards: {
      total: ccTotal,
      count: parseInt(creditCardsRes.rows[0]?.count || 0),
    },
    rentals: {
      value: rentalsValue,
      monthlyIncome: parseFloat(rentalsRes.rows[0]?.monthly_income || 0),
      count: parseInt(rentalsRes.rows[0]?.count || 0),
    },
    reminders: {
      upcoming: parseInt(remindersRes.rows[0]?.overdue || 0),
      overdueAmount: parseFloat(remindersRes.rows[0]?.overdue_amount || 0),
    },
    recentTransactions: recentTxRes.rows,
    goals: goalsRes.rows,
  }, 'Dashboard fetched');
});

const getNetWorthHistory = asyncWrapper(async (req, res) => {
  const { months = 12 } = req.query;
  const userId = req.user.id;

  // Approximate monthly net worth from running transaction totals
  const result = await pool.query(
    `SELECT
      TO_CHAR(date_trunc('month', date), 'YYYY-MM') AS period,
      SUM(CASE WHEN type='income' THEN amount ELSE -amount END) AS net_flow
     FROM transactions
     WHERE user_id = $1 AND type IN ('income','expense')
       AND date >= NOW() - INTERVAL '${parseInt(months)} months'
     GROUP BY period
     ORDER BY period ASC`,
    [userId]
  );

  return success(res, result.rows, 'Net worth history fetched');
});

module.exports = { getDashboard, getNetWorthHistory };
