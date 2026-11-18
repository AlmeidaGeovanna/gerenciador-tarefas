import { Task } from '../models/task.model';

/**
 * VIEW (representação da API) - define o formato JSON público de uma tarefa.
 *
 * Em uma API REST, a "View" do backend é a representação do recurso:
 * aqui se decide quais campos saem e em que formato. A tela que o usuário vê
 * fica em src/views/public (HTML, CSS e JavaScript), que consome este JSON.
 */
export interface TaskResponse {
  id: number;
  title: string;
  description: string;
  priority: Task['priority'];
  status: Task['status'];
  createdAt: string; // ISO 8601
  dueDate: string; // YYYY-MM-DD
  completedAt: string | null; // ISO 8601
}

export function toTaskResponse(task: Task): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    dueDate: task.dueDate,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  };
}

export function toTaskListResponse(tasks: Task[]): TaskResponse[] {
  return tasks.map(toTaskResponse);
}
