const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { pool } = require('../database/pool');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (!result.rows.length) {
      throw ApiError.unauthorized('User not found or deactivated');
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
