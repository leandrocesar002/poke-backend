const request = require('supertest');
const app = require('../index');

describe('Auth Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should return token with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.username).toBe('admin');
    });

    it('should reject invalid username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wrong', password: 'admin' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid username or password');
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Username and password are required');
    });

    it('should reject missing username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/verify', () => {
    let validToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin' });
      validToken = res.body.data.token;
    });

    it('should verify valid token', async () => {
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ token: validToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('admin');
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ token: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing token', async () => {
      const res = await request(app)
        .post('/api/auth/verify')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});


