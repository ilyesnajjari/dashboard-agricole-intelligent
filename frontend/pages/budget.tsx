import { useState, useEffect } from 'react'
import { Box, Typography, Paper, Switch, FormControlLabel, Alert, Snackbar, Button, CircularProgress } from '@mui/material'
import { Save, Backup } from '@mui/icons-material'

export default function BudgetPage() {
    const [enabled, setEnabled] = useState(false)
    const [lastBackup, setLastBackup] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState<{ open: boolean, msg: string, severity: 'success' | 'error' | 'info' }>({ open: false, msg: '', severity: 'success' })

    useEffect(() => {
        loadPreferences()
    }, [])

    const loadPreferences = async () => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/email-preferences/`, { credentials: 'include' })
            const data = await res.json()
            if (data && data.length > 0) {
                setEnabled(data[0].weekly_report_enabled || false)
                setLastBackup(data[0].last_backup_at)
            }
        } catch (error) {
            console.error('Error loading preferences:', error)
        }
    }

    const handleTriggerBackup = async () => {
        setLoading(true)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/email-preferences/trigger_local_backup/`, {
                method: 'POST',
                credentials: 'include'
            })
            const data = await res.json()
            if (res.ok) {
                setToast({ open: true, msg: data.detail || 'Sauvegarde effectuée', severity: 'success' })
                loadPreferences() // Reload to get updated timestamp
            } else {
                throw new Error(data.detail || 'Erreur sauvegarde')
            }
        } catch (error: any) {
            setToast({ open: true, msg: 'Erreur: ' + (error?.message || ''), severity: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const getRes = await fetch(`${apiBase}/email-preferences/`, { credentials: 'include' })
            const existing = await getRes.json()

            const payload = {
                weekly_report_enabled: enabled,
            }

            let res
            if (existing && existing.length > 0) {
                res = await fetch(`${apiBase}/email-preferences/${existing[0].id}/`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                })
            } else {
                res = await fetch(`${apiBase}/email-preferences/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                })
            }

            if (res.ok) {
                setToast({ open: true, msg: 'Préférences enregistrées', severity: 'success' })
            } else {
                throw new Error('Erreur enregistrement')
            }
        } catch (error: any) {
            setToast({ open: true, msg: 'Erreur: ' + (error?.message || ''), severity: 'error' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box p={3} display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="80vh">
            <Typography variant="h4" gutterBottom>Sauvegardes</Typography>

            <Paper sx={{ p: 4, mt: 3, maxWidth: 500, width: '100%', textAlign: 'center' }}>
                <Backup sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>Sauvegarde Automatique</Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    Activez cette option pour que vos données soient automatiquement sauvegardées chaque semaine sur votre Bureau (Dossier 'Backups_Dashboard_Agricole').
                </Typography>

                {lastBackup && (
                    <Alert severity="success" sx={{ mb: 3, justifyContent: 'center' }}>
                        Dernière sauvegarde : {new Date(lastBackup).toLocaleString('fr-FR')}
                    </Alert>
                )}

                <Button
                    variant="outlined"
                    color="primary"
                    sx={{ mb: 3 }}
                    onClick={handleTriggerBackup}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Sauvegarder maintenant'}
                </Button>

                <Box display="flex" justifyContent="center" mb={3}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                                size="medium"
                            />
                        }
                        label={enabled ? "Activé" : "Désactivé"}
                        sx={{ transform: 'scale(1.2)' }}
                    />
                </Box>

                <Button
                    variant="contained"
                    size="large"
                    startIcon={!loading && <Save />}
                    onClick={handleSave}
                    disabled={loading}
                    fullWidth
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Enregistrer'}
                </Button>
            </Paper>

            <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(s => ({ ...s, open: false }))}>
                <Alert onClose={() => setToast(s => ({ ...s, open: false }))} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    )
}
