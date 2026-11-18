/**
 * Cliente da API REST.
 * A View (navegador) conversa com o backend SOMENTE por estas funções HTTP;
 * ela não conhece Controller, Service, Repository nem banco de dados.
 */

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details || null;
  }
}

async function request(method, url, body) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique se ele está em execução.', 0);
  }

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError((data && data.error) || 'Ocorreu um erro inesperado.', response.status, data && data.details);
  }
  return data;
}

export const TaskApi = {
  /** GET /tasks com filtros opcionais { status, priority, due } */
  list(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    return request('GET', query ? `/tasks?${query}` : '/tasks');
  },
  get(id) {
    return request('GET', `/tasks/${id}`);
  },
  create(data) {
    return request('POST', '/tasks', data);
  },
  update(id, data) {
    return request('PUT', `/tasks/${id}`, data);
  },
  updateStatus(id, status) {
    return request('PATCH', `/tasks/${id}/status`, { status });
  },
  remove(id) {
    return request('DELETE', `/tasks/${id}`);
  },
};
