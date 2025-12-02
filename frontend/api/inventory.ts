const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'

export interface InventoryCategory {
    id: number
    name: string
    icon: string
}

export interface InventoryItem {
    id?: number
    name: string
    category: number
    category_name?: string
    quantity: number
    unit?: string
    description?: string
    dimensions?: string
    status: 'available' | 'in_use' | 'maintenance' | 'broken'
    purchase_date?: string
    value?: number
}

export async function listCategories(): Promise<InventoryCategory[]> {
    const res = await fetch(`${API_BASE}/inventory-categories/`, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to fetch categories')
    return res.json()
}

export async function createCategory(data: Partial<InventoryCategory>): Promise<InventoryCategory> {
    const res = await fetch(`${API_BASE}/inventory-categories/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to create category')
    return res.json()
}

export async function deleteCategory(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/inventory-categories/${id}/`, {
        method: 'DELETE',
        credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to delete category')
}

export async function listItems(params: any = {}): Promise<InventoryItem[]> {
    const qs = new URLSearchParams(params).toString()
    const res = await fetch(`${API_BASE}/inventory-items/?${qs}`, { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to fetch items')
    return res.json()
}

export async function createItem(data: InventoryItem): Promise<InventoryItem> {
    const res = await fetch(`${API_BASE}/inventory-items/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to create item')
    return res.json()
}

export async function updateItem(id: number, data: Partial<InventoryItem>): Promise<InventoryItem> {
    const res = await fetch(`${API_BASE}/inventory-items/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to update item')
    return res.json()
}

export async function deleteItem(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/inventory-items/${id}/`, {
        method: 'DELETE',
        credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to delete item')
}
