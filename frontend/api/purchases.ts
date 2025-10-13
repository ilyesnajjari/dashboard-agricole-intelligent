const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json' },
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
  category: 'tools'|'inputs'|'other'
  description: string
  amount: number
  notes?: string
}

export async function listPurchases(params?: { date__gte?: string; date__lte?: string; category?: string }) {
  const qs = new URLSearchParams()
  if (params?.date__gte) qs.append('date__gte', params.date__gte)
  if (params?.date__lte) qs.append('date__lte', params.date__lte)
  if (params?.category) qs.append('category', params.category)
  return http<Purchase[]>(`/purchases/${qs.toString() ? `?${qs.toString()}` : ''}`)
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
