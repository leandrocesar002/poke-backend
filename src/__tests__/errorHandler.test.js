const { errorHandler } = require('../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    console.error = jest.fn();
  });

  it('should handle axios errors', () => {
    const error = {
      response: {
        status: 404,
        statusText: 'Not Found'
      }
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'External API error',
      details: 'Not Found'
    });
  });

  it('should handle JWT JsonWebTokenError', () => {
    const error = {
      name: 'JsonWebTokenError',
      message: 'Invalid token'
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid token'
    });
  });

  it('should handle JWT TokenExpiredError', () => {
    const error = {
      name: 'TokenExpiredError',
      message: 'Token expired'
    };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Token expired'
    });
  });

  it('should handle generic errors', () => {
    const error = new Error('Generic error');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal server error'
    });
  });

  it('should log error message', () => {
    const error = new Error('Test error');

    errorHandler(error, req, res, next);

    expect(console.error).toHaveBeenCalledWith('Error:', 'Test error');
  });
});

