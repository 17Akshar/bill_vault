const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');

const list = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    `SELECT *, current_value AS value FROM other_assets WHERE user_id = $1 AND status != 'sold' ORDER BY created_at DESC`,
    [req.user.id]
  );
  return success(res, result.rows);
});

const getOne = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'SELECT *, current_value AS value FROM other_assets WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Asset not found');
  return success(res, result.rows[0]);
});

const create = asyncWrapper(async (req, res) => {
  const { asset_type, name, description, purchase_value, current_value, purchase_date, location, notes } = req.body;
  if (!asset_type || !name) throw ApiError.badRequest('asset_type and name are required');
  const result = await pool.query(
    `INSERT INTO other_assets (user_id, asset_type, name, description, purchase_value, current_value, purchase_date, location, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *, current_value AS value`,
    [req.user.id, asset_type, name, description || null, purchase_value || null, current_value || purchase_value || null, purchase_date || null, location || null, notes || null]
  );
  return created(res, result.rows[0], 'Asset added');
});

const update = asyncWrapper(async (req, res) => {
  const existing = await pool.query('SELECT id FROM other_assets WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!existing.rows.length) throw ApiError.notFound('Asset not found');
  const { asset_type, name, description, purchase_value, current_value, purchase_date, location, notes, status } = req.body;
  const result = await pool.query(
    `UPDATE other_assets SET
      asset_type = COALESCE($3, asset_type),
      name = COALESCE($4, name),
      description = COALESCE($5, description),
      purchase_value = COALESCE($6, purchase_value),
      current_value = COALESCE($7, current_value),
      purchase_date = COALESCE($8, purchase_date),
      location = COALESCE($9, location),
      notes = COALESCE($10, notes),
      status = COALESCE($11, status)
     WHERE id = $1 AND user_id = $2
     RETURNING *, current_value AS value`,
    [req.params.id, req.user.id, asset_type, name, description, purchase_value, current_value, purchase_date, location, notes, status]
  );
  return success(res, result.rows[0], 'Asset updated');
});

const remove = asyncWrapper(async (req, res) => {
  const existing = await pool.query('SELECT id FROM other_assets WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!existing.rows.length) throw ApiError.notFound('Asset not found');
  await pool.query('UPDATE other_assets SET status = $1 WHERE id = $2', ['sold', req.params.id]);
  return success(res, null, 'Asset removed');
});

module.exports = { list, getOne, create, update, remove };
