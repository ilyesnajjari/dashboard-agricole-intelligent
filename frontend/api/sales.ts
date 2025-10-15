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
  return (await res.json()) as T
}

export type Sale = {
  id?: number
  product?: number
  date: string
  market?: string
  quantity_kg?: number
  unit_price?: number
  total_amount?: number
}

export async function listSales(params?: Record<string, string | number>) {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : ''
  return http<Sale[]>(`/sales/${qs}`)
}

export async function createSale(payload: Sale) {
  return http<Sale>('/sales/', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateSale(id: number, payload: Partial<Sale>) {
  return http<Sale>(`/sales/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteSale(id: number) {
  const res = await fetch(base + `/sales/${id}/`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete sale')
}

export type SalesAggregateRow = {
  date: string
  sum_quantity_kg: number
  avg_unit_price: number
  sum_total_amount: number
}

export async function aggregateSales(params: { product?: number, period: 'day'|'week'|'month', fromDate?: string, toDate?: string }) {
  const qs = new URLSearchParams()
  if (typeof params.product !== 'undefined') qs.append('product', String(params.product))
  qs.append('period', params.period)
  if (params.fromDate) qs.append('date__gte', params.fromDate)
  if (params.toDate) qs.append('date__lte', params.toDate)
  return http<SalesAggregateRow[]>(`/sales/aggregate/?${qs.toString()}`)
}
