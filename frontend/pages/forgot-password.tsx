import { useState } from 'react'
import { Box, Button, Paper, TextField, Typography, Alert, CircularProgress } from '@mui/material'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [step, setStep] = useState(1) // 1: Username, 2: Answer & New Password
    const [username, setUsername] = useState('')
    const [question, setQuestion] = useState('')
    const [answer, setAnswer] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const onCheckUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true); setError(null)
        try {
            const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(base + '/auth/get-question/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Utilisateur introuvable')

            setQuestion(data.question)
            setStep(2)
        } catch (e: any) {
            setError(e?.message ?? 'Erreur')
        } finally { setLoading(false) }
    }

    const onResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true); setError(null)
        if (newPassword.length < 6) { setError('Mot de passe trop court (>=6)'); setLoading(false); return }

        try {
            const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(base + '/auth/reset-password/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, answer, new_password: newPassword })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Erreur lors de la réinitialisation')

            setSuccess('Mot de passe réinitialisé avec succès. Redirection...')
            setTimeout(() => router.replace('/login'), 1500)
        } catch (e: any) {
            setError(e?.message ?? 'Erreur')
        } finally { setLoading(false) }
    }

    return (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
            <Paper sx={{ p: 3, width: 360 }}>
                <Typography variant="h5" gutterBottom>Récupération de compte</Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                {step === 1 ? (
                    <form onSubmit={onCheckUser}>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Entrez votre nom d'utilisateur pour récupérer votre question de sécurité.
                        </Typography>
                        <TextField fullWidth label="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} sx={{ mb: 2 }} />
                        <Button type="submit" variant="contained" fullWidth disabled={loading}>
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Continuer'}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={onResetPassword}>
                        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                            Question : {question}
                        </Typography>
                        <TextField fullWidth label="Votre réponse" value={answer} onChange={(e) => setAnswer(e.target.value)} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Nouveau mot de passe" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} sx={{ mb: 2 }} />
                        <Button type="submit" variant="contained" fullWidth disabled={loading}>
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Réinitialiser le mot de passe'}
                        </Button>
                    </form>
                )}

                <Typography variant="body2" sx={{ mt: 2 }}>
                    <Link href="/login" style={{ textDecoration: 'none', color: '#1976d2' }}>Retour à la connexion</Link>
                </Typography>
            </Paper>
        </Box>
    )
}
