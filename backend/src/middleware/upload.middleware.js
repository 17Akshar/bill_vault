const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../utils/ApiError');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const ALLOWED_ALL = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES, ...ALLOWED_VIDEO_TYPES];

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

function createStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../../uploads', subfolder);
      require('fs').mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

function fileFilter(allowedTypes) {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest(`File type ${file.mimetype} not allowed`));
    }
  };
}

const uploadImage = multer({
  storage: createStorage('images'),
  limits: { fileSize: MAX_SIZE },
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES),
});

const uploadDocument = multer({
  storage: createStorage('documents'),
  limits: { fileSize: MAX_SIZE },
  fileFilter: fileFilter(ALLOWED_DOC_TYPES),
});

const uploadAny = multer({
  storage: createStorage('files'),
  limits: { fileSize: MAX_SIZE },
  fileFilter: fileFilter(ALLOWED_ALL),
});

module.exports = { uploadImage, uploadDocument, uploadAny };
