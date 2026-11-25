const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { env, prisma } = require('./db');
const { asyncHandler, requireAdminAuth, createRateLimiter } = require('./middleware');

const router = express.Router();

const ONLINE_WINDOW_MS = 60 * 1000;
const CLEANUP_WINDOW_MS = 5 * 60 * 1000;

const loginSchema = z
  .object({
    email: z.string().trim().email('البريد الإلكتروني غير صالح').max(120),
    password: z.string().min(6, 'كلمة المرور مطلوبة').max(128),
  })
  .strict();

const trackVisitorSchema = z
  .object({
    sessionId: z.string().trim().min(6, 'معرف الجلسة غير صالح').max(120),
    incrementTotal: z.boolean().optional().default(false),
  })
  .strict();

const createReviewSchema = z
  .object({
    reviewerName: z.string().trim().min(1, 'الاسم مطلوب').max(80),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().min(1, 'التعليق مطلوب').max(500),
  })
  .strict();

const listReviewsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).max(5000).optional().default(0),
  })
  .strict();

const createInquirySchema = z
  .object({
    clientName: z.string().trim().min(1, 'الاسم مطلوب').max(100),
    clientEmail: z.string().trim().email('البريد الإلكتروني غير صالح').max(120),
    projectDetails: z.string().trim().min(5, 'يرجى كتابة تفاصيل واضحة للمشروع').max(2000),
  })
  .strict();

const listInquiriesQuerySchema = z
  .object({
    status: z.enum(['new', 'contacted', 'archived']).optional(),
  })
  .strict();

const inquiryIdParamSchema = z
  .object({
    id: z.string().trim().uuid('معرف الطلب غير صالح'),
  })
  .strict();

const updateInquiryStatusSchema = z
  .object({
    status: z.enum(['new', 'contacted', 'archived']),
  })
  .strict();

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'محاولات تسجيل دخول كثيرة، حاول لاحقاً.',
});

const trackLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60 });
const reviewLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 15 });
const inquiryLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });

async function ensureMetricRow(tx = prisma) {
  await tx.siteMetric.upsert({
    where: { id: 'portfolio' },
    update: {},
    create: { id: 'portfolio', totalVisits: BigInt(0) },
  });
}

router.get(
  '/health',
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      ok: true,
      service: 'portfolio-backend',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  })
);

router.post(
  '/auth/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase();

    const dbAdmin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
    const adminRecord = dbAdmin
      ? { id: dbAdmin.id, email: dbAdmin.email, passwordHash: dbAdmin.passwordHash, role: dbAdmin.role || 'admin' }
      : env.adminEmail && env.adminPasswordHash && normalizedEmail === env.adminEmail
        ? { id: 'env-admin', email: env.adminEmail, passwordHash: env.adminPasswordHash, role: 'admin' }
        : null;

    if (!adminRecord?.passwordHash || !(await bcrypt.compare(password, adminRecord.passwordHash))) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      err.publicMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      throw err;
    }

    const token = jwt.sign(
      { sub: adminRecord.id, email: adminRecord.email, role: adminRecord.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return res.status(200).json({
      ok: true,
      token,
      admin: { id: adminRecord.id, email: adminRecord.email, role: adminRecord.role },
    });
  })
);

router.get(
  '/visitors/stats',
  asyncHandler(async (req, res) => {
    await ensureMetricRow();
    const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
    const [metric, onlineCount] = await Promise.all([
      prisma.siteMetric.findUnique({ where: { id: 'portfolio' } }),
      prisma.activeVisitor.count({ where: { lastSeen: { gte: onlineCutoff } } }),
    ]);
    return res.status(200).json({
      ok: true,
      totalVisits: metric ? Number(metric.totalVisits) : 0,
      onlineNow: Math.max(1, onlineCount),
    });
  })
);

router.post(
  '/visitors/track',
  trackLimiter,
  asyncHandler(async (req, res) => {
    const { sessionId, incrementTotal } = trackVisitorSchema.parse(req.body);
    const now = new Date();
    const cleanupCutoff = new Date(now.getTime() - CLEANUP_WINDOW_MS);
    const onlineCutoff = new Date(now.getTime() - ONLINE_WINDOW_MS);

    const stats = await prisma.$transaction(async (tx) => {
      await ensureMetricRow(tx);
      if (incrementTotal) {
        await tx.siteMetric.update({
          where: { id: 'portfolio' },
          data: { totalVisits: { increment: BigInt(1) } },
        });
      }
      await tx.activeVisitor.upsert({
        where: { sessionId },
        update: { lastSeen: now },
        create: { sessionId, lastSeen: now },
      });
      await tx.activeVisitor.deleteMany({ where: { lastSeen: { lt: cleanupCutoff } } });

      const [metric, onlineCount] = await Promise.all([
        tx.siteMetric.findUnique({ where: { id: 'portfolio' } }),
        tx.activeVisitor.count({ where: { lastSeen: { gte: onlineCutoff } } }),
      ]);

      return {
        totalVisits: metric ? Number(metric.totalVisits) : 0,
        onlineNow: Math.max(1, onlineCount),
      };
    });

    return res.status(200).json({ ok: true, ...stats });
  })
);

router.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const { limit, offset } = listReviewsQuerySchema.parse(req.query);
    const [reviews, aggregate] = await Promise.all([
      prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: { id: true, reviewerName: true, rating: true, comment: true, createdAt: true },
      }),
      prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
    ]);

    const count = aggregate._count._all || 0;
    const avgRating = count > 0 && typeof aggregate._avg.rating === 'number'
      ? Number(aggregate._avg.rating.toFixed(1))
      : 0;

    return res.status(200).json({ ok: true, reviews, summary: { avgRating, count } });
  })
);

router.post(
  '/reviews',
  reviewLimiter,
  asyncHandler(async (req, res) => {
    const data = createReviewSchema.parse(req.body);
    const review = await prisma.review.create({
      data,
      select: { id: true, reviewerName: true, rating: true, comment: true, createdAt: true },
    });
    return res.status(201).json({ ok: true, review });
  })
);

router.post(
  '/inquiries',
  inquiryLimiter,
  asyncHandler(async (req, res) => {
    const data = createInquirySchema.parse(req.body);
    const inquiry = await prisma.projectInquiry.create({
      data,
      select: { id: true, status: true, createdAt: true },
    });
    return res.status(201).json({ ok: true, message: 'تم إرسال تفاصيل مشروعك بنجاح.', inquiry });
  })
);

router.get(
  '/inquiries',
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { status } = listInquiriesQuerySchema.parse(req.query);
    const inquiries = await prisma.projectInquiry.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        clientName: true,
        clientEmail: true,
        projectDetails: true,
        status: true,
        createdAt: true,
      },
    });
    return res.status(200).json({ ok: true, inquiries });
  })
);

router.patch(
  '/inquiries/:id/status',
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { id } = inquiryIdParamSchema.parse(req.params);
    const { status } = updateInquiryStatusSchema.parse(req.body);

    try {
      const inquiry = await prisma.projectInquiry.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          clientName: true,
          clientEmail: true,
          projectDetails: true,
          status: true,
          createdAt: true,
        },
      });
      return res.status(200).json({ ok: true, inquiry });
    } catch (err) {
      if (err?.code === 'P2025') {
        const notFound = new Error('Not found');
        notFound.statusCode = 404;
        notFound.publicMessage = 'طلب المشروع غير موجود.';
        throw notFound;
      }
      throw err;
    }
  })
);

module.exports = router;