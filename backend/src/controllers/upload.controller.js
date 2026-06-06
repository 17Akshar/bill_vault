const path = require('path');
const { pool } = require('../database/pool');
const { success } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const ApiError = require('../utils/ApiError');

const uploadFile = asyncWrapper(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');

  const { entity_type, entity_id } = req.body;
  const uploadsRoot = path.join(__dirname, '../../uploads');
  const fileUrl = '/uploads/' + path.relative(uploadsRoot, req.file.path);

  const result = await pool.query(
    `INSERT INTO file_uploads (user_id, filename, original_name, mime_type, file_size, url, entity_type, entity_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, req.file.filename, req.file.originalname,
     req.file.mimetype, req.file.size, fileUrl, entity_type, entity_id]
  );

  return success(res, result.rows[0], 'File uploaded');
});

const getUserFiles = asyncWrapper(async (req, res) => {
  const { entity_type, entity_id } = req.query;
  let query = 'SELECT * FROM file_uploads WHERE user_id=$1';
  const params = [req.user.id];
  let i = 2;

  if (entity_type) { query += ` AND entity_type=$${i++}`; params.push(entity_type); }
  if (entity_id) { query += ` AND entity_id=$${i++}`; params.push(entity_id); }
  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return success(res, result.rows);
});

const deleteFile = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'DELETE FROM file_uploads WHERE id=$1 AND user_id=$2 RETURNING filename, url',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('File not found');

  // Physical deletion handled separately to keep it simple
  return success(res, {}, 'File deleted');
});

module.exports = { uploadFile, getUserFiles, deleteFile };
