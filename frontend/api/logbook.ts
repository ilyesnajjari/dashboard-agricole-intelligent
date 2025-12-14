export interface LogCategory {
    id: number
    name: string
    color: string
}

export interface LogEntry {
    id: number
    date: string
    category: number
    category_details: LogCategory
    content: string
    tags: string
    photo?: string | null
}

export interface FrostHoursResult {
    city: string
    start_date: string
    frost_hours: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'

export const fetchLogCategories = async (): Promise<LogCategory[]> => {
    const res = await fetch(`${API_BASE}/log-categories/`)
    if (!res.ok) throw new Error('Failed to fetch categories')
    return res.json()
}

export const fetchLogEntries = async (): Promise<LogEntry[]> => {
    const res = await fetch(`${API_BASE}/logbook/`)
    if (!res.ok) throw new Error('Failed to fetch entries')
    return res.json()
}

export const createLogCategory = async (name: string, color: string): Promise<LogCategory> => {
    const res = await fetch(`${API_BASE}/log-categories/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
    })
    if (!res.ok) throw new Error('Failed to create category')
    return res.json()
}

export const deleteLogCategory = async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/log-categories/${id}/`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete category')
}

export const deleteLogEntry = async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/logbook/${id}/`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete entry')
}

export const createLogEntry = async (formData: FormData): Promise<LogEntry> => {
    const res = await fetch(`${API_BASE}/logbook/`, {
        method: 'POST',
        body: formData,
    })
    if (!res.ok) throw new Error('Failed to create entry')
    return res.json()
}

export const updateLogEntry = async (id: number, formData: FormData): Promise<LogEntry> => {
    const res = await fetch(`${API_BASE}/logbook/${id}/`, {
        method: 'PUT',
        body: formData,
    })
    if (!res.ok) throw new Error('Failed to update entry')
    return res.json()
}

export const getEntryFrostHours = async (id: number, city: string = 'Monteux'): Promise<FrostHoursResult> => {
    const res = await fetch(`${API_BASE}/logbook/${id}/frost-hours/?city=${city}`)
    if (!res.ok) throw new Error('Failed to fetch frost hours')
    return res.json()
}
