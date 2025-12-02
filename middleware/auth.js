const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');

const secretKey = process.env.SECRET_KEY || 'your-secret-key'; // Fallback for development

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    logger.warn(`Unauthorized access attempt from IP: ${req.ip}`);
    const error = new Error('Access token required');
    error.statusCode = 401;
    return next(error);
  }
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      logger.warn(`Invalid token from IP: ${req.ip}`);
      const error = new Error('Invalid token');
      error.statusCode = 403;
      return next(error);
    }
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
