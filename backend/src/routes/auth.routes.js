const router = require('express').Router();
const c = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/register', c.register);
router.post('/login', c.login);
router.post('/refresh', c.refreshToken);
router.post('/logout', c.logout);
router.get('/me', authenticate, c.getMe);
router.put('/me', authenticate, c.updateMe);
router.put('/change-password', authenticate, c.changePassword);

module.exports = router;
