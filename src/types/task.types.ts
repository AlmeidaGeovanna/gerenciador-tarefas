/**
 * Tipos compartilhados do domínio "Tarefa".
 *
 * Os valores são armazenados em inglês (padrão das colunas do banco);
 * a interface exibe os rótulos em português:
 *   low = baixa | medium = média | high = alta
 *   pending = pendente | in_progress = em andamento | completed = concluída
 */

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Filtros de prazo aceitos em GET /tasks?due=... */
export const DUE_FILTERS = ['overdue', 'today', 'next7'] as const;
export type DueFilter = (typeof DUE_FILTERS)[number];

/** Dados validados para cadastrar uma tarefa. */
export interface CreateTaskData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string; // formato YYYY-MM-DD
}

/** Dados validados para atualizar uma tarefa (PUT). */
export interface UpdateTaskData extends CreateTaskData {
  status: TaskStatus;
}

/** Critérios de busca já traduzidos pelo Service para o Repository. */
export interface TaskQueryCriteria {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueFrom?: string; // prazo >= dueFrom
  dueTo?: string; // prazo <= dueTo
  dueBefore?: string; // prazo < dueBefore
  excludeCompleted?: boolean;
}

/** Erros de validação por campo: { campo: mensagem }. */
export type FieldErrors = Record<string, string>;
