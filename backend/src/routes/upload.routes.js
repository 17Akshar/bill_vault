const router = require('express').Router();
const c = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadAny } = require('../middleware/upload.middleware');

router.use(authenticate);
router.post('/', uploadAny.single('file'), c.uploadFile);
router.get('/', c.getUserFiles);
router.delete('/:id', c.deleteFile);

module.exports = router;
