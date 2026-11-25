require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigins: allowedOrigins,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
};

const globalForPrisma = globalThis;
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = { env, prisma };