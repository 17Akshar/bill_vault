const router = require('express').Router();
const c = require('../controllers/investment.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', c.list);
router.post('/', c.create);
router.get('/portfolio', c.getPortfolioSummary);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.patch('/:id/price', c.updatePrice);
router.get('/:id/transactions', c.getTransactions);
router.post('/:id/transactions', c.addTransaction);
router.get('/:id/notes', c.getNotes);
router.post('/:id/notes', c.addNote);

module.exports = router;
