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

export type Product = {
  id?: number
  name: string
  category: 'fruit' | 'vegetable' | 'other'
  default_unit?: string
  default_price?: number
  is_active?: boolean
}

export async function listProducts() {
  return http<Product[]>('/products/')
}

export async function createProduct(product: Product) {
  return http<Product>('/products/', { method: 'POST', body: JSON.stringify(product) })
}

export async function deleteProduct(id: number) {
  const res = await fetch(base + `/products/${id}/`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete product')
}

export async function updateProduct(id: number, payload: Partial<Product>) {
  return http<Product>(`/products/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) })
}
