import { ApiError, TaskApi } from './api.js';
import {
  clearFieldErrors,
  renderDetails,
  renderTaskCard,
  setFieldErrors,
  showToast,
  toLocalIsoDate,
  todayIso,
} from './ui.js';

/**
 * Comportamento da página (View no navegador).
 * Captura as ações do usuário, chama a API e redesenha a tela.
 * As regras de negócio continuam no backend: a checagem feita aqui
 * serve apenas para dar retorno imediato ao usuário.
 */

const el = {
  todayLabel: document.getElementById('today-label'),
  list: document.getElementById('task-list'),
  empty: document.getElementById('empty-state'),
  emptyTitle: document.getElementById('empty-title'),
  emptyText: document.getElementById('empty-text'),
  loading: document.getElementById('loading'),
  listCount: document.getElementById('list-count'),
  filters: document.getElementById('filters'),
  clearFilters: document.getElementById('clear-filters'),
  createForm: document.getElementById('create-form'),
  editForm: document.getElementById('edit-form'),
  detailsDialog: document.getElementById('details-dialog'),
  detailsBody: document.getElementById('details-body'),
  editDialog: document.getElementById('edit-dialog'),
  deleteDialog: document.getElementById('delete-dialog'),
  deleteName: document.getElementById('delete-task-name'),
  confirmDelete: document.getElementById('confirm-delete'),
};

let pendingDeleteId = null;

/** Campo de formulário pelo atributo name (evita conflito com form.id / form.title). */
const field = (form, name) => form.elements.namedItem(name);

// ------------------------------------------------------------ carregamento

function currentFilters() {
  const data = new FormData(el.filters);
  return { status: data.get('status'), priority: data.get('priority'), due: data.get('due') };
}

function hasActiveFilters(filters) {
  return Boolean(filters.status || filters.priority || filters.due);
}

function updateStats(allTasks) {
  const count = (status) => allTasks.filter((t) => t.status === status).length;
  document.getElementById('stat-total').textContent = allTasks.length;
  document.getElementById('stat-pending').textContent = count('pending');
  document.getElementById('stat-in_progress').textContent = count('in_progress');
  document.getElementById('stat-completed').textContent = count('completed');
}

function renderList(tasks, filtered) {
  el.listCount.textContent = tasks.length;
  el.list.innerHTML = tasks.map(renderTaskCard).join('');
  el.empty.hidden = tasks.length > 0;
  if (tasks.length === 0) {
    el.emptyTitle.textContent = filtered ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa cadastrada';
    el.emptyText.textContent = filtered
      ? 'Ajuste ou limpe os filtros para ver outras tarefas.'
      : 'Use o formulário para criar sua primeira tarefa.';
  }
}

async function loadTasks() {
  const filters = currentFilters();
  const filtered = hasActiveFilters(filters);
  el.clearFilters.hidden = !filtered;
  el.loading.hidden = false;
  try {
    // O resumo considera todas as tarefas; a lista respeita os filtros.
    const [allTasks, visibleTasks] = filtered
      ? await Promise.all([TaskApi.list(), TaskApi.list(filters)])
      : await TaskApi.list().then((tasks) => [tasks, tasks]);
    updateStats(allTasks);
    renderList(visibleTasks, filtered);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    el.loading.hidden = true;
  }
}

// ------------------------------------------------------------- formulários

function readTaskForm(form) {
  const data = new FormData(form);
  const task = {
    title: String(data.get('title') || '').trim(),
    description: String(data.get('description') || '').trim(),
    priority: data.get('priority'),
    dueDate: data.get('dueDate') || '',
  };
  if (data.has('status')) task.status = data.get('status');
  return task;
}

/** Checagem rápida no navegador (o backend valida de novo). */
function quickValidate(task, minDate) {
  const errors = {};
  if (!task.title) errors.title = 'O título é obrigatório.';
  if (!task.description) errors.description = 'A descrição é obrigatória.';
  if (!task.dueDate) errors.dueDate = 'O prazo de conclusão é obrigatório.';
  else if (minDate && task.dueDate < minDate) errors.dueDate = 'O prazo não pode ser anterior à data de criação.';
  return errors;
}

function handleApiError(form, error) {
  if (error instanceof ApiError && error.details) setFieldErrors(form, error.details);
  showToast(error.message, 'error');
}

async function withSubmitting(form, action) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await action();
  } finally {
    button.disabled = false;
  }
}

function resetCreateForm() {
  el.createForm.reset();
  clearFieldErrors(el.createForm);
  const today = todayIso();
  field(el.createForm, 'dueDate').min = today;
  field(el.createForm, 'dueDate').value = today;
}

el.createForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const task = readTaskForm(el.createForm);
  const errors = quickValidate(task, todayIso());
  if (Object.keys(errors).length) return setFieldErrors(el.createForm, errors);

  withSubmitting(el.createForm, async () => {
    try {
      await TaskApi.create(task);
      showToast('Tarefa cadastrada com sucesso.');
      resetCreateForm();
      await loadTasks();
    } catch (error) {
      handleApiError(el.createForm, error);
    }
  });
});

el.editForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const id = field(el.editForm, 'id').value;
  const task = readTaskForm(el.editForm);
  const errors = quickValidate(task, field(el.editForm, 'dueDate').min);
  if (Object.keys(errors).length) return setFieldErrors(el.editForm, errors);

  withSubmitting(el.editForm, async () => {
    try {
      await TaskApi.update(id, task);
      el.editDialog.close();
      showToast('Tarefa atualizada com sucesso.');
      await loadTasks();
    } catch (error) {
      handleApiError(el.editForm, error);
    }
  });
});

// --------------------------------------------------------- ações dos cards

async function openDetails(id) {
  try {
    const task = await TaskApi.get(id);
    el.detailsBody.innerHTML = renderDetails(task);
    el.detailsDialog.showModal();
  } catch (error) {
    showToast(error.message, 'error');
    if (error.status === 404) loadTasks();
  }
}

async function openEdit(id) {
  try {
    const task = await TaskApi.get(id);
    const form = el.editForm;
    clearFieldErrors(form);
    field(form, 'id').value = task.id;
    field(form, 'title').value = task.title;
    field(form, 'description').value = task.description;
    field(form, 'priority').value = task.priority;
    field(form, 'status').value = task.status;
    field(form, 'dueDate').value = task.dueDate;
    field(form, 'dueDate').min = toLocalIsoDate(task.createdAt); // prazo >= data de criação
    el.editDialog.showModal();
  } catch (error) {
    showToast(error.message, 'error');
    if (error.status === 404) loadTasks();
  }
}

function openDelete(id) {
  const card = el.list.querySelector(`[data-action="delete"][data-id="${id}"]`)?.closest('.task-card');
  el.deleteName.textContent = card ? `"${card.querySelector('.task-card__title').textContent}"` : '';
  pendingDeleteId = id;
  el.deleteDialog.showModal();
}

el.confirmDelete.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  el.confirmDelete.disabled = true;
  try {
    await TaskApi.remove(pendingDeleteId);
    showToast('Tarefa excluída com sucesso.');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    el.confirmDelete.disabled = false;
    pendingDeleteId = null;
    el.deleteDialog.close();
    await loadTasks();
  }
});

el.list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'view') openDetails(id);
  if (action === 'edit') openEdit(id);
  if (action === 'delete') openDelete(id);
});

el.list.addEventListener('change', async (event) => {
  const select = event.target.closest('.status-select');
  if (!select) return;
  select.disabled = true;
  try {
    await TaskApi.updateStatus(select.dataset.id, select.value);
    showToast('Status atualizado.');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    await loadTasks();
  }
});

// ------------------------------------------------------- filtros e modais

el.filters.addEventListener('change', loadTasks);
el.filters.addEventListener('reset', () => setTimeout(loadTasks, 0));

document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    // Fecha ao clicar no botão "fechar/cancelar" ou fora do conteúdo
    if (event.target.closest('[data-close]') || event.target === dialog) dialog.close();
  });
});

// ------------------------------------------------------------------ início

el.todayLabel.textContent = new Date().toLocaleDateString('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
resetCreateForm();
loadTasks();
