/**
 * Cria a tabela "tasks" executando database/schema.sql.
 * Uso: npm run db:init  (o banco informado em DATABASE_URL precisa existir)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pool } from './database';

async function main(): Promise<void> {
  const schemaPath = path.resolve(__dirname, '..', '..', 'database', 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf-8');
  await pool.query(sql);
  console.log('Banco de dados pronto: tabela "tasks" criada (ou já existente).');
}

main()
  .catch((error: unknown) => {
    console.error('Falha ao criar o banco de dados:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
