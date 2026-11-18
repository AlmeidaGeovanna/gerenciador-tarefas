import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';

/** Rotas inexistentes: 404 em JSON. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
}

/**
 * Tratamento CENTRALIZADO de erros.
 * Converte erros conhecidos em respostas HTTP e esconde detalhes internos
 * (mensagens do banco, stack trace) do cliente.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // Erros da aplicação (validação, não encontrado...)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Erros do leitor de JSON do Express (corpo malformado ou grande demais)
  const bodyError = err as { type?: string; status?: number };
  if (bodyError?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'O corpo da requisição não é um JSON válido.' });
    return;
  }
  if (bodyError?.type === 'entity.too.large') {
    res.status(413).json({ error: 'O corpo da requisição é grande demais.' });
    return;
  }

  // Qualquer outro erro: registra no servidor e responde de forma genérica
  console.error('[erro interno]', err);
  res.status(500).json({ error: 'Erro interno do servidor. Tente novamente mais tarde.' });
}
