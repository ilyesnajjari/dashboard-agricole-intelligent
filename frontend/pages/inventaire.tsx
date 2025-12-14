import React, { useEffect, useState } from 'react'
import { Box, Button, Grid, Typography, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Chip, Card, CardContent, CardActions, Tooltip, Fab, InputAdornment } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AgricultureIcon from '@mui/icons-material/Agriculture'
import BuildIcon from '@mui/icons-material/Build'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import HouseIcon from '@mui/icons-material/House'
import InventoryIcon from '@mui/icons-material/Inventory'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import GrassIcon from '@mui/icons-material/Grass'
import CategoryIcon from '@mui/icons-material/Category'
import SearchIcon from '@mui/icons-material/Search'
import { listCategories, listItems, createCategory, createItem, updateItem, deleteItem, deleteCategory, InventoryCategory, InventoryItem } from '../api/inventory'

const ICON_MAP: any = {
    'Tracteur': AgricultureIcon,
    'Materiel': BuildIcon,
    'Irrigation': WaterDropIcon,
    'Serre': HouseIcon,
    'Stock': InventoryIcon,
    'Transport': LocalShippingIcon,
    'Culture': GrassIcon,
    'Autre': CategoryIcon
}

const STATUS_COLORS: any = {
    'available': 'success',
    'in_use': 'info',
    'maintenance': 'warning',
    'broken': 'error'
}

const STATUS_LABELS: any = {
    'available': 'Disponible',
    'in_use': 'En utilisation',
    'maintenance': 'En maintenance',
    'broken': 'Hors service'
}

export default function InventairePage() {
    const [categories, setCategories] = useState<InventoryCategory[]>([])
    const [items, setItems] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')

    // Dialogs
    const [openItemDialog, setOpenItemDialog] = useState(false)
    const [openCatDialog, setOpenCatDialog] = useState(false)
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)

    // Forms
    const [itemForm, setItemForm] = useState<Partial<InventoryItem>>({
        name: '', category: undefined, quantity: 1, unit: 'pcs', status: 'available', description: '', dimensions: ''
    })
    const [catForm, setCatForm] = useState({ name: '', icon: 'Autre' })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [cats, its] = await Promise.all([listCategories(), listItems()])
            setCategories(cats)
            setItems(its)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveItem = async () => {
        try {
            if (editingItem) {
                await updateItem(editingItem.id!, itemForm)
            } else {
                await createItem(itemForm as InventoryItem)
            }
            setOpenItemDialog(false)
            setEditingItem(null)
            setItemForm({ name: '', category: categories[0]?.id, quantity: 1, unit: 'pcs', status: 'available', description: '', dimensions: '' })
            loadData()
        } catch (e) {
            alert('Erreur lors de la sauvegarde')
        }
    }

    const handleSaveCategory = async () => {
        try {
            await createCategory(catForm)
            setOpenCatDialog(false)
            setCatForm({ name: '', icon: 'Autre' })
            loadData()
        } catch (e) {
            alert('Erreur lors de la création de catégorie')
        }
    }

    const handleDeleteItem = async (id: number) => {
        if (confirm('Supprimer cet article ?')) {
            await deleteItem(id)
            loadData()
        }
    }

    const handleDeleteCategory = async (id: number) => {
        if (confirm('Supprimer cette catégorie et tous ses articles ?')) {
            await deleteCategory(id)
            loadData()
        }
    }

    const openEdit = (item: InventoryItem) => {
        setEditingItem(item)
        setItemForm(item)
        setOpenItemDialog(true)
    }

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.description?.toLowerCase().includes(search.toLowerCase())
    )

    const groupedItems = categories.map(cat => ({
        ...cat,
        items: filteredItems.filter(i => i.category === cat.id)
    }))

    // Add "Uncategorized" if any
    const uncategorized = filteredItems.filter(i => !categories.find(c => c.id === i.category))
    if (uncategorized.length > 0) {
        groupedItems.push({ id: -1, name: 'Non classé', icon: 'Autre', items: uncategorized })
    }

    return (
        <>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <TextField
                    size="small"
                    placeholder="Rechercher..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                    }}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="outlined" startIcon={<CategoryIcon />} onClick={() => setOpenCatDialog(true)}>
                        Nouvelle Catégorie
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingItem(null); setItemForm({ ...itemForm, category: categories[0]?.id }); setOpenItemDialog(true) }}>
                        Ajouter Article
                    </Button>
                </Box>
            </Box>

            {groupedItems.map(group => (
                group.items.length > 0 && (
                    <Box key={group.id} sx={{ mb: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, borderBottom: '1px solid #eee', pb: 1 }}>
                            {React.createElement(ICON_MAP[group.icon] || CategoryIcon, { sx: { mr: 1, color: 'primary.main' } })}
                            <Typography variant="h5" sx={{ flexGrow: 1 }}>{group.name}</Typography>
                            {group.id !== -1 && (
                                <IconButton size="small" onClick={() => handleDeleteCategory(group.id)} color="error">
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                        <Grid container spacing={3}>
                            {group.items.map(item => (
                                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                                    <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                                        <CardContent sx={{ flexGrow: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                                <Typography variant="h6" component="div" fontWeight="bold">
                                                    {item.name}
                                                </Typography>
                                                <Chip
                                                    label={STATUS_LABELS[item.status]}
                                                    color={STATUS_COLORS[item.status]}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                {item.description || "Pas de description"}
                                            </Typography>

                                            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                <Chip label={`${item.quantity} ${item.unit || ''}`} size="small" sx={{ bgcolor: 'action.selected' }} />
                                                {item.dimensions && <Chip label={item.dimensions} size="small" variant="outlined" />}
                                            </Box>
                                        </CardContent>
                                        <CardActions sx={{ justifyContent: 'flex-end', bgcolor: 'action.hover' }}>
                                            <IconButton size="small" onClick={() => openEdit(item)} color="primary"><EditIcon /></IconButton>
                                            <IconButton size="small" onClick={() => handleDeleteItem(item.id!)} color="error"><DeleteIcon /></IconButton>
                                        </CardActions>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )
            ))}

            {groupedItems.length === 0 && !loading && (
                <Box sx={{ textAlign: 'center', py: 8, opacity: 0.6 }}>
                    <InventoryIcon sx={{ fontSize: 64, mb: 2 }} />
                    <Typography variant="h6">Inventaire vide</Typography>
                    <Typography>Commencez par ajouter des catégories et des articles.</Typography>
                </Box>
            )}

            {/* Item Dialog */}
            <Dialog open={openItemDialog} onClose={() => setOpenItemDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingItem ? 'Modifier Article' : 'Nouvel Article'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Nom" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Catégorie</InputLabel>
                                <Select value={itemForm.category || ''} label="Catégorie" onChange={e => setItemForm({ ...itemForm, category: Number(e.target.value) })}>
                                    {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>Statut</InputLabel>
                                <Select value={itemForm.status} label="Statut" onChange={e => setItemForm({ ...itemForm, status: e.target.value as any })}>
                                    {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v as string}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Quantité"
                                value={itemForm.quantity}
                                onChange={e => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}
                                onFocus={e => itemForm.quantity === 0 && setItemForm({ ...itemForm, quantity: '' as any })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth label="Unité (ex: m, kg, pcs)" value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Dimensions (ex: 10x20m)" value={itemForm.dimensions} onChange={e => setItemForm({ ...itemForm, dimensions: e.target.value })} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={3} label="Description" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenItemDialog(false)}>Annuler</Button>
                    <Button variant="contained" onClick={handleSaveItem}>Enregistrer</Button>
                </DialogActions>
            </Dialog>

            {/* Category Dialog */}
            <Dialog open={openCatDialog} onClose={() => setOpenCatDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Nouvelle Catégorie</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Nom" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Icône</InputLabel>
                                <Select value={catForm.icon} label="Icône" onChange={e => setCatForm({ ...catForm, icon: e.target.value })}>
                                    {Object.keys(ICON_MAP).map(k => (
                                        <MenuItem key={k} value={k} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {React.createElement(ICON_MAP[k])} {k}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCatDialog(false)}>Annuler</Button>
                    <Button variant="contained" onClick={handleSaveCategory}>Créer</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
