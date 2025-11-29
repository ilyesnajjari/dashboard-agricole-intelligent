import { useEffect, useState, useMemo } from 'react'
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid'
import { Box, Button, Grid, MenuItem, Select, Snackbar, Alert, TextField, Typography, Paper, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, FormControl, InputLabel, CircularProgress } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts'
import { createPurchase, deletePurchase, listPurchases, updatePurchase, type Purchase } from '../api/purchases'

export default function AchatsPage() {
  const [items, setItems] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [category, setCategory] = useState<string>('') // Filter by category ID
  const [toast, setToast] = useState<{ open: boolean, msg: string, severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, msg: '', severity: 'success' })
  const [form, setForm] = useState<Purchase>({ date: new Date().toISOString().slice(0, 10), category: '', description: '', amount: 0 })

  // Dynamic categories state
  const [categories, setCategories] = useState<any[]>([])
  const [openNewCategoryDialog, setOpenNewCategoryDialog] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const res = await fetch(`${apiBase}/purchase-categories/`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
        // Set default category if available
        if (data.length > 0 && !form.category) {
          // Optional: set default
        }
      }
    } catch (e) {
      console.error('Error loading categories', e)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    setSubmitting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const res = await fetch(`${apiBase}/purchase-categories/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newCategoryName.trim() })
      })
      if (res.ok) {
        const newCat = await res.json()
        setCategories(prev => [...prev, newCat])
        setForm(f => ({ ...f, category: newCat.id }))
        setOpenNewCategoryDialog(false)
        setNewCategoryName('')
        setToast({ open: true, msg: 'Catégorie ajoutée', severity: 'success' })
      } else {
        setToast({ open: true, msg: "Erreur lors de l'ajout", severity: 'error' })
      }
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur: ' + (e?.message ?? ''), severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean, id: number | null }>({ open: false, id: null })

  const handleDeleteCategory = (id: number) => {
    setDeleteConfirm({ open: true, id })
  }

  const confirmDeleteCategory = async () => {
    const id = deleteConfirm.id
    if (!id) return
    setSubmitting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const res = await fetch(`${apiBase}/purchase-categories/${id}/`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== id))
        if (form.category === id) {
          setForm(f => ({ ...f, category: '' }))
        }
        setToast({ open: true, msg: 'Catégorie supprimée', severity: 'success' })
      } else {
        setToast({ open: true, msg: 'Erreur lors de la suppression', severity: 'error' })
      }
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur: ' + (e?.message ?? ''), severity: 'error' })
    } finally {
      setDeleteConfirm({ open: false, id: null })
      setSubmitting(false)
    }
  }

  const refresh = async (signal?: AbortSignal) => {
    setLoading(true); setErr(null)
    try {
      const params: any = {}
      if (fromDate) params['date__gte'] = fromDate
      if (toDate) params['date__lte'] = toDate
      const data = await listPurchases(params, signal)
      if (signal?.aborted) return
      setItems(data)
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setErr(e?.message ?? 'Erreur chargement achats')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  // Pie data: distribution by category name
  const [period, setPeriod] = useState<'day' | 'month'>('day')
  const pieData = useMemo(() => {
    if (!items || !items.length) return [] as any[]
    const map = new Map<string, number>()
    items.forEach(it => {
      // Use category_name from serializer
      const cat = (it as any).category_name || 'Inconnu'
      const amt = Number(it.amount || 0)
      map.set(cat, (map.get(cat) || 0) + amt)
    })
    const start = fromDate ? new Date(fromDate) : new Date(items[0].date)
    const end = toDate ? new Date(toDate) : new Date(items[items.length - 1].date)
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1)
    const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1)
    const divisor = period === 'day' ? days : months
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value: (value && divisor > 0) ? (value / divisor) : 0
    }))
  }, [items, fromDate, toDate, period])
  const PIE_COLORS = ['#d32f2f', '#1976d2', '#388e3c', '#f57c00', '#8e24aa', '#00acc1']

  useEffect(() => {
    const controller = new AbortController()
    refresh(controller.signal)
    return () => controller.abort()
  }, [])

  const handleToggleIgnored = async (id: number, currentIgnored: boolean) => {
    try {
      await updatePurchase(id, { ignored: !currentIgnored })
      setItems(prev => prev.map(item => item.id === id ? { ...item, ignored: !currentIgnored } : item))
      setToast({ open: true, msg: currentIgnored ? 'Achat réactivé' : 'Achat ignoré', severity: 'info' })
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur: ' + (e?.message ?? ''), severity: 'error' })
    }
  }


  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', flex: 1 },
    {
      field: 'category',
      headerName: 'Catégorie',
      flex: 1,
      editable: true,
      type: 'singleSelect',
      valueOptions: categories.map(c => ({ value: c.id, label: c.name })),
      valueGetter: (params: any) => params.row.category_name || '',
    },
    { field: 'description', headerName: 'Description', flex: 2, editable: true },
    { field: 'amount', headerName: 'Montant (€)', type: 'number', flex: 1, editable: true, valueFormatter: (params: any) => (params?.value !== undefined && params?.value !== null) ? `${Number(params.value).toFixed(2)} €` : '' },
    {
      field: 'actions', headerName: 'Actions', flex: 1, sortable: false, renderCell: (p) => (
        <Button color="error" onClick={() => onDelete(p.row.id)}>Supprimer</Button>
      )
    },
  ]

  // Fix column definition for category to work with IDs
  const realColumns: GridColDef[] = [
    { field: 'date', headerName: 'Date', flex: 1 },
    {
      field: 'category',
      headerName: 'Catégorie',
      flex: 1,
      editable: true,
      type: 'singleSelect',
      valueOptions: categories.map(c => ({ value: c.id, label: c.name })),
      valueGetter: (value, row) => row.category,
      valueFormatter: (params: any) => {
        const id = params?.value
        if (!id) return ''
        // Try to find in categories list
        const cat = categories.find(c => c.id === id)
        if (cat) return cat.name
        // Fallback: if row has category_name (from backend), use it
        return ''
      },
      renderCell: (params) => {
        const id = params.value
        const cat = categories.find(c => c.id === id)
        return cat ? cat.name : (params.row.category_name || '')
      }
    },
    { field: 'description', headerName: 'Description', flex: 2, editable: true },
    {
      field: 'amount', headerName: 'Montant (€)', type: 'number', flex: 1, editable: true, valueFormatter: (params: any) => {
        const val = (params && typeof params === 'object' && 'value' in params) ? params.value : params
        return (val !== undefined && val !== null && val !== '') ? `${Number(val).toFixed(2)} €` : ''
      }
    },
    {
      field: 'ignored',
      headerName: 'Ignorer',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={() => handleToggleIgnored(params.row.id, params.row.ignored)}
          color={params.row.ignored ? 'default' : 'primary'}
        >
          {params.row.ignored ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </IconButton>
      )
    },
    {
      field: 'actions', headerName: 'Actions', flex: 1, sortable: false, renderCell: (p) => (
        <Button color="error" onClick={() => onDelete(p.row.id)}>Supprimer</Button>
      )
    },
  ]

  const [deletePurchaseConfirm, setDeletePurchaseConfirm] = useState<{ open: boolean, id: number | null }>({ open: false, id: null })

  const onDelete = (id?: number) => {
    if (!id) return
    setDeletePurchaseConfirm({ open: true, id })
  }

  const confirmDeletePurchase = async () => {
    const id = deletePurchaseConfirm.id
    if (!id) return
    setSubmitting(true)
    try {
      await deletePurchase(id)
      window.dispatchEvent(new Event('data-updated'))
      refresh()
      setToast({ open: true, msg: 'Achat supprimé', severity: 'success' })
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur: ' + (e?.message ?? ''), severity: 'error' })
    } finally {
      setDeletePurchaseConfirm({ open: false, id: null })
      setSubmitting(false)
    }
  }

  const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    try {
      const changed: any = {}
        ; (['category', 'description', 'amount'] as const).forEach(k => { if (newRow[k] !== oldRow[k]) changed[k] = newRow[k] })
      if (Object.keys(changed).length) {
        await updatePurchase(Number(newRow.id), changed)
        setToast({ open: true, msg: 'Achat mis à jour', severity: 'success' })
        window.dispatchEvent(new Event('data-updated'))
        await refresh()
      }
      return newRow
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur maj: ' + (e?.message ?? ''), severity: 'error' })
      throw e
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload: any = {
        date: form.date,
        category: form.category, // This is now an ID
        description: form.description,
        amount: form.amount
      }

      await createPurchase(payload)
      setForm({ date: new Date().toISOString().slice(0, 10), category: '', description: '', amount: 0 })
      setToast({ open: true, msg: 'Achat ajouté', severity: 'success' })
      window.dispatchEvent(new Event('data-updated'))
      refresh()
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur: ' + (e?.message ?? ''), severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h4" gutterBottom sx={{ m: 0 }}>Achats</Typography>
      </Box>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}><TextField fullWidth type="date" label="Du" InputLabelProps={{ shrink: true }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Grid>
        <Grid item xs={12} md={3}><TextField fullWidth type="date" label="Au" InputLabelProps={{ shrink: true }} value={toDate} onChange={(e) => setToDate(e.target.value)} /></Grid>
        <Grid item xs={12} md={3}>
          <Select fullWidth value={category} displayEmpty onChange={(e) => setCategory(e.target.value as any)}>
            <MenuItem value="">Toutes catégories</MenuItem>
            {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </Select>
        </Grid>
        <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={() => refresh()}>Filtrer</Button>
          <Button variant="outlined" onClick={() => { setFromDate(''); setToDate(''); setCategory(''); refresh() }}>Reset</Button>
        </Grid>
      </Grid>

      <Box mt={3} component={Paper} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Ajouter un achat</Typography>
        <Grid container spacing={2} alignItems="center" component="form" onSubmit={onSubmit}>
          <Grid item xs={12} md={3}><TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth required>
              <InputLabel>Catégorie</InputLabel>
              <Select
                label="Catégorie"
                value={form.category}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setOpenNewCategoryDialog(true)
                  } else {
                    setForm({ ...form, category: e.target.value as any })
                  }
                }}
              >
                <MenuItem value="__NEW__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>+ Ajouter une nouvelle catégorie...</MenuItem>
                {categories.map(c => (
                  <MenuItem key={c.id} value={c.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{c.name}</span>
                    <IconButton
                      size="small"
                      color="error"
                      disableRipple
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleDeleteCategory(c.id)
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}><TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="number"
              inputProps={{ step: '1' }}
              label="Montant (€)"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              onFocus={(e) => e.target.value === '0' && setForm({ ...form, amount: '' as any })}
              required
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Enregistrer'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2} mt={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Répartition par catégorie ({period === 'day' ? 'moyenne / jour' : 'moyenne / mois'})</Typography>
            <Box sx={{ width: '100%', height: 240 }}>
              {items.length === 0 ? <Typography variant="body2" color="text.secondary">Pas assez de données</Typography> : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} label={({ name, percent }) => `${name} (${Math.round((percent || 0) * 100)}%)`}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <ReTooltip formatter={(v: number) => `${v.toFixed(0)} €`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Achats</Typography>
            <Box sx={{ width: '100%' }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={320} /> : (
                <>
                  <DataGrid
                    rows={items.filter(r => !category || String(r.category) === String(category))}
                    columns={realColumns}
                    getRowId={(r) => r.id!}
                    autoHeight
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                    disableRowSelectionOnClick
                    processRowUpdate={processRowUpdate}
                    getRowClassName={(params) => params.row.ignored ? 'ignored-row' : ''}
                    sx={{
                      '& .ignored-row': {
                        bgcolor: 'action.disabledBackground',
                        opacity: 0.6,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        }
                      }
                    }}
                  />
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <Typography variant="h6">
                      Total (Global): <strong>{items.filter(r => (!category || String(r.category) === String(category)) && !r.ignored).reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2)} €</strong>
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {loading && <Typography mt={2}>Chargement…</Typography>}
      {err && <Alert sx={{ mt: 2 }} severity="error">{err}</Alert>}

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(s => ({ ...s, open: false }))}>
        <Alert onClose={() => setToast(s => ({ ...s, open: false }))} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>

      <Dialog open={openNewCategoryDialog} onClose={() => setOpenNewCategoryDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouvelle Catégorie</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewCategoryDialog(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={handleAddCategory} variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null })}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Voulez-vous vraiment supprimer cette catégorie ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null })} disabled={submitting}>Annuler</Button>
          <Button onClick={confirmDeleteCategory} color="error" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deletePurchaseConfirm.open} onClose={() => setDeletePurchaseConfirm({ open: false, id: null })}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Voulez-vous vraiment supprimer cet achat ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePurchaseConfirm({ open: false, id: null })} disabled={submitting}>Annuler</Button>
          <Button onClick={confirmDeletePurchase} color="error" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
