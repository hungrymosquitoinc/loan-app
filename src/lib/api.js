import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function handleResponse(res) {
  if (res.status === 401) {
    window.location.href = '#/login'
    throw new Error('Session expired')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export async function apiGet(path) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, { headers })
  return handleResponse(res)
}

export async function apiPost(path, body) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function apiPut(path, body) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function apiDelete(path) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse(res)
}
