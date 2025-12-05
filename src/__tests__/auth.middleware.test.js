const { authMiddleware } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next() with valid token', () => {
    req.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockReturnValue({ username: 'admin' });

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
    expect(req.user).toEqual({ username: 'admin' });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 if no authorization header', () => {
    req.headers.authorization = undefined;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication required'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if authorization header does not start with Bearer', () => {
    req.headers.authorization = 'Invalid token';

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication required'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', () => {
    req.headers.authorization = 'Bearer invalid-token';
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired token'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should extract token correctly from Bearer header', () => {
    req.headers.authorization = 'Bearer my-token-123';
    jwt.verify.mockReturnValue({ username: 'admin' });

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('my-token-123', expect.any(String));
    expect(next).toHaveBeenCalled();
  });
});

