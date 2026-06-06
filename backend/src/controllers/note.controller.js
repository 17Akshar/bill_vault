const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created, paginated } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const { note: noteV } = require('../validations/common.validation');

const list = asyncWrapper(async (req, res) => {
  const { search, tag, note_type, is_pinned, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = 'WHERE user_id = $1';
  const params = [req.user.id];
  let i = 2;

  if (note_type) { where += ` AND note_type = $${i++}`; params.push(note_type); }
  if (is_pinned === 'true') { where += ' AND is_pinned = true'; }
  if (tag) { where += ` AND $${i++} = ANY(tags)`; params.push(tag); }
  if (search) {
    where += ` AND (title ILIKE $${i++} OR content ILIKE $${i - 1})`;
    params.push(`%${search}%`);
  }

  const countRes = await pool.query(`SELECT COUNT(*) FROM notes ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT * FROM notes ${where} ORDER BY is_pinned DESC, updated_at DESC LIMIT $${i++} OFFSET $${i}`,
    params
  );
  return paginated(res, result.rows, total, page, limit);
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Note not found');
  return success(res, result.rows[0]);
});

const create = asyncWrapper(async (req, res) => {
  const { error, value } = noteV.validate(req.body, { stripUnknown: true });
  if (error) throw ApiError.badRequest(error.details[0].message);

  const result = await pool.query(
    `INSERT INTO notes (user_id, title, content, note_type, tags, is_pinned, is_locked, reminder_at, color)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.user.id, value.title, value.content, value.note_type, value.tags,
     value.is_pinned, value.is_locked, value.reminder_at, value.color]
  );
  return created(res, result.rows[0], 'Note created');
});

const update = asyncWrapper(async (req, res) => {
  const existing = await pool.query(
    'SELECT id FROM notes WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Note not found');

  const fields = [];
  const params = [];
  let i = 1;
  for (const [key, val] of Object.entries(req.body)) {
    if (val !== undefined) { fields.push(`${key} = $${i++}`); params.push(val); }
  }
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE notes SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return success(res, result.rows[0], 'Note updated');
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Note not found');
  return success(res, {}, 'Note deleted');
});

const togglePin = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'UPDATE notes SET is_pinned = NOT is_pinned WHERE id = $1 AND user_id = $2 RETURNING id, is_pinned',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Note not found');
  return success(res, result.rows[0]);
});

module.exports = { list, getOne, create, update, remove, togglePin };
