const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'

export async function listUsersForImpersonation() {
  const res = await fetch(`${base}/impersonate/users/`, { credentials: 'include' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function startImpersonation(userId: number) {
  const res = await fetch(`${base}/impersonate/start/`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function stopImpersonation() {
  const res = await fetch(`${base}/impersonate/stop/`, { method: 'POST', credentials: 'include' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
