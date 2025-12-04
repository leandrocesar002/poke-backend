const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'pokemon-secret-key-2024';
const VALID_CREDENTIALS = {
  username: 'admin',
  password: 'admin'
};

/**
 * POST /api/auth/login
 * Validates user credentials and returns JWT token
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid input format'
    });
  }

  // Check credentials
  if (username !== VALID_CREDENTIALS.username || password !== VALID_CREDENTIALS.password) {
    return res.status(401).json({
      success: false,
      error: 'Invalid username or password'
    });
  }

  // Generate JWT token
  const token = jwt.sign(
    { username, loginTime: new Date().toISOString() },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    data: {
      token,
      user: { username }
    }
  });
});

/**
 * POST /api/auth/verify
 * Verifies if token is valid
 */
router.post('/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      success: true,
      data: { user: { username: decoded.username } }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logs out user (client should remove token)
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;


