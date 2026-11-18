import { NotFoundError, ValidationError } from '../errors/app-error';
import { Task, TASK_LIMITS } from '../models/task.model';
import { TaskRepository } from '../repositories/task.repository';
import {
  CreateTaskData,
  DUE_FILTERS,
  DueFilter,
  FieldErrors,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskPriority,
  TaskQueryCriteria,
  TaskStatus,
  UpdateTaskData,
} from '../types/task.types';
import { addDays, dateInTimeZone, isValidIsoDate } from '../utils/date';

/**
 * MODEL (regras de negócio) - Service de tarefas.
 *
 * Concentra TODAS as regras do domínio:
 *  - título e descrição obrigatórios;
 *  - prioridade apenas low | medium | high (baixa, média, alta);
 *  - status apenas pending | in_progress | completed;
 *  - prazo não pode ser anterior à data de criação;
 *  - toda tarefa nasce com status "pending";
 *  - completed_at é preenchido ao concluir e limpo ao reabrir.
 *
 * Não conhece HTTP (req/res) nem SQL: recebe dados, valida e usa o Repository.
 */

export interface TaskServiceOptions {
  timeZone: string;
  /** Relógio injetável, útil em testes. */
  now?: () => Date;
}

type Payload = Record<string, unknown>;

export class TaskService {
  private readonly timeZone: string;
  private readonly now: () => Date;

  constructor(
    private readonly repository: TaskRepository,
    options: TaskServiceOptions,
  ) {
    this.timeZone = options.timeZone;
    this.now = options.now ?? (() => new Date());
  }

  // ---------------------------------------------------------------- consultas

  async list(query: unknown): Promise<Task[]> {
    return this.repository.findAll(this.parseFilters(query));
  }

  async getById(id: number): Promise<Task> {
    const task = await this.repository.findById(id);
    if (!task) throw new NotFoundError('Tarefa não encontrada.');
    return task;
  }

  // ------------------------------------------------------------------ escrita

  async create(payload: unknown): Promise<Task> {
    const body = this.asObject(payload);
    const errors: FieldErrors = {};
    const data = this.readCommonFields(body, errors);

    // Na criação, a "data de criação" é hoje.
    const today = this.today();
    if (data.dueDate && !errors.dueDate && data.dueDate < today) {
      errors.dueDate = 'O prazo não pode ser anterior à data de criação.';
    }
    this.throwIfInvalid(errors);

    // O status inicial é sempre "pending" (definido pelo banco).
    return this.repository.create(data as CreateTaskData);
  }

  async update(id: number, payload: unknown): Promise<Task> {
    const body = this.asObject(payload);
    const errors: FieldErrors = {};
    const data = this.readCommonFields(body, errors);
    const status = this.readStatus(body.status, errors);
    this.throwIfInvalid(errors);

    const current = await this.getById(id);
    const createdOn = dateInTimeZone(current.createdAt, this.timeZone);
    if (data.dueDate! < createdOn) {
      throw new ValidationError('Dados inválidos.', {
        dueDate: `O prazo não pode ser anterior à data de criação (${this.formatBr(createdOn)}).`,
      });
    }

    const completedAt = this.resolveCompletedAt(current, status!);
    const updated = await this.repository.update(id, { ...(data as CreateTaskData), status: status! }, completedAt);
    if (!updated) throw new NotFoundError('Tarefa não encontrada.');
    return updated;
  }

  async updateStatus(id: number, payload: unknown): Promise<Task> {
    const body = this.asObject(payload);
    const errors: FieldErrors = {};
    const status = this.readStatus(body.status, errors);
    this.throwIfInvalid(errors);

    const current = await this.getById(id);
    const completedAt = this.resolveCompletedAt(current, status!);
    const updated = await this.repository.updateStatus(id, status!, completedAt);
    if (!updated) throw new NotFoundError('Tarefa não encontrada.');
    return updated;
  }

  async delete(id: number): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError('Tarefa não encontrada.');
  }

  // ---------------------------------------------------------- regras internas

  /** completed_at: mantém se já estava concluída, preenche ao concluir, limpa ao reabrir. */
  private resolveCompletedAt(current: Task, nextStatus: TaskStatus): Date | null {
    if (nextStatus !== 'completed') return null;
    return current.status === 'completed' && current.completedAt ? current.completedAt : this.now();
  }

  /** Converte a query string em critérios de busca para o Repository. */
  private parseFilters(query: unknown): TaskQueryCriteria {
    const q = (query && typeof query === 'object' ? query : {}) as Payload;
    const errors: FieldErrors = {};
    const criteria: TaskQueryCriteria = {};

    const status = this.optionalString(q.status);
    if (status !== undefined) {
      if (this.isOneOf(status, TASK_STATUSES)) criteria.status = status;
      else errors.status = `Status inválido. Use: ${TASK_STATUSES.join(', ')}.`;
    }

    const priority = this.optionalString(q.priority);
    if (priority !== undefined) {
      if (this.isOneOf(priority, TASK_PRIORITIES)) criteria.priority = priority;
      else errors.priority = `Prioridade inválida. Use: ${TASK_PRIORITIES.join(', ')}.`;
    }

    const due = this.optionalString(q.due);
    if (due !== undefined) {
      if (this.isOneOf(due, DUE_FILTERS)) Object.assign(criteria, this.dueCriteria(due));
      else errors.due = `Filtro de prazo inválido. Use: ${DUE_FILTERS.join(', ')}.`;
    }

    this.throwIfInvalid(errors, 'Filtros inválidos.');
    return criteria;
  }

  /** Traduz o filtro de prazo em intervalo de datas. */
  private dueCriteria(due: DueFilter): TaskQueryCriteria {
    const today = this.today();
    switch (due) {
      case 'overdue': // prazo vencido e ainda não concluída
        return { dueBefore: today, excludeCompleted: true };
      case 'today':
        return { dueFrom: today, dueTo: today };
      case 'next7': // de hoje até daqui a 7 dias
        return { dueFrom: today, dueTo: addDays(today, 7) };
    }
  }

  /** Lê e valida título, descrição, prioridade e prazo. */
  private readCommonFields(body: Payload, errors: FieldErrors): Partial<CreateTaskData> {
    const data: Partial<CreateTaskData> = {};

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) errors.title = 'O título é obrigatório.';
    else if (title.length > TASK_LIMITS.titleMaxLength)
      errors.title = `O título deve ter no máximo ${TASK_LIMITS.titleMaxLength} caracteres.`;
    else data.title = title;

    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description) errors.description = 'A descrição é obrigatória.';
    else if (description.length > TASK_LIMITS.descriptionMaxLength)
      errors.description = `A descrição deve ter no máximo ${TASK_LIMITS.descriptionMaxLength} caracteres.`;
    else data.description = description;

    if (this.isOneOf(body.priority, TASK_PRIORITIES)) data.priority = body.priority as TaskPriority;
    else errors.priority = 'A prioridade deve ser baixa, média ou alta (low, medium, high).';

    const dueDate = typeof body.dueDate === 'string' ? body.dueDate.trim() : '';
    if (!dueDate) errors.dueDate = 'O prazo de conclusão é obrigatório.';
    else if (!isValidIsoDate(dueDate)) errors.dueDate = 'O prazo deve ser uma data válida no formato AAAA-MM-DD.';
    else data.dueDate = dueDate;

    return data;
  }

  private readStatus(value: unknown, errors: FieldErrors): TaskStatus | undefined {
    if (this.isOneOf(value, TASK_STATUSES)) return value as TaskStatus;
    errors.status = 'O status deve ser pendente, em andamento ou concluída (pending, in_progress, completed).';
    return undefined;
  }

  // ------------------------------------------------------------- utilitários

  private asObject(payload: unknown): Payload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ValidationError('O corpo da requisição deve ser um objeto JSON.');
    }
    return payload as Payload;
  }

  private optionalString(value: unknown): string | undefined {
    if (value === undefined || value === '') return undefined;
    return typeof value === 'string' ? value : String(value);
  }

  private isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
    return typeof value === 'string' && (allowed as readonly string[]).includes(value);
  }

  private throwIfInvalid(errors: FieldErrors, message = 'Dados inválidos.'): void {
    if (Object.keys(errors).length > 0) throw new ValidationError(message, errors);
  }

  private today(): string {
    return dateInTimeZone(this.now(), this.timeZone);
  }

  private formatBr(isoDate: string): string {
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }
}
