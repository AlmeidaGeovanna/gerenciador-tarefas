import type { Pool } from 'pg';
import { Task, TaskRow, toTask } from '../models/task.model';
import { CreateTaskData, TaskQueryCriteria, TaskStatus, UpdateTaskData } from '../types/task.types';

/**
 * MODEL (acesso a dados) - Repository de tarefas.
 *
 * É a ÚNICA parte da aplicação que escreve SQL. Todas as consultas usam
 * parâmetros ($1, $2...), o que impede injeção de SQL.
 * Não contém regras de negócio: apenas lê e grava o que o Service pede.
 */

/** Contrato usado pelo Service (permite trocar a implementação em testes). */
export interface TaskRepository {
  findAll(criteria: TaskQueryCriteria): Promise<Task[]>;
  findById(id: number): Promise<Task | null>;
  create(data: CreateTaskData): Promise<Task>;
  update(id: number, data: UpdateTaskData, completedAt: Date | null): Promise<Task | null>;
  updateStatus(id: number, status: TaskStatus, completedAt: Date | null): Promise<Task | null>;
  delete(id: number): Promise<boolean>;
}

/** Qualquer objeto com o método query do driver "pg" (o Pool da aplicação). */
export type Queryable = Pick<Pool, 'query'>;

const COLUMNS = 'id, title, description, priority, status, created_at, due_date, completed_at';

export class PgTaskRepository implements TaskRepository {
  constructor(private readonly db: Queryable) {}

  async findAll(criteria: TaskQueryCriteria): Promise<Task[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    // Cada filtro adiciona uma condição com seu próprio parâmetro numerado.
    const add = (sql: string, value: unknown) => {
      params.push(value);
      conditions.push(sql.replace('?', `$${params.length}`));
    };

    if (criteria.status) add('status = ?', criteria.status);
    if (criteria.priority) add('priority = ?', criteria.priority);
    if (criteria.dueFrom) add('due_date >= ?', criteria.dueFrom);
    if (criteria.dueTo) add('due_date <= ?', criteria.dueTo);
    if (criteria.dueBefore) add('due_date < ?', criteria.dueBefore);
    if (criteria.excludeCompleted) conditions.push(`status <> 'completed'`);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Ordem: tarefas abertas primeiro, depois prazo mais próximo.
    const { rows } = await this.db.query(
      `SELECT ${COLUMNS}
         FROM tasks
         ${where}
        ORDER BY CASE status WHEN 'completed' THEN 1 ELSE 0 END,
                 due_date ASC,
                 id DESC`,
      params,
    );
    return (rows as TaskRow[]).map(toTask);
  }

  async findById(id: number): Promise<Task | null> {
    const { rows } = await this.db.query(`SELECT ${COLUMNS} FROM tasks WHERE id = $1`, [id]);
    return rows[0] ? toTask(rows[0] as TaskRow) : null;
  }

  async create(data: CreateTaskData): Promise<Task> {
    const { rows } = await this.db.query(
      `INSERT INTO tasks (title, description, priority, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [data.title, data.description, data.priority, data.dueDate],
    );
    return toTask(rows[0] as TaskRow);
  }

  async update(id: number, data: UpdateTaskData, completedAt: Date | null): Promise<Task | null> {
    const { rows } = await this.db.query(
      `UPDATE tasks
          SET title = $1, description = $2, priority = $3, due_date = $4,
              status = $5, completed_at = $6
        WHERE id = $7
        RETURNING ${COLUMNS}`,
      [data.title, data.description, data.priority, data.dueDate, data.status, completedAt, id],
    );
    return rows[0] ? toTask(rows[0] as TaskRow) : null;
  }

  async updateStatus(id: number, status: TaskStatus, completedAt: Date | null): Promise<Task | null> {
    const { rows } = await this.db.query(
      `UPDATE tasks SET status = $1, completed_at = $2 WHERE id = $3 RETURNING ${COLUMNS}`,
      [status, completedAt, id],
    );
    return rows[0] ? toTask(rows[0] as TaskRow) : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query('DELETE FROM tasks WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
