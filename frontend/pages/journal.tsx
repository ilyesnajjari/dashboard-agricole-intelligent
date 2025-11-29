import { useState, useEffect, useRef } from 'react'
import { Box, Typography, Card, CardContent, CardMedia, IconButton, Fab, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip, Stack, CircularProgress } from '@mui/material'
import { Add, Delete, CalendarToday, LocalOffer } from '@mui/icons-material'

interface LogEntry {
    id: number
    date: string
    category: 'observation' | 'intervention' | 'harvest' | 'problem' | 'note'
    content: string
    tags: string
}

export default function Logbook() {
    const [entries, setEntries] = useState<LogEntry[]>([])
    const [open, setOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [newEntry, setNewEntry] = useState({ content: '', category: 'note', tags: '' })

    useEffect(() => {
        fetchEntries()
    }, [])

    const fetchEntries = async () => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/logbook/`)
            const data = await res.json()
            setEntries(data)
        } catch (error) {
            console.error('Error fetching logbook:', error)
        }
    }

    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean, id: number | null }>({ open: false, id: null })

    const handleDelete = (id: number) => {
        setDeleteConfirm({ open: true, id })
    }

    const confirmDelete = async () => {
        const id = deleteConfirm.id
        if (!id) return
        setSubmitting(true)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            const res = await fetch(`${apiBase}/logbook/${id}/`, { method: 'DELETE', credentials: 'include' })
            if (res.ok) {
                fetchEntries()
            } else {
                console.error('Failed to delete', res.statusText)
            }
        } catch (error) {
            console.error('Error deleting entry:', error)
        } finally {
            setDeleteConfirm({ open: false, id: null })
            setSubmitting(false)
        }
    }



    const handleSubmit = async () => {
        const formData = new FormData()
        formData.append('content', newEntry.content)
        formData.append('category', newEntry.category)
        formData.append('tags', newEntry.tags)
        formData.append('date', new Date().toISOString())

        setSubmitting(true)
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
            await fetch(`${apiBase}/logbook/`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            })
            setOpen(false)
            setNewEntry({ content: '', category: 'note', tags: '' })
            fetchEntries()
        } catch (error) {
            console.error('Error saving entry:', error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" fontWeight={700}>
                    Journal de Bord
                </Typography>
                <Fab color="primary" onClick={() => setOpen(true)}>
                    <Add />
                </Fab>
            </Box>

            <Stack spacing={3}>
                {entries.map((entry) => (
                    <Card key={entry.id} sx={{ position: 'relative', overflow: 'visible' }}>
                        <Box
                            sx={{
                                position: 'absolute',
                                left: -16,
                                top: 20,
                                width: 4,
                                height: '100%',
                                bgcolor: 'primary.main',
                                borderRadius: 2,
                            }}
                        />
                        <IconButton
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(entry.id)
                            }}
                            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
                            size="small"
                            color="error"
                        >
                            <Delete />
                        </IconButton>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'text.secondary' }}>
                                <CalendarToday fontSize="small" />
                                <Typography variant="caption">
                                    {new Date(entry.date).toLocaleString('fr-FR')}
                                </Typography>
                                <Chip label={entry.category} size="small" variant="outlined" sx={{ ml: 'auto', mr: 4 }} />
                            </Box>

                            <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                                {entry.content}
                            </Typography>





                            {entry.tags && (
                                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                    <LocalOffer fontSize="small" color="action" />
                                    {entry.tags.split(',').map(tag => (
                                        <Chip key={tag} label={tag.trim()} size="small" />
                                    ))}
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </Stack>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Nouvelle Entrée</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            select
                            label="Catégorie"
                            value={newEntry.category}
                            onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                            SelectProps={{ native: true }}
                            fullWidth
                        >
                            <option value="observation">Observation</option>
                            <option value="intervention">Intervention</option>
                            <option value="harvest">Récolte</option>
                            <option value="problem">Problème</option>
                            <option value="note">Note</option>
                        </TextField>

                        <TextField
                            label="Description"
                            multiline
                            rows={4}
                            value={newEntry.content}
                            onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                            fullWidth
                        />



                        <TextField
                            label="Tags (séparés par des virgules)"
                            value={newEntry.tags}
                            onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} disabled={submitting}>Annuler</Button>
                    <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
                        {submitting ? <CircularProgress size={24} color="inherit" /> : 'Enregistrer'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null })}>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <DialogContent>
                    <Typography>Voulez-vous vraiment supprimer cette entrée du journal ?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirm({ open: false, id: null })} disabled={submitting}>Annuler</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained" disabled={submitting}>
                        {submitting ? <CircularProgress size={24} color="inherit" /> : 'Supprimer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
