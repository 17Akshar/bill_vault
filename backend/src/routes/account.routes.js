const router = require('express').Router();
const c = require('../controllers/account.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', c.list);
router.post('/', c.create);
router.get('/summary', c.getSummary);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.get('/:id/transactions', c.getTransactions);
router.get('/:id/stats', c.getStats);

module.exports = router;
