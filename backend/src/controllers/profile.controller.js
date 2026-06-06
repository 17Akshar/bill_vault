const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');

const list = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM user_profiles WHERE user_id=$1 ORDER BY is_primary DESC, created_at ASC',
    [req.user.id]
  );
  return success(res, result.rows);
});

const create = asyncWrapper(async (req, res) => {
  const { name, relationship, icon, color } = req.body;
  if (!name) throw ApiError.badRequest('name required');

  const result = await pool.query(
    'INSERT INTO user_profiles (user_id, name, relationship, icon, color) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.user.id, name, relationship, icon, color]
  );
  return created(res, result.rows[0]);
});

const update = asyncWrapper(async (req, res) => {
  const existing = await pool.query(
    'SELECT id FROM user_profiles WHERE id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  );
  if (!existing.rows.length) throw ApiError.notFound('Profile not found');

  const { name, relationship, icon, color } = req.body;
  const result = await pool.query(
    `UPDATE user_profiles SET
      name=COALESCE($1,name), relationship=COALESCE($2,relationship),
      icon=COALESCE($3,icon), color=COALESCE($4,color)
     WHERE id=$5 RETURNING *`,
    [name, relationship, icon, color, req.params.id]
  );
  return success(res, result.rows[0]);
});

const remove = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'DELETE FROM user_profiles WHERE id=$1 AND user_id=$2 AND is_primary=false RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!result.rows.length) throw ApiError.notFound('Profile not found or cannot delete primary');
  return success(res, {}, 'Profile deleted');
});

module.exports = { list, create, update, remove };
