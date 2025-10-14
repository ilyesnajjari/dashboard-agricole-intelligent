import { useEffect, useState } from 'react'
import { Box, Button, Paper, TextField, Typography, Alert } from '@mui/material'
import { useRouter } from 'next/router'

export default function SignupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    // If already authenticated, redirect to home (no signup when logged in)
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
        const res = await fetch(base + '/me/', { credentials: 'include' })
        const data = await res.json()
        if (data?.is_authenticated) {
          router.replace('/')
        }
      } catch (e) { /* ignore */ }
    })()
  }, [router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setSuccess(null)
    if (!username.trim()) { setError("Nom d'utilisateur requis"); return }
    if (password.length < 6) { setError('Mot de passe trop court (>=6)'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const res = await fetch(base + '/signup/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password, email: email.trim() })
      })
  const txt = await res.text()
  if (!res.ok) throw new Error(txt || 'Erreur')
  // Backend auto-connects; redirect to home
  setSuccess('Compte créé et connecté. Redirection...')
  setTimeout(() => router.replace('/'), 600)
    } catch (e: any) {
      setError(e?.message ?? 'Erreur')
    } finally { setLoading(false) }
  }

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <Paper sx={{ p:3, width: 360 }}>
        <Typography variant="h5" gutterBottom>Créer un compte</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <form onSubmit={onSubmit}>
          <TextField fullWidth label="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Email (optionnel)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Confirmer le mot de passe" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" fullWidth disabled={loading}>Créer le compte</Button>
        </form>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Déjà un compte ? <a href="/login">Se connecter</a>
        </Typography>
      </Paper>
    </Box>
  )
}
