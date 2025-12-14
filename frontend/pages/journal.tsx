import { useState, useEffect, useRef } from 'react'
import { Box, Typography, Card, CardContent, CardMedia, IconButton, Fab, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip, Stack, CircularProgress } from '@mui/material'
import { Add, Delete, CalendarToday, LocalOffer, Edit, AcUnit } from '@mui/icons-material'
import { fetchLogEntries, fetchLogCategories, createLogCategory, deleteLogCategory, deleteLogEntry, createLogEntry, updateLogEntry, LogEntry as ApiLogEntry, LogCategory as ApiLogCategory } from '../api/logbook'
import FrostCalculatorDialog from '../components/FrostCalculatorDialog'

// Re-export or alias if needed, but we can use the API types directly
type LogCategory = ApiLogCategory
type LogEntry = ApiLogEntry

// Old FrostHoursDisplay removed

export default function Logbook() {
    const [entries, setEntries] = useState<LogEntry[]>([])
    const [categories, setCategories] = useState<LogCategory[]>([])
    const [open, setOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [categoryOpen, setCategoryOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [newEntry, setNewEntry] = useState({ content: '', category: '', tags: '' })
    const [newCategory, setNewCategory] = useState({ name: '', color: '#1976d2' })
    const [editEntry, setEditEntry] = useState<LogEntry | null>(null)
    const [filterCategory, setFilterCategory] = useState<string>('all')
    const [filterTag, setFilterTag] = useState<string>('all')

    // Frost Calculator State
    const [frostOpen, setFrostOpen] = useState(false)
    const [frostDate, setFrostDate] = useState<string | undefined>(undefined)

    // Extract unique tags from entries
    const availableTags = Array.from(new Set(
        entries.flatMap(entry => entry.tags ? entry.tags.split(',').map(tag => tag.trim()) : [])
    )).sort()

    useEffect(() => {
        fetchEntries()
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            const data = await fetchLogCategories()
            setCategories(data)
            if (data.length > 0 && !newEntry.category) {
                setNewEntry(prev => ({ ...prev, category: data[0].id.toString() }))
            }
        } catch (error) {
            console.error('Error fetching categories:', error)
        }
    }

    const fetchEntries = async () => {
        try {
            const data = await fetchLogEntries()
            setEntries(data)
        } catch (error) {
            console.error('Error fetching logbook:', error)
        }
    }

    const handleCreateCategory = async () => {
        if (!newCategory.name) return
        setSubmitting(true)
        try {
            await createLogCategory(newCategory.name, '#1976d2')
            setNewCategory({ name: '', color: '#1976d2' })
            fetchCategories()
        } catch (error) {
            console.error('Error creating category:', error)
            alert('Erreur: Cette catégorie existe peut-être déjà.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Les entrées associées perdront leur catégorie.')) return
        try {
            await deleteLogCategory(id)
            fetchCategories()
            if (filterCategory === id.toString()) {
                setFilterCategory('all')
            }
        } catch (error) {
            console.error('Error deleting category:', error)
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
            await deleteLogEntry(id)
            fetchEntries()
        } catch (error) {
            console.error('Error deleting entry:', error)
        } finally {
            setDeleteConfirm({ open: false, id: null })
            setSubmitting(false)
        }
    }

    const handleEdit = (entry: LogEntry) => {
        setEditEntry(entry)
        setEditOpen(true)
    }

    const handleUpdate = async () => {
        if (!editEntry) return
        const formData = new FormData()
        formData.append('content', editEntry.content)
        formData.append('category', editEntry.category.toString())
        formData.append('tags', editEntry.tags)
        formData.append('date', editEntry.date)

        setSubmitting(true)
        try {
            await updateLogEntry(editEntry.id, formData)
            setEditOpen(false)
            setEditEntry(null)
            fetchEntries()
        } catch (error) {
            console.error('Error updating entry:', error)
        } finally {
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
            await createLogEntry(formData)
            setOpen(false)
            setNewEntry(prev => ({ ...prev, content: '', tags: '' }))
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
                <Stack direction="row" spacing={2}>
                    <Button variant="outlined" onClick={() => setCategoryOpen(true)}>
                        Gérer les catégories
                    </Button>
                    <Button variant="contained" color="info" startIcon={<AcUnit />} onClick={() => { setFrostDate(undefined); setFrostOpen(true) }}>
                        Calculateur Froid
                    </Button>
                    <Fab color="primary" onClick={() => setOpen(true)}>
                        <Add />
                    </Fab>
                </Stack>
            </Box>

            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <TextField
                    select
                    label="Filtrer par catégorie"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    SelectProps={{ native: true }}
                    size="small"
                    sx={{ minWidth: 200 }}
                >
                    <option value="all">Toutes les catégories</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Filtrer par tag"
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    SelectProps={{ native: true }}
                    size="small"
                    sx={{ minWidth: 200 }}
                >
                    <option value="all">Tous les tags</option>
                    {availableTags.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                    ))}
                </TextField>

                {(filterCategory !== 'all' || filterTag !== 'all') && (
                    <Button
                        variant="text"
                        onClick={() => {
                            setFilterCategory('all')
                            setFilterTag('all')
                        }}
                    >
                        Réinitialiser
                    </Button>
                )}
            </Box>

            <Stack spacing={3}>
                {entries
                    .filter(entry => {
                        const matchCategory = filterCategory === 'all' || (entry.category_details && entry.category_details.id.toString() === filterCategory)
                        const matchTag = filterTag === 'all' || (entry.tags && entry.tags.split(',').map(t => t.trim()).includes(filterTag))
                        return matchCategory && matchTag
                    })
                    .map((entry) => (
                        <Card key={entry.id} sx={{ position: 'relative', overflow: 'visible' }}>
                            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 1 }}>
                                <IconButton
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleEdit(entry)
                                    }}
                                    size="small"
                                    color="primary"
                                >
                                    <Edit />
                                </IconButton>
                                <IconButton
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDelete(entry.id)
                                    }}
                                    size="small"
                                    color="error"
                                >
                                    <Delete />
                                </IconButton>
                                <IconButton
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setFrostDate(entry.date)
                                        setFrostOpen(true)
                                    }}
                                    size="small"
                                    color="info"
                                    title="Calculer heures de froid"
                                >
                                    <AcUnit />
                                </IconButton>
                            </Box>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'text.secondary' }}>
                                    <CalendarToday fontSize="small" />
                                    <Typography variant="caption">
                                        {new Date(entry.date).toLocaleString('fr-FR')}
                                    </Typography>
                                    <Chip
                                        label={entry.category_details?.name || 'Sans catégorie'}
                                        size="small"
                                        variant="outlined"
                                        sx={{ ml: 'auto', mr: 18 }}
                                    />
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
                            <option value="" disabled>Sélectionner une catégorie</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
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

            <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Modifier l'Entrée</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            select
                            label="Catégorie"
                            value={editEntry?.category || ''}
                            onChange={(e) => setEditEntry(editEntry ? { ...editEntry, category: parseInt(e.target.value) } : null)}
                            SelectProps={{ native: true }}
                            fullWidth
                        >
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </TextField>

                        <TextField
                            label="Description"
                            multiline
                            rows={4}
                            value={editEntry?.content || ''}
                            onChange={(e) => setEditEntry(editEntry ? { ...editEntry, content: e.target.value } : null)}
                            fullWidth
                        />

                        <TextField
                            label="Tags (séparés par des virgules)"
                            value={editEntry?.tags || ''}
                            onChange={(e) => setEditEntry(editEntry ? { ...editEntry, tags: e.target.value } : null)}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)} disabled={submitting}>Annuler</Button>
                    <Button onClick={handleUpdate} variant="contained" disabled={submitting}>
                        {submitting ? <CircularProgress size={24} color="inherit" /> : 'Mettre à jour'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={categoryOpen} onClose={() => setCategoryOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Gérer les catégories</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">Catégories existantes :</Typography>
                        <Stack spacing={1}>
                            {categories.map(cat => (
                                <Box key={cat.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                                    <Typography>{cat.name}</Typography>
                                    <IconButton size="small" color="error" onClick={() => handleDeleteCategory(cat.id)}>
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Box>
                            ))}
                            {categories.length === 0 && <Typography variant="body2" color="text.secondary">Aucune catégorie</Typography>}
                        </Stack>

                        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Ajouter une catégorie :</Typography>
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    label="Nom"
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                    fullWidth
                                    size="small"
                                />
                                <Button
                                    onClick={handleCreateCategory}
                                    variant="contained"
                                    disabled={submitting || !newCategory.name}
                                >
                                    Ajouter
                                </Button>
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCategoryOpen(false)}>Fermer</Button>
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

            <FrostCalculatorDialog
                open={frostOpen}
                onClose={() => setFrostOpen(false)}
                initialDate={frostDate}
            />
        </Box>
    )
}
