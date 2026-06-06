const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../database/pool');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/ApiResponse');
const asyncWrapper = require('../utils/asyncWrapper');
const v = require('../validations/auth.validation');

function generateTokens(userId) {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { token, refreshToken };
}

const register = asyncWrapper(async (req, res) => {
  const { error, value } = v.register.validate(req.body);
  if (error) throw ApiError.badRequest(error.details[0].message);

  const { name, email, password, currency } = value;

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) throw ApiError.conflict('Email already registered');

  const password_hash = await bcrypt.hash(password, 12);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, currency)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, currency, created_at`,
      [name, email, password_hash, currency]
    );
    const user = userRes.rows[0];

    // Create primary profile
    await client.query(
      `INSERT INTO user_profiles (user_id, name, is_primary) VALUES ($1, $2, true)`,
      [user.id, name]
    );

    await client.query('COMMIT');

    const { token, refreshToken } = generateTokens(user.id);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [user.id, refreshToken]
    );

    return created(res, { user, token, refreshToken }, 'Account created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const login = asyncWrapper(async (req, res) => {
  const { error, value } = v.login.validate(req.body);
  if (error) throw ApiError.badRequest(error.details[0].message);

  const { email, password } = value;

  const result = await pool.query(
    'SELECT id, name, email, role, currency, password_hash, is_active FROM users WHERE email = $1',
    [email]
  );

  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.is_active) throw ApiError.unauthorized('Account deactivated');

  const { password_hash, ...userSafe } = user;
  const { token, refreshToken } = generateTokens(user.id);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [user.id, refreshToken]
  );

  return success(res, { user: userSafe, token, refreshToken }, 'Login successful');
});

const refreshTokenHandler = asyncWrapper(async (req, res) => {
  const { error, value } = v.refreshToken.validate(req.body);
  if (error) throw ApiError.badRequest(error.details[0].message);

  const { refreshToken } = value;

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const stored = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
    [refreshToken, decoded.userId]
  );
  if (!stored.rows.length) throw ApiError.unauthorized('Refresh token expired or revoked');

  await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

  const { token: newToken, refreshToken: newRefresh } = generateTokens(decoded.userId);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [decoded.userId, newRefresh]
  );

  return success(res, { token: newToken, refreshToken: newRefresh }, 'Token refreshed');
});

const logout = asyncWrapper(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  }
  return success(res, {}, 'Logged out successfully');
});

const getMe = asyncWrapper(async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, email, role, currency, avatar_url, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  return success(res, result.rows[0], 'User fetched');
});

const updateMe = asyncWrapper(async (req, res) => {
  const { name, currency, avatar_url } = req.body;
  const result = await pool.query(
    `UPDATE users SET
      name = COALESCE($1, name),
      currency = COALESCE($2, currency),
      avatar_url = COALESCE($3, avatar_url)
     WHERE id = $4
     RETURNING id, name, email, role, currency, avatar_url`,
    [name, currency, avatar_url, req.user.id]
  );
  return success(res, result.rows[0], 'Profile updated');
});

const changePassword = asyncWrapper(async (req, res) => {
  const { error, value } = v.changePassword.validate(req.body);
  if (error) throw ApiError.badRequest(error.details[0].message);

  const { currentPassword, newPassword } = value;

  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

  return success(res, {}, 'Password changed. Please login again.');
});

module.exports = { register, login, refreshToken: refreshTokenHandler, logout, getMe, updateMe, changePassword };
