/**
 * Funções de apresentação: rótulos, formatação e montagem de HTML.
 * Todo texto vindo do usuário passa por escapeHtml (evita XSS).
 */

export const PRIORITY_LABELS = { low: 'Baixa', medium: 'Média', high: 'Alta' };
export const STATUS_LABELS = { pending: 'Pendente', in_progress: 'Em andamento', completed: 'Concluída' };

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;

/** Data local de hoje no formato YYYY-MM-DD. */
export function todayIso() {
  return toLocalIsoDate(new Date());
}

/** Converte um instante (Date ou ISO) para a data local YYYY-MM-DD. */
export function toLocalIsoDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DD -> DD/MM/AAAA */
export function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/** ISO -> DD/MM/AAAA às HH:MM */
export function formatDateTime(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-BR');
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} às ${time}`;
}

/** Situação do prazo para destaque visual. */
export function dueState(task) {
  if (task.status === 'completed') return null;
  const today = todayIso();
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate === today) return 'today';
  return null;
}

function dueLabel(task) {
  const state = dueState(task);
  if (state === 'overdue') return `Atrasada · ${formatDate(task.dueDate)}`;
  if (state === 'today') return 'Vence hoje';
  return `Prazo ${formatDate(task.dueDate)}`;
}

export function priorityBadge(priority) {
  return `<span class="badge badge--${priority}">${icon('flag')}${PRIORITY_LABELS[priority]}</span>`;
}

export function statusBadge(status) {
  return `<span class="badge badge--${status}">${STATUS_LABELS[status]}</span>`;
}

function statusSelect(task) {
  const options = Object.entries(STATUS_LABELS)
    .map(([value, label]) => `<option value="${value}" ${value === task.status ? 'selected' : ''}>${label}</option>`)
    .join('');
  return `<select class="status-select" data-status="${task.status}" data-id="${task.id}" aria-label="Alterar status">${options}</select>`;
}

/** Card de uma tarefa na listagem. */
export function renderTaskCard(task) {
  const state = dueState(task);
  const dueClass = state ? ` meta-item--${state}` : '';
  return `
    <article class="task-card" data-priority="${task.priority}" data-status="${task.status}">
      <div class="task-card__top">
        ${priorityBadge(task.priority)}
        ${statusSelect(task)}
      </div>
      <h3 class="task-card__title">${escapeHtml(task.title)}</h3>
      <p class="task-card__desc">${escapeHtml(task.description)}</p>
      <div class="task-card__meta">
        <span class="meta-item${dueClass}">${icon(state === 'overdue' ? 'alert' : 'calendar')}${dueLabel(task)}</span>
        <span class="meta-item">${icon('clock')}Criada em ${formatDate(toLocalIsoDate(task.createdAt))}</span>
      </div>
      <div class="task-card__footer">
        <button type="button" class="btn btn--ghost btn--sm" data-action="view" data-id="${task.id}">${icon('eye')}Detalhes</button>
        <div class="task-card__actions">
          <button type="button" class="icon-btn" data-action="edit" data-id="${task.id}" title="Editar" aria-label="Editar tarefa">${icon('edit')}</button>
          <button type="button" class="icon-btn icon-btn--danger" data-action="delete" data-id="${task.id}" title="Excluir" aria-label="Excluir tarefa">${icon('trash')}</button>
        </div>
      </div>
    </article>`;
}

/** Conteúdo do modal de detalhes. */
export function renderDetails(task) {
  return `
    <div class="details">
      <div class="details__badges">${priorityBadge(task.priority)}${statusBadge(task.status)}</div>
      <h4 class="details__title">${escapeHtml(task.title)}</h4>
      <p class="details__desc">${escapeHtml(task.description)}</p>
      <dl class="details__grid">
        <div><dt>Criada em</dt><dd>${formatDateTime(task.createdAt)}</dd></div>
        <div><dt>Prazo</dt><dd>${formatDate(task.dueDate)}</dd></div>
        <div><dt>Concluída em</dt><dd>${task.completedAt ? formatDateTime(task.completedAt) : '—'}</dd></div>
      </dl>
    </div>`;
}

/** Mensagens de sucesso e erro. */
export function showToast(message, type = 'success') {
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' toast--error' : ''}`;
  toast.innerHTML = `${icon(type === 'error' ? 'alert' : 'done')}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

/** Mostra os erros de validação embaixo de cada campo. */
export function setFieldErrors(form, errors) {
  clearFieldErrors(form);
  Object.entries(errors || {}).forEach(([field, message]) => {
    const slot = form.querySelector(`[data-error-for="${field}"]`);
    if (slot) {
      slot.textContent = message;
      slot.closest('.field')?.classList.add('has-error');
    }
  });
}

export function clearFieldErrors(form) {
  form.querySelectorAll('[data-error-for]').forEach((slot) => {
    slot.textContent = '';
    slot.closest('.field')?.classList.remove('has-error');
  });
}
