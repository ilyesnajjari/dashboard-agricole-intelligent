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

export type AccountingEntry = {
  id?: number
  date: string
  type: 'income'|'expense'
  label: string
  amount: number
}

export function listEntries(params?: { date__gte?: string; date__lte?: string; type?: 'income'|'expense' }) {
  const qs = new URLSearchParams()
  if (params?.date__gte) qs.append('date__gte', params.date__gte)
  if (params?.date__lte) qs.append('date__lte', params.date__lte)
  if (params?.type) qs.append('type', params.type)
  return http<AccountingEntry[]>(`/accounting/${qs.toString() ? `?${qs.toString()}` : ''}`)
}

export function createEntry(payload: AccountingEntry) {
  return http<AccountingEntry>(`/accounting/`, { method: 'POST', body: JSON.stringify(payload) })
}
export function updateEntry(id: number, payload: Partial<AccountingEntry>) {
  return http<AccountingEntry>(`/accounting/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) })
}
export function deleteEntry(id: number) {
  return http<void>(`/accounting/${id}/`, { method: 'DELETE' })
}
