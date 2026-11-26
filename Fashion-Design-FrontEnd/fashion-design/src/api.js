/**
 * api.js – thin fetch wrapper
 *
 * All requests go to /api/* which Vite proxies to http://localhost:4000.
 * On non-2xx responses the error body { error } is thrown as an Error.
 */

const BASE = '/api'

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}${path}`, opts)

  if (res.status === 204) return null          // no content

  const data = await res.json()

  if (!res.ok) {
    const err = new Error(data?.error ?? `HTTP ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
}

// ── Convenience resource helpers ────────────────────────────────────────────

export const settingsApi = {
  get:    ()       => api.get('/settings'),
  update: (unit)   => api.put('/settings', { unit }),
}

export const measurementTypesApi = {
  list: () => api.get('/measurement-types'),
}

export const clientsApi = {
  list:   (q = '') => api.get(`/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  get:    (id)     => api.get(`/clients/${id}`),
  create: (body)   => api.post('/clients', body),
  update: (id, body) => api.put(`/clients/${id}`, body),
  delete: (id)     => api.delete(`/clients/${id}`),
}

export const setsApi = {
  create: (clientId, body) => api.post(`/clients/${clientId}/sets`, body),
  get:    (id)             => api.get(`/sets/${id}`),
  update: (id, body)       => api.put(`/sets/${id}`, body),
  delete: (id)             => api.delete(`/sets/${id}`),
}

