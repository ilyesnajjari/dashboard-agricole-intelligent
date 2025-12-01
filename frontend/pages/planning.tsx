import { useState, useEffect } from 'react'
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, MenuItem, Tooltip } from '@mui/material'
import { Add, Edit, Info } from '@mui/icons-material'

interface CropEvent {
    id: number
    crop_name: string
    month: number
    action_type: 'plant' | 'harvest' | 'care'
    note: string
}

const MONTHS = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
]

const ACTION_COLORS = {
    plant: '#4CAF50', // Green
    harvest: '#F44336', // Red
    care: '#FFC107', // Yellow
}

const ACTION_LABELS = {
    plant: 'Plantation',
    harvest: 'Récolte',
    care: 'Entretien',
}

export default function Planning() {
    const [events, setEvents] = useState<CropEvent[]>([])
    const [crops, setCrops] = useState<string[]>([])
    const [open, setOpen] = useState(false)
    const [selectedCell, setSelectedCell] = useState<{ crop: string, month: number } | null>(null)
    const [editEvent, setEditEvent] = useState<Partial<CropEvent>>({})
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/crop-calendars/`)
            const data = await res.json()
            setEvents(data)

            // Extract unique crops
            const uniqueCrops = Array.from(new Set(data.map((e: CropEvent) => e.crop_name))).sort() as string[]
            setCrops(uniqueCrops)
        } catch (error) {
            console.error('Error fetching planning:', error)
        }
    }

    const handleCellClick = (crop: string, month: number) => {
        setSelectedCell({ crop, month })
        // Find existing event if any (prioritize care > harvest > plant for display if multiple, but usually one per cell)
        // Actually, let's support finding the event to edit
        const existing = events.find(e => e.crop_name === crop && e.month === month + 1)
        setEditEvent(existing || { crop_name: crop, month: month + 1, action_type: 'plant', note: '' })
        setOpen(true)
    }

    const handleSave = async () => {
        if (!editEvent.crop_name || !editEvent.month || !editEvent.action_type) return
        setSubmitting(true)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const method = editEvent.id ? 'PUT' : 'POST'
            const url = editEvent.id ? `${apiBase}/crop-calendars/${editEvent.id}/` : `${apiBase}/crop-calendars/`

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editEvent),
            })

            if (res.ok) {
                setOpen(false)
                fetchEvents()
            }
        } catch (error) {
            console.error('Error saving event:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!editEvent.id) return
        if (!confirm('Supprimer cet événement ?')) return
        setSubmitting(true)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/crop-calendars/${editEvent.id}/`, { method: 'DELETE' })
            if (res.ok) {
                setOpen(false)
                fetchEvents()
            }
        } catch (error) {
            console.error('Error deleting event:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const getEventForCell = (crop: string, monthIndex: number) => {
        // Month index is 0-11, db is 1-12
        return events.find(e => e.crop_name === crop && e.month === monthIndex + 1)
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" fontWeight={700}>
                    🗓️ Planificateur Annuel 2026
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => {
                    setEditEvent({ month: 1, action_type: 'plant', note: '' })
                    setSelectedCell(null)
                    setOpen(true)
                }}>
                    Ajouter une culture
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 'bold', width: 200 }}>Culture</TableCell>
                            {MONTHS.map(m => (
                                <TableCell key={m} align="center" sx={{ fontWeight: 'bold' }}>{m}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {crops.map(crop => (
                            <TableRow key={crop} hover>
                                <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                                    {crop}
                                </TableCell>
                                {MONTHS.map((_, monthIndex) => {
                                    const event = getEventForCell(crop, monthIndex)
                                    return (
                                        <TableCell
                                            key={monthIndex}
                                            align="center"
                                            sx={{
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: 'action.hover' },
                                                borderLeft: '1px solid #eee'
                                            }}
                                            onClick={() => handleCellClick(crop, monthIndex)}
                                        >
                                            {event ? (
                                                <Tooltip title={`${ACTION_LABELS[event.action_type]}${event.note ? ': ' + event.note : ''}`}>
                                                    <Box
                                                        sx={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: '50%',
                                                            bgcolor: ACTION_COLORS[event.action_type],
                                                            mx: 'auto',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontSize: 10,
                                                            boxShadow: 1
                                                        }}
                                                    >
                                                        {event.note && <Info sx={{ fontSize: 14 }} />}
                                                    </Box>
                                                </Tooltip>
                                            ) : (
                                                <Typography variant="caption" color="text.disabled">➖</Typography>
                                            )}
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 4, display: 'flex', gap: 3, justifyContent: 'center' }}>
                <Chip label="Plantation / Semis" sx={{ bgcolor: ACTION_COLORS.plant, color: 'white', fontWeight: 'bold' }} />
                <Chip label="Récolte" sx={{ bgcolor: ACTION_COLORS.harvest, color: 'white', fontWeight: 'bold' }} />
                <Chip label="Entretien / Taille" sx={{ bgcolor: ACTION_COLORS.care, color: 'black', fontWeight: 'bold' }} />
            </Box>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    {editEvent.id ? 'Modifier l\'action' : 'Nouvelle action'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Culture"
                            value={editEvent.crop_name || ''}
                            onChange={(e) => setEditEvent({ ...editEvent, crop_name: e.target.value })}
                            fullWidth
                            helperText="Ex: Tomate, Fraise..."
                        />

                        <TextField
                            select
                            label="Mois"
                            value={editEvent.month || ''}
                            onChange={(e) => setEditEvent({ ...editEvent, month: parseInt(e.target.value) })}
                            fullWidth
                        >
                            {MONTHS.map((m, i) => (
                                <MenuItem key={i} value={i + 1}>{m}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Type d'action"
                            value={editEvent.action_type || 'plant'}
                            onChange={(e) => setEditEvent({ ...editEvent, action_type: e.target.value as any })}
                            fullWidth
                        >
                            <MenuItem value="plant">🟢 Plantation (Vert)</MenuItem>
                            <MenuItem value="harvest">🔴 Récolte (Rouge)</MenuItem>
                            <MenuItem value="care">🟡 Entretien (Jaune)</MenuItem>
                        </TextField>

                        <TextField
                            label="Note / Détails"
                            value={editEvent.note || ''}
                            onChange={(e) => setEditEvent({ ...editEvent, note: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Ex: Taille des gourmands..."
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    {editEvent.id && (
                        <Button onClick={handleDelete} color="error" sx={{ mr: 'auto' }}>
                            Supprimer
                        </Button>
                    )}
                    <Button onClick={() => setOpen(false)}>Annuler</Button>
                    <Button onClick={handleSave} variant="contained" disabled={submitting}>
                        Enregistrer
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
