const router = require('express').Router();
const c = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/overview', c.getOverview);
router.get('/income-expense', c.getIncomeExpenseReport);
router.get('/categories', c.getCategoryInsights);
router.get('/portfolio-allocation', c.getPortfolioAllocation);
router.get('/savings-rate', c.getSavingsRate);
router.get('/top-spending', c.getTopSpending);
router.get('/tax-summary', c.getTaxSummary);

module.exports = router;
