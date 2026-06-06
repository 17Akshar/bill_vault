const router = require('express').Router();
const c = require('../controllers/rental.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.post('/:id/transactions', c.recordRent);
router.get('/:id/transactions', c.getTransactions);

module.exports = router;
