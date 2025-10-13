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

export type Harvest = {
  id?: number
  product: number
  date: string
  parcel?: string
  cultivation_type?: 'serre' | 'plein_champ'
  quantity_kg: number
  area_m2: number
  cost_per_m2?: number
  yield_kg_per_m2?: number
  notes?: string
}

export async function listHarvests(params?: { product?: number; date__gte?: string; date__lte?: string; cultivation_type?: 'serre' | 'plein_champ' }) {
  const qs = new URLSearchParams()
  if (params?.product) qs.append('product', String(params.product))
  if (params?.date__gte) qs.append('date__gte', params.date__gte)
  if (params?.date__lte) qs.append('date__lte', params.date__lte)
  if (params?.cultivation_type) qs.append('cultivation_type', params.cultivation_type)
  const path = '/harvests/' + (qs.toString() ? `?${qs.toString()}` : '')
  return http<Harvest[]>(path)
}

export async function createHarvest(payload: Harvest) {
  return http<Harvest>('/harvests/', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateHarvest(id: number, payload: Partial<Harvest>) {
  return http<Harvest>(`/harvests/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export type HarvestAggregateRow = {
  date: string
  sum_quantity_kg: number
  avg_yield_kg_per_m2: number
}

export async function aggregateHarvests(params: { product: number; period: 'day'|'week'|'month'; date__gte?: string; date__lte?: string; cultivation_type?: 'serre'|'plein_champ' }) {
  const qs = new URLSearchParams()
  qs.append('product', String(params.product))
  qs.append('period', params.period)
  if (params.date__gte) qs.append('date__gte', params.date__gte)
  if (params.date__lte) qs.append('date__lte', params.date__lte)
  if (params.cultivation_type) qs.append('cultivation_type', params.cultivation_type)
  return http<HarvestAggregateRow[]>(`/harvests/aggregate/?${qs.toString()}`)
}
