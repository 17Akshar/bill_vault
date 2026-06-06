const router = require('express').Router();
const c = require('../controllers/insurance.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.getOne);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.post('/:id/pay-premium', c.payPremium);
router.post('/:id/claims', c.fileClaim);
router.put('/:id/claims/:claimId', c.updateClaim);

module.exports = router;
