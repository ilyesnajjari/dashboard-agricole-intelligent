import { useState, useEffect } from 'react'
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, MenuItem, Tooltip, Tabs, Tab } from '@mui/material'
import { Add, Edit, Info, Delete as DeleteIcon } from '@mui/icons-material'
import TreatmentCalendar from '../components/TreatmentCalendar'
import DoseConverter from '../components/DoseConverter'

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
    const [tabValue, setTabValue] = useState(0)
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
        // When clicking a cell, prepare to add a new event (don't auto-select an existing one)
        // The dialog will show existing events and allow adding a new one
        setEditEvent({ crop_name: crop, month: month + 1, action_type: 'plant', note: '' })
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

    const handleDeleteCrop = async (cropName: string) => {
        if (!confirm(`Supprimer toutes les actions pour "${cropName}" ?`)) return
        setSubmitting(true)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            // Delete all events for this crop
            const cropEvents = events.filter(e => e.crop_name === cropName)
            await Promise.all(
                cropEvents.map(event =>
                    fetch(`${apiBase}/crop-calendars/${event.id}/`, { method: 'DELETE' })
                )
            )
            fetchEvents()
        } catch (error) {
            console.error('Error deleting crop:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleRenameCrop = async (oldName: string) => {
        const newName = window.prompt("Entrez le nouveau nom pour la culture :", oldName)
        if (!newName || newName.trim() === '' || newName === oldName) return

        setSubmitting(true)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'

            // Rename in Crop Calendars
            const cropEvents = events.filter(e => e.crop_name === oldName)
            await Promise.all(
                cropEvents.map(event =>
                    fetch(`${apiBase}/crop-calendars/${event.id}/`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ crop_name: newName.trim() })
                    })
                )
            )

            // Rename in Treatment Calendars to maintain consistency
            try {
                const treatRes = await fetch(`${apiBase}/treatment-calendars/`)
                if (treatRes.ok) {
                    const treatData = await treatRes.json()
                    const matchingTreats = treatData.filter((t: any) => t.crop_name === oldName)
                    await Promise.all(
                        matchingTreats.map((t: any) =>
                            fetch(`${apiBase}/treatment-calendars/${t.id}/`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ crop_name: newName.trim() })
                            })
                        )
                    )
                }
            } catch (e) { console.error('Error renaming treatments', e) }

            fetchEvents()
        } catch (error) {
            console.error('Error renaming crop:', error)
            alert("Erreur lors du renommage.")
        } finally {
            setSubmitting(false)
        }
    }

    const getEventsForCell = (crop: string, monthIndex: number) => {
        // Month index is 0-11, db is 1-12
        return events.filter(e => e.crop_name === crop && e.month === monthIndex + 1)
    }

    // Component to display multiple specific action indicators
    const MultiColorIndicator = ({ events }: { events: CropEvent[] }) => {
        if (events.length === 0) return null

        return (
            <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                {events.map((event, index) => (
                    <Tooltip key={`${event.id}-${index}`} title={`${ACTION_LABELS[event.action_type]}${event.note ? ': ' + event.note : ''}`}>
                        <Box
                            sx={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                bgcolor: ACTION_COLORS[event.action_type],
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: 9,
                                boxShadow: 1,
                                border: '1px solid rgba(0,0,0,0.1)',
                                cursor: 'pointer'
                            }}
                        >
                            {event.note ? <Info sx={{ fontSize: 13 }} /> : ''}
                        </Box>
                    </Tooltip>
                ))}
            </Stack>
        )
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight={700}>
                    Planning Annuel
                </Typography>
            </Box>

            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
                <Tab label="Calendrier Cultural" />
                <Tab label="Calendrier Phytosanitaire" />
                <Tab label="Convertisseur de Doses" />
            </Tabs>

            {tabValue === 0 ? (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
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
                                <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100' }}>
                                    <TableCell sx={{ fontWeight: 'bold', width: 200, color: 'text.primary' }}>Culture</TableCell>
                                    {MONTHS.map(m => (
                                        <TableCell key={m} align="center" sx={{ fontWeight: 'bold', color: 'text.primary' }}>{m}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {crops.map(crop => (
                                    <TableRow key={crop} hover>
                                        <TableCell component="th" scope="row" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span>{crop}</span>
                                                <Box>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleRenameCrop(crop)
                                                        }}
                                                    >
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleDeleteCrop(crop)
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        {MONTHS.map((_, monthIndex) => {
                                            const cellEvents = getEventsForCell(crop, monthIndex)
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
                                                    {cellEvents.length > 0 ? (
                                                        <MultiColorIndicator events={cellEvents} />
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
                </>
            ) : tabValue === 1 ? (
                <TreatmentCalendar crops={crops} onCropsUpdate={setCrops} />
            ) : (
                <DoseConverter />
            )}

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editEvent.id ? 'Modifier l\'action' : selectedCell ? `${selectedCell.crop} - ${MONTHS[selectedCell.month]}` : 'Nouvelle action'}
                </DialogTitle>
                <DialogContent>
                    {/* Show existing events for this cell */}
                    {selectedCell && !editEvent.id && (() => {
                        const existingEvents = getEventsForCell(selectedCell.crop, selectedCell.month)
                        return existingEvents.length > 0 ? (
                            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    Actions existantes :
                                </Typography>
                                <Stack spacing={1}>
                                    {existingEvents.map(evt => (
                                        <Box key={evt.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                                            <Box
                                                sx={{
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: '50%',
                                                    bgcolor: ACTION_COLORS[evt.action_type],
                                                    flexShrink: 0
                                                }}
                                            />
                                            <Typography variant="body2" sx={{ flex: 1 }}>
                                                {ACTION_LABELS[evt.action_type]}
                                                {evt.note && `: ${evt.note}`}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setEditEvent(evt)
                                                }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={async () => {
                                                    if (confirm('Supprimer cette action ?')) {
                                                        setSubmitting(true)
                                                        try {
                                                            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
                                                            await fetch(`${apiBase}/crop-calendars/${evt.id}/`, { method: 'DELETE' })
                                                            fetchEvents()
                                                        } catch (error) {
                                                            console.error('Error deleting event:', error)
                                                        } finally {
                                                            setSubmitting(false)
                                                        }
                                                    }
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        ) : null
                    })()}

                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {editEvent.id ? 'Modifier l\'action' : 'Ajouter une nouvelle action'}
                        </Typography>

                        <TextField
                            label="Culture"
                            value={editEvent.crop_name || ''}
                            onChange={(e) => setEditEvent({ ...editEvent, crop_name: e.target.value })}
                            fullWidth
                            helperText="Ex: Tomate, Fraise..."
                            disabled={!!selectedCell}
                        />

                        <TextField
                            select
                            label="Mois"
                            value={editEvent.month || ''}
                            onChange={(e) => setEditEvent({ ...editEvent, month: parseInt(e.target.value) })}
                            fullWidth
                            disabled={!!selectedCell}
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
                    <Button onClick={() => { setOpen(false); setEditEvent({}); setSelectedCell(null) }}>Annuler</Button>
                    <Button onClick={handleSave} variant="contained" disabled={submitting}>
                        {editEvent.id ? 'Mettre à jour' : 'Ajouter'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
