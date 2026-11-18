import { TaskPriority, TaskStatus } from '../types/task.types';

/**
 * MODEL - Entidade Tarefa.
 *
 * Representa uma tarefa como o restante da aplicação a enxerga
 * (nomes em camelCase, datas como objetos Date ou strings YYYY-MM-DD).
 */
export interface Task {
  id: number;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: Date;
  dueDate: string; // YYYY-MM-DD
  completedAt: Date | null;
}

/** Formato da linha retornada pelo PostgreSQL (nomes em snake_case). */
export interface TaskRow {
  id: number;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: Date;
  due_date: string;
  completed_at: Date | null;
}

/** Converte uma linha do banco na entidade do domínio. */
export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    dueDate: row.due_date,
    completedAt: row.completed_at,
  };
}

/** Limites de tamanho dos campos de texto. */
export const TASK_LIMITS = {
  titleMaxLength: 120,
  descriptionMaxLength: 2000,
} as const;
