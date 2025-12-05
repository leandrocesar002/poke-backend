/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message || err);

  // Axios errors (from PokeAPI)
  if (err.response) {
    return res.status(err.response.status).json({
      success: false,
      error: 'External API error',
      details: err.response.statusText
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
};

module.exports = { errorHandler };


