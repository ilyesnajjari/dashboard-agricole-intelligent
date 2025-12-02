import { useState, useEffect } from 'react'
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, MenuItem, Tooltip } from '@mui/material'
import { Add, Edit, Info, Delete as DeleteIcon } from '@mui/icons-material'

interface TreatmentEvent {
    id: number
    crop_name: string
    month: number
    treatment_type: 'fungicide' | 'insecticide' | 'herbicide' | 'fertilizer' | 'other'
    product_name: string
    dosage: string
    note: string
}

const MONTHS = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
]

const TREATMENT_COLORS = {
    fungicide: '#9C27B0', // Purple
    insecticide: '#FF9800', // Orange  
    herbicide: '#8BC34A', // Light Green
    fertilizer: '#2196F3', // Blue
    other: '#607D8B', // Grey
}

const TREATMENT_LABELS = {
    fungicide: 'Fongicide',
    insecticide: 'Insecticide',
    herbicide: 'Herbicide',
    fertilizer: 'Engrais',
    other: 'Autre',
}

interface Props {
    crops: string[]
    onCropsUpdate: (crops: string[]) => void
}

export default function TreatmentCalendar({ crops, onCropsUpdate }: Props) {
    const [treatments, setTreatments] = useState<TreatmentEvent[]>([])
    const [open, setOpen] = useState(false)
    const [editTreatment, setEditTreatment] = useState<Partial<TreatmentEvent>>({})
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchTreatments()
    }, [])

    const fetchTreatments = async () => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/treatment-calendars/`)
            const data = await res.json()
            setTreatments(data)

            // Merge crops from treatments
            const treatmentCrops = Array.from(new Set(data.map((t: TreatmentEvent) => t.crop_name)))
            const allCrops = Array.from(new Set([...crops, ...treatmentCrops])).sort() as string[]
            onCropsUpdate(allCrops)
        } catch (error) {
            console.error('Error fetching treatments:', error)
        }
    }

    const handleCellClick = (crop: string, month: number) => {
        const existing = treatments.filter(t => t.crop_name === crop && t.month === month + 1)
        if (existing.length > 0) {
            // Edit first treatment
            setEditTreatment(existing[0])
        } else {
            setEditTreatment({ crop_name: crop, month: month + 1, treatment_type: 'fungicide', product_name: '', dosage: '', note: '' })
        }
        setOpen(true)
    }

    const handleSave = async () => {
        if (!editTreatment.crop_name || !editTreatment.month || !editTreatment.treatment_type || !editTreatment.product_name) return
        setSubmitting(true)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const method = editTreatment.id ? 'PUT' : 'POST'
            const url = editTreatment.id ? `${apiBase}/treatment-calendars/${editTreatment.id}/` : `${apiBase}/treatment-calendars/`

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editTreatment),
            })

            if (res.ok) {
                setOpen(false)
                fetchTreatments()
            }
        } catch (error) {
            console.error('Error saving treatment:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!editTreatment.id) return
        if (!confirm('Supprimer ce traitement ?')) return
        setSubmitting(true)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/treatment-calendars/${editTreatment.id}/`, { method: 'DELETE' })
            if (res.ok) {
                setOpen(false)
                fetchTreatments()
            }
        } catch (error) {
            console.error('Error deleting treatment:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteCrop = async (cropName: string) => {
        if (!confirm(`Supprimer tous les traitements pour "${cropName}" ?`)) return
        setSubmitting(true)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const cropTreatments = treatments.filter(t => t.crop_name === cropName)
            await Promise.all(
                cropTreatments.map(treatment =>
                    fetch(`${apiBase}/treatment-calendars/${treatment.id}/`, { method: 'DELETE' })
                )
            )
            fetchTreatments()
        } catch (error) {
            console.error('Error deleting crop treatments:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const getTreatmentsForCell = (crop: string, monthIndex: number) => {
        return treatments.filter(t => t.crop_name === crop && t.month === monthIndex + 1)
    }

    return (
        <Box>
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
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteCrop(crop)
                                            }}
                                            sx={{ ml: 1 }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                                {MONTHS.map((_, monthIndex) => {
                                    const cellTreatments = getTreatmentsForCell(crop, monthIndex)
                                    return (
                                        <TableCell
                                            key={monthIndex}
                                            align="center"
                                            onClick={() => handleCellClick(crop, monthIndex)}
                                            sx={{
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: 'action.hover' },
                                                p: 0.5
                                            }}
                                        >
                                            {cellTreatments.length > 0 ? (
                                                <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                                                    {cellTreatments.map(treatment => (
                                                        <Tooltip key={treatment.id} title={`${TREATMENT_LABELS[treatment.treatment_type]} - ${treatment.product_name}`}>
                                                            <Chip
                                                                size="small"
                                                                label={TREATMENT_LABELS[treatment.treatment_type].substring(0, 3)}
                                                                sx={{
                                                                    bgcolor: TREATMENT_COLORS[treatment.treatment_type],
                                                                    color: 'white',
                                                                    fontSize: '0.7rem',
                                                                    height: 20,
                                                                    minWidth: 35
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    ))}
                                                </Stack>
                                            ) : (
                                                <IconButton size="small" sx={{ opacity: 0.3 }}>
                                                    <Add fontSize="small" />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Legend */}
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {Object.entries(TREATMENT_LABELS).map(([key, label]) => (
                    <Chip
                        key={key}
                        label={label}
                        size="small"
                        sx={{
                            bgcolor: TREATMENT_COLORS[key as keyof typeof TREATMENT_COLORS],
                            color: 'white'
                        }}
                    />
                ))}
            </Box>

            {/* Edit Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editTreatment.id ? 'Modifier le traitement' : 'Ajouter un traitement'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Culture"
                            value={editTreatment.crop_name || ''}
                            onChange={(e) => setEditTreatment({ ...editTreatment, crop_name: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            select
                            label="Mois"
                            value={editTreatment.month || 1}
                            onChange={(e) => setEditTreatment({ ...editTreatment, month: Number(e.target.value) })}
                            fullWidth
                        >
                            {MONTHS.map((m, i) => (
                                <MenuItem key={i} value={i + 1}>{m}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Type de traitement"
                            value={editTreatment.treatment_type || 'fungicide'}
                            onChange={(e) => setEditTreatment({ ...editTreatment, treatment_type: e.target.value as any })}
                            fullWidth
                        >
                            {Object.entries(TREATMENT_LABELS).map(([key, label]) => (
                                <MenuItem key={key} value={key}>{label}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Nom du produit"
                            value={editTreatment.product_name || ''}
                            onChange={(e) => setEditTreatment({ ...editTreatment, product_name: e.target.value })}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Dosage"
                            value={editTreatment.dosage || ''}
                            onChange={(e) => setEditTreatment({ ...editTreatment, dosage: e.target.value })}
                            fullWidth
                            placeholder="Ex: 2L/ha, 500g/100L..."
                        />
                        <TextField
                            label="Notes"
                            value={editTreatment.note || ''}
                            onChange={(e) => setEditTreatment({ ...editTreatment, note: e.target.value })}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Cible, conditions d'application..."
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    {editTreatment.id && (
                        <Button onClick={handleDelete} color="error" disabled={submitting}>
                            Supprimer
                        </Button>
                    )}
                    <Button onClick={() => setOpen(false)} disabled={submitting}>Annuler</Button>
                    <Button onClick={handleSave} variant="contained" disabled={submitting}>
                        {editTreatment.id ? 'Modifier' : 'Ajouter'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
