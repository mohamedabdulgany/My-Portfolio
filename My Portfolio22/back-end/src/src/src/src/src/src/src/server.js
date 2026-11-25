const app = require('./app');
const { env, prisma } = require('./db');

const server = app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (_) {}
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => console.error('[Unhandled Rejection]:', reason));
process.on('uncaughtException', (err) => console.error('[Uncaught Exception]:', err));