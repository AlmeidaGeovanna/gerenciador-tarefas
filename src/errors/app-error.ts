import { FieldErrors } from '../types/task.types';

/**
 * Erro de aplicação: carrega o código HTTP e uma mensagem segura para o cliente.
 * O middleware de erros converte estes erros em respostas JSON.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: FieldErrors,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Dados inválidos (400 Bad Request). */
export class ValidationError extends AppError {
  constructor(message: string, details?: FieldErrors) {
    super(400, message, details);
  }
}

/** Recurso inexistente (404 Not Found). */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}
