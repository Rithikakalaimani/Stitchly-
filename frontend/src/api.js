const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  customers: {
    list: () => request('/customers'),
    get: (id) => request(`/customers/${id}`),
    getOverview: (id) => request(`/customers/${id}/overview`),
    create: (body) => request('/customers', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
    clearAllGarments: (id) => request(`/customers/${id}/garments`, { method: 'DELETE' }),
  },
  orders: {
    list: (params) => request('/orders' + (params ? '?' + new URLSearchParams(params).toString() : '')),
    get: (id) => request(`/orders/${id}`),
    create: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  },
  deliveries: {
    list: (params) => request('/deliveries' + (params ? '?' + new URLSearchParams(params).toString() : '')),
    create: (body) => request('/deliveries', { method: 'POST', body: JSON.stringify(body) }),
  },
  payments: {
    list: (params) => request('/payments' + (params ? '?' + new URLSearchParams(params).toString() : '')),
    create: (body) => request('/payments', { method: 'POST', body: JSON.stringify(body) }),
    applyToBalance: (body) => request('/payments/apply-to-balance', { method: 'POST', body: JSON.stringify(body) }),
  },
  dashboard: {
    get: (params) => request('/dashboard' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  },
  garments: {
    update: (id, body) => request(`/garments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id) => request(`/garments/${id}`, { method: 'DELETE' }),
  },
};
