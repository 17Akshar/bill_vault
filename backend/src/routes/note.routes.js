const router = require('express').Router();
const c = require('../controllers/note.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.patch('/:id/pin', c.togglePin);

module.exports = router;
