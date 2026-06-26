/**
 * 后端数据服务客户端（对接 server/ 轻量后端）
 * 前端不直接绑定硬件/数据库，统一通过此服务层调用（符合方案架构原则）。
 */
const BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8787/api'
const TOKEN_KEY = 'psts_api_token'

export function getToken(): string { return localStorage.getItem(TOKEN_KEY) || '' }
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t) }
export function clearToken() { localStorage.removeItem(TOKEN_KEY) }

async function req(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) }
  const tk = getToken()
  if (tk) headers.Authorization = `Bearer ${tk}`
  const res = await fetch(BASE + path, { ...options, headers })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { msg = (await res.json()).error || msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export async function health(): Promise<{ ok: boolean }> {
  return req('/health')
}
export async function login(username: string, password: string) {
  const r = await req('/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  setToken(r.token)
  return r as { token: string; user: string; role: string }
}
export async function getData(coll: string): Promise<any[]> {
  return req('/data/' + coll)
}
export async function putData(coll: string, arr: any[]): Promise<any[]> {
  return req('/data/' + coll, { method: 'PUT', body: JSON.stringify(arr) })
}
export async function postItem(coll: string, row: any): Promise<any[]> {
  return req('/data/' + coll, { method: 'POST', body: JSON.stringify(row) })
}
export async function deleteItem(coll: string, id: string): Promise<any[]> {
  return req(`/data/${coll}/${id}`, { method: 'DELETE' })
}
