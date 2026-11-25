const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const { prisma } = require('../src/db');

let adminToken = '';
let inquiryId = '';

beforeAll(async () => {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.TEST_ADMIN_PASSWORD || 'AdminPass123!';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash, role: 'admin' },
    create: { email, passwordHash, role: 'admin' },
  });

  const login = await request(app).post('/api/auth/login').send({ email, password });
  expect(login.statusCode).toBe(200);
  adminToken = login.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Portfolio Backend API', () => {
  test('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('POST /api/visitors/track', async () => {
    const res = await request(app)
      .post('/api/visitors/track')
      .send({ sessionId: 'sess_test_12345', incrementTotal: true });
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('POST & GET /api/reviews', async () => {
    const bad = await request(app).post('/api/reviews').send({ reviewerName: '', rating: 9, comment: '' });
    expect(bad.statusCode).toBe(400);

    const ok = await request(app)
      .post('/api/reviews')
      .send({ reviewerName: 'مراجع', rating: 5, comment: 'ممتاز' });
    expect(ok.statusCode).toBe(201);

    const list = await request(app).get('/api/reviews');
    expect(list.statusCode).toBe(200);
    expect(Array.isArray(list.body.reviews)).toBe(true);
  });

  test('POST, GET & PATCH /api/inquiries', async () => {
    const unauth = await request(app).get('/api/inquiries');
    expect(unauth.statusCode).toBe(401);

    const created = await request(app).post('/api/inquiries').send({
      clientName: 'عميل',
      clientEmail: 'client@example.com',
      projectDetails: 'تفاصيل مشروع كاملة للاختبار.',
    });
    expect(created.statusCode).toBe(201);
    inquiryId = created.body.inquiry.id;

    const list = await request(app)
      .get('/api/inquiries')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.statusCode).toBe(200);

    const patched = await request(app)
      .patch(`/api/inquiries/${inquiryId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'contacted' });
    expect(patched.statusCode).toBe(200);
    expect(patched.body.inquiry.status).toBe('contacted');
  });
});