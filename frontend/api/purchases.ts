const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json' },
    // include cookies for session-based auth (keeps CSRF/session working when frontend talks to backend)
    credentials: 'include',
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || res.statusText)
  }
  if (res.status === 204) return undefined as unknown as T
  return (await res.json()) as T
}

export type Purchase = {
  id?: number
  date: string
  category: number | string
  category_name?: string
  description: string
  amount: number
  notes?: string
  ignored?: boolean
}

export async function listPurchases(params?: Record<string, any>, signal?: AbortSignal) {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : ''
  return http<Purchase[]>(`/purchases/${qs}`, { signal })
}

export function createPurchase(payload: Purchase) {
  return http<Purchase>(`/purchases/`, { method: 'POST', body: JSON.stringify(payload) })
}
export function updatePurchase(id: number, payload: Partial<Purchase>) {
  return http<Purchase>(`/purchases/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) })
}
export function deletePurchase(id: number) {
  return http<void>(`/purchases/${id}/`, { method: 'DELETE' })
}
