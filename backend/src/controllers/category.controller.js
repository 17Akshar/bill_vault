const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');

const list = asyncWrapper(async (req, res) => {
  const { type } = req.query;
  let query = `
    SELECT * FROM categories
    WHERE (user_id = $1 OR is_default = true)
  `;
  const params = [req.user.id];
  if (type) { query += ` AND type = $2`; params.push(type); }
  query += ' ORDER BY is_default DESC, name ASC';

  const result = await pool.query(query, params);
  return success(res, result.rows);
});

const create = asyncWrapper(async (req, res) => {
  const { name, type, icon, color } = req.body;
  if (!name || !type) throw ApiError.badRequest('name and type required');

  const result = await pool.query(
    'INSERT INTO categories (user_id, name, type, icon, color) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.user.id, name, type, icon, color]
  );
  return created(res, result.rows[0], 'Category created');
});

const update = asyncWrapper(async (req, res) => {
  const existing = await pool.query(
    'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Category not found or cannot edit default');

  const { name, icon, color } = req.body;
  const result = await pool.query(
    `UPDATE categories SET
      name = COALESCE($1, name),
      icon = COALESCE($2, icon),
      color = COALESCE($3, color)
     WHERE id = $4 RETURNING *`,
    [name, icon, color, req.params.id]
  );
  return success(res, result.rows[0], 'Category updated');
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'DELETE FROM categories WHERE id = $1 AND user_id = $2 AND is_default = false RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Category not found or cannot delete default');
  return success(res, {}, 'Category deleted');
});

module.exports = { list, create, update, remove };
