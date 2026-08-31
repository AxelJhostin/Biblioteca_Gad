import { env } from './config/env.js';
import { createApp } from './app.js';

const app = createApp();
const { loansService, db } = app.locals.dependencies;

await loansService.markOverdue();
const overdueTimer = setInterval(() => loansService.markOverdue().catch(console.error), 60 * 60 * 1000);
overdueTimer.unref();

const server = app.listen(env.PORT, () => {
  console.log(`Biblioteca Municipal API disponible en http://localhost:${env.PORT}`);
});

async function shutdown(signal) {
  console.log(`${signal}: cerrando API...`);
  clearInterval(overdueTimer);
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

