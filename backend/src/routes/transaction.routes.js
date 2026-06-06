const router = require('express').Router();
const c = require('../controllers/transaction.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', c.list);
router.post('/', c.create);
router.get('/summary', c.getSummary);
router.get('/category-breakdown', c.getCategoryBreakdown);
router.get('/monthly-trend', c.getMonthlyTrend);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;
