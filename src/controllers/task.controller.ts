import { Request, Response } from 'express';
import { ValidationError } from '../errors/app-error';
import { TaskService } from '../services/task.service';
import { toTaskListResponse, toTaskResponse } from '../views/task.view';

/**
 * CONTROLLER - Tarefas.
 *
 * Papel: receber a requisição HTTP, chamar o Service e devolver a resposta
 * (código de status + representação JSON produzida pela View).
 * NÃO contém regras de negócio nem SQL.
 *
 * Os métodos são async: no Express 5, qualquer erro lançado aqui é enviado
 * automaticamente ao middleware de erros (sem try/catch repetido).
 */
export class TaskController {
  constructor(private readonly service: TaskService) {}

  /** GET /tasks?status=&priority=&due= */
  list = async (req: Request, res: Response): Promise<void> => {
    const tasks = await this.service.list(req.query);
    res.status(200).json(toTaskListResponse(tasks));
  };

  /** GET /tasks/:id */
  getById = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.getById(parseId(req.params.id));
    res.status(200).json(toTaskResponse(task));
  };

  /** POST /tasks */
  create = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.create(req.body);
    res.status(201).location(`/tasks/${task.id}`).json(toTaskResponse(task));
  };

  /** PUT /tasks/:id */
  update = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.update(parseId(req.params.id), req.body);
    res.status(200).json(toTaskResponse(task));
  };

  /** PATCH /tasks/:id/status */
  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const task = await this.service.updateStatus(parseId(req.params.id), req.body);
    res.status(200).json(toTaskResponse(task));
  };

  /** DELETE /tasks/:id */
  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(parseId(req.params.id));
    res.status(204).end();
  };
}

/** Converte o parâmetro de rota :id em número (validação de formato da requisição). */
function parseId(raw: unknown): number {
  const id = typeof raw === 'string' && /^\d{1,10}$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) {
    throw new ValidationError('O id da tarefa deve ser um número inteiro positivo.');
  }
  return id;
}
