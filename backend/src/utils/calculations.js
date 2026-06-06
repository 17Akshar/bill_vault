/**
 * Calculate EMI (Equated Monthly Installment)
 * P = principal, r = monthly rate (annual_rate/12/100), n = tenure months
 */
function calculateEMI(principal, annualRate, tenureMonths) {
  if (annualRate === 0) return principal / tenureMonths;
  const r = annualRate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
}

/**
 * Calculate loan outstanding balance after n payments
 */
function calculateOutstanding(principal, annualRate, tenureMonths, paidMonths) {
  if (annualRate === 0) return principal - (principal / tenureMonths) * paidMonths;
  const r = annualRate / 12 / 100;
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  const outstanding = principal * Math.pow(1 + r, paidMonths) - emi * ((Math.pow(1 + r, paidMonths) - 1) / r);
  return Math.max(0, Math.round(outstanding * 100) / 100);
}

/**
 * Calculate FD maturity amount (compound interest)
 * principal * (1 + rate/n)^(n*t) where n = compounding frequency
 */
function calculateFDMaturity(principal, annualRate, tenureMonths, compoundingFreq = 4) {
  const t = tenureMonths / 12;
  const r = annualRate / 100;
  const n = compoundingFreq;
  return Math.round(principal * Math.pow(1 + r / n, n * t) * 100) / 100;
}

/**
 * Calculate RD maturity amount
 * M = R * [(1+i)^n - 1] / (1 - (1+i)^(-1/3))
 * R = monthly installment, i = quarterly rate, n = quarters
 */
function calculateRDMaturity(monthlyInstallment, annualRate, tenureMonths) {
  const i = annualRate / 400;
  const n = tenureMonths / 3;
  const maturity = monthlyInstallment * (Math.pow(1 + i, n) - 1) / (1 - Math.pow(1 + i, -1 / 3));
  return Math.round(maturity * 100) / 100;
}

/**
 * Calculate SIP returns
 */
function calculateSIPReturns(monthlyAmount, annualRate, tenureMonths) {
  const r = annualRate / 12 / 100;
  const fv = monthlyAmount * ((Math.pow(1 + r, tenureMonths) - 1) / r) * (1 + r);
  return Math.round(fv * 100) / 100;
}

/**
 * Calculate CAGR
 */
function calculateCAGR(initialValue, finalValue, years) {
  if (initialValue <= 0 || years <= 0) return 0;
  return Math.round((Math.pow(finalValue / initialValue, 1 / years) - 1) * 10000) / 100;
}

/**
 * Calculate absolute and percentage returns
 */
function calculateReturns(invested, current) {
  const absolute = Math.round((current - invested) * 100) / 100;
  const percentage = invested > 0 ? Math.round(((current - invested) / invested) * 10000) / 100 : 0;
  return { absolute, percentage };
}

/**
 * Calculate savings rate
 */
function calculateSavingsRate(income, expenses) {
  if (income <= 0) return 0;
  return Math.round(((income - expenses) / income) * 10000) / 100;
}

/**
 * Calculate net worth
 */
function calculateNetWorth(assets, liabilities) {
  return Math.round((assets - liabilities) * 100) / 100;
}

/**
 * Calculate percentage of budget used
 */
function calculateBudgetUsed(spent, budget) {
  if (budget <= 0) return 0;
  return Math.round((spent / budget) * 10000) / 100;
}

/**
 * Calculate days until due date
 */
function daysUntilDue(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  return diff;
}

/**
 * Format currency for display
 */
function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
}

/**
 * Calculate rental yield
 */
function calculateRentalYield(annualRent, propertyValue) {
  if (propertyValue <= 0) return 0;
  return Math.round((annualRent / propertyValue) * 10000) / 100;
}

module.exports = {
  calculateEMI,
  calculateOutstanding,
  calculateFDMaturity,
  calculateRDMaturity,
  calculateSIPReturns,
  calculateCAGR,
  calculateReturns,
  calculateSavingsRate,
  calculateNetWorth,
  calculateBudgetUsed,
  daysUntilDue,
  formatCurrency,
  calculateRentalYield,
};
