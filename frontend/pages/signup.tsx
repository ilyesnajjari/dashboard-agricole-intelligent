import { useEffect, useState } from 'react'
import { Box, Button, Paper, TextField, Typography, Alert, CircularProgress } from '@mui/material'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
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
    if (!question.trim() || !answer.trim()) { setError('Question de sécurité et réponse requises'); return }

    setLoading(true)
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const res = await fetch(base + '/signup/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password, question: question.trim(), answer: answer.trim() })
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
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <Paper sx={{ p: 3, width: 360 }}>
        <Typography variant="h5" gutterBottom>Créer un compte</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <form onSubmit={onSubmit}>
          <TextField fullWidth label="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} sx={{ mb: 2 }} />

          <TextField fullWidth label="Question de sécurité (ex: Nom de mon chien)" value={question} onChange={(e) => setQuestion(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Réponse" value={answer} onChange={(e) => setAnswer(e.target.value)} sx={{ mb: 2 }} />

          <TextField fullWidth label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Confirmer le mot de passe" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" fullWidth disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Créer le compte'}
          </Button>
        </form>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Déjà un compte ? <Link href="/login" style={{ textDecoration: 'none', color: '#1976d2' }}>Se connecter</Link>
        </Typography>
      </Paper>
    </Box>
  )
}

