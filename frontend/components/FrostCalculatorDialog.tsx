import React, { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Box, Typography, CircularProgress, Alert } from '@mui/material'
import { AcUnit } from '@mui/icons-material'

const CITIES = ['Monteux', 'Pernes-les-Fontaines', 'Carpentras']

interface Props {
    open: boolean
    onClose: () => void
    initialDate?: string
    initialCity?: string
}

export default function FrostCalculatorDialog({ open, onClose, initialDate, initialCity }: Props) {
    const [city, setCity] = useState(initialCity || 'Monteux')
    const [startDate, setStartDate] = useState(initialDate || new Date().toISOString().split('T')[0])
    const [result, setResult] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setCity(initialCity || 'Monteux')
            setStartDate(initialDate ? initialDate.split('T')[0] : new Date().toISOString().split('T')[0])
            setResult(null)
            setError(null)
        }
    }, [open, initialDate, initialCity])

    const handleCalculate = async () => {
        setLoading(true)
        setError(null)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/weather/frost-calculator/?city=${city}&start_date=${startDate}`)
            if (!res.ok) throw new Error('Erreur lors du calcul')
            const data = await res.json()
            setResult(data.frost_hours)
        } catch (err) {
            setError('Impossible de calculer les heures de froid.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AcUnit color="primary" />
                Calculateur de Froid
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        select
                        label="Ville"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        fullWidth
                    >
                        {CITIES.map(c => (
                            <MenuItem key={c} value={c}>{c}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        type="date"
                        label="Date de début (Plantation)"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />

                    {error && <Alert severity="error">{error}</Alert>}

                    {result !== null && (
                        <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 1, textAlign: 'center' }}>
                            <Typography variant="h3" fontWeight="bold">{result}</Typography>
                            <Typography variant="caption">Heures de froid ({'<'} 7.5°C)</Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Fermer</Button>
                <Button onClick={handleCalculate} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Calculer'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
