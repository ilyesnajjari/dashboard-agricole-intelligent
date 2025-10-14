import { useEffect, useState } from 'react'
import { Box, Button, Paper, TextField, Typography, Alert } from '@mui/material'
import { useRouter } from 'next/router'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If already authenticated, redirect to home
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
        const res = await fetch(base + '/me/', { credentials: 'include' })
        const data = await res.json()
        if (data?.is_authenticated) {
          router.replace('/')
        }
      } catch (e) {
        // ignore
      }
    })()
  }, [router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const res = await fetch(base + '/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })
  if (!res.ok) throw new Error(await res.text())
      // Wait until /me reflects authenticated state (cookie write can be async)
      const start = Date.now()
      let ok = false
      while (Date.now() - start < 3000) {
        try {
          const r = await fetch(base + '/me/', { credentials: 'include' })
          const d = await r.json()
          if (d?.is_authenticated) { ok = true; break }
        } catch {}
        await new Promise(res => setTimeout(res, 200))
      }
      router.replace('/')
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de connexion')
    } finally { setLoading(false) }
  }

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <Paper sx={{ p:3, width: 360 }}>
        <Typography variant="h5" gutterBottom>Connexion</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={onSubmit}>
          <TextField fullWidth label="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" fullWidth disabled={loading}>Se connecter</Button>
        </form>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Pas de compte ? <a href="/signup">Créer un compte</a>
        </Typography>
      </Paper>
    </Box>
  )
}
