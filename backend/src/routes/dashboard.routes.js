const router = require('express').Router();
const c = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', c.getDashboard);
router.get('/net-worth-history', c.getNetWorthHistory);

module.exports = router;
