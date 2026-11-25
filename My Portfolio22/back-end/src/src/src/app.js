const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { env } = require('./db');
const apiRoutes = require('./routes');
const { errorHandler } = require('./middleware');

const swaggerSpec = {
  openapi: '3.0.3',
  info: { title: 'Portfolio API', version: '1.0.0' },
  paths: {
    '/api/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/api/auth/login': { post: { summary: 'Admin login', responses: { 200: { description: 'OK' } } } },
    '/api/visitors/stats': { get: { summary: 'Visitor stats', responses: { 200: { description: 'OK' } } } },
    '/api/visitors/track': { post: { summary: 'Track visitor', responses: { 200: { description: 'OK' } } } },
    '/api/reviews': {
      get: { summary: 'List reviews', responses: { 200: { description: 'OK' } } },
      post: { summary: 'Create review', responses: { 201: { description: 'Created' } } },
    },
    '/api/inquiries': {
      post: { summary: 'Create inquiry', responses: { 201: { description: 'Created' } } },
      get: { summary: 'List inquiries (Admin)', responses: { 200: { description: 'OK' } } },
    },
    '/api/inquiries/{id}/status': {
      patch: { summary: 'Update inquiry status (Admin)', responses: { 200: { description: 'OK' } } },
    },
  },
};

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '64kb' }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', apiRoutes);

app.use((req, res) => {
  return res.status(404).json({ ok: false, message: 'المسار غير موجود.' });
});

app.use(errorHandler);

module.exports = app;