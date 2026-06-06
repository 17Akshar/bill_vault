const router = require('express').Router();
const c = require('../controllers/loan.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', c.list);
router.post('/', c.create);
router.get('/insights', c.getInsights);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.post('/:id/transactions', c.addTransaction);

module.exports = router;
