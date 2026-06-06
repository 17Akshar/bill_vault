const router = require('express').Router();
const c = require('../controllers/reminder.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', c.list);
router.post('/', c.create);
router.get('/summary', c.getSummary);
router.get('/calendar', c.getCalendar);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.post('/:id/pay', c.markPaid);

module.exports = router;
