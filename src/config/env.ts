import 'dotenv/config';

/** Lê e valida as variáveis de ambiente uma única vez, na inicialização. */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Variável de ambiente ${name} não definida. Copie .env.example para .env e preencha os valores.`);
  }
  return value.trim();
}

function validTimeZone(value: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    throw new Error(`APP_TIMEZONE inválido: "${value}". Exemplo de valor válido: America/Sao_Paulo.`);
  }
}

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`PORT inválida: "${process.env.PORT}".`);
}

export const env = {
  port,
  databaseUrl: required('DATABASE_URL'),
  timeZone: validTimeZone(process.env.APP_TIMEZONE?.trim() || 'America/Sao_Paulo'),
} as const;
