const router = require('express').Router();
const c = require('../controllers/credit-card.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.get('/:id/transactions', c.getTransactions);
router.post('/:id/transactions', c.addTransaction);
router.post('/:id/payment', c.makePayment);

module.exports = router;
