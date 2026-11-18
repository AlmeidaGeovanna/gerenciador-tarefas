import { Pool, types } from 'pg';
import { env } from './env';

// Colunas DATE (OID 1082) chegam como texto "YYYY-MM-DD", sem conversão de fuso.
types.setTypeParser(1082, (value: string) => value);

/** Pool de conexões compartilhado pela aplicação. */
export const pool = new Pool({ connectionString: env.databaseUrl });

/** Testa a conexão na inicialização do servidor. */
export async function checkDatabaseConnection(): Promise<void> {
  await pool.query('SELECT 1');
}
