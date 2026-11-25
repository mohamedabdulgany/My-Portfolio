const jwt = require('jsonwebtoken');
const { ZodError } = require('zod');
const { env } = require('./db');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function requireAdminAuth(req, res, next) {
  const [scheme, token] = (req.header('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, message: 'يلزم تسجيل الدخول بصلاحية الأدمن.' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'لا تملك الصلاحية المطلوبة.' });
    }
    req.admin = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch (_) {
    return res.status(401).json({ ok: false, message: 'جلسة الدخول غير صالحة أو منتهية.' });
  }
}

function createRateLimiter({ windowMs = 60000, max = 30, message = 'طلبات كثيرة، حاول لاحقاً.' }) {
  const buckets = new Map();

  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();

    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const current = buckets.get(key);

    if (!current || now - current.windowStart >= windowMs) {
      buckets.set(key, { windowStart: now, count: 1 });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((windowMs - (now - current.windowStart)) / 1000))));
      return res.status(429).json({ ok: false, message });
    }
    return next();
  };
}

function errorHandler(err, req, res, next) {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, message: 'صيغة JSON غير صالحة.' });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      message: 'بيانات الإدخال غير صالحة.',
      errors: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ ok: false, message: 'المصدر غير مسموح به عبر CORS.' });
  }
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Error]:', err);
  }
  const statusCode = err && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message = statusCode < 500 && err?.publicMessage ? err.publicMessage : 'حدث خطأ في السيرفر.';
  return res.status(statusCode).json({ ok: false, message });
}

module.exports = {
  asyncHandler,
  requireAdminAuth,
  createRateLimiter,
  errorHandler,
};