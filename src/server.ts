import { createApp } from './app';
import { checkDatabaseConnection, pool } from './config/database';
import { env } from './config/env';

/** Ponto de entrada: verifica o banco e inicia o servidor HTTP. */
async function bootstrap(): Promise<void> {
  try {
    await checkDatabaseConnection();
  } catch (error) {
    console.error('Não foi possível conectar ao PostgreSQL. Verifique DATABASE_URL no arquivo .env.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const app = createApp({ db: pool, timeZone: env.timeZone });
  const server = app.listen(env.port, () => {
    console.log(`Servidor rodando em http://localhost:${env.port}`);
  });

  // Encerramento limpo (Ctrl+C)
  const shutdown = () => {
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void bootstrap();
