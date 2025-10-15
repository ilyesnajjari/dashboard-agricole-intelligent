import { useEffect, useState } from 'react'
import { listProducts, createProduct, deleteProduct, type Product, updateProduct } from '../api/products'
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Select, Snackbar, Alert, TextField, Typography, Paper } from '@mui/material'

export default function ProduitsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<Product>({ name: '', category: 'fruit', default_unit: 'kg', is_active: true })
  const [toast, setToast] = useState<{open: boolean, msg: string, severity: 'success'|'error'}>({open:false, msg:'', severity:'success'})

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listProducts()
      setItems(data)
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createProduct(form)
      setShowAdd(false)
  setForm({ name: '', category: 'fruit', default_unit: 'kg', is_active: true })
      refresh()
    } catch (e: any) {
      alert('Erreur: ' + (e?.message ?? ''))
    }
  }

  const onDelete = async (id?: number) => {
    if (!id) return
    if (!confirm('Supprimer ce produit ?')) return
    await deleteProduct(id)
    refresh()
  }

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Nom', flex: 1, editable: true },
    { field: 'category', headerName: 'Catégorie', flex: 1, editable: true, type: 'singleSelect', valueOptions: ['fruit','vegetable','other'] },
    { field: 'default_unit', headerName: 'Unité', flex: 1, editable: true },
  // price column removed per request
    { field: 'is_active', headerName: 'Actif', type: 'boolean', flex: 1, editable: true, valueFormatter: (p) => (p.value ? 'Oui' : 'Non') },
    { field: 'actions', headerName: 'Actions', sortable: false, flex: 1, renderCell: (p) => (
      <Button color="error" onClick={() => onDelete(p.row.id)}>Supprimer</Button>
    )},
  ]

  const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    try {
      const changed: any = {}
      ;(['name','category','default_unit','is_active'] as const).forEach(k => {
        if (newRow[k] !== oldRow[k]) changed[k] = newRow[k]
      })
      if (Object.keys(changed).length) {
        await updateProduct(Number(newRow.id), changed)
        setToast({open:true, msg:'Produit mis à jour', severity:'success'})
        await refresh()
      }
      return newRow
    } catch (e: any) {
      setToast({open:true, msg:'Erreur maj: ' + (e?.message ?? ''), severity:'error'})
      throw e
    }
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Produits</Typography>
      <Box mb={2}>
        {/* Replace add product button with a link to harvests page */}
        <Button variant="contained" href="/recoltes">Aller aux récoltes</Button>
      </Box>
      {loading && <Typography>Chargement…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      <Paper sx={{ p:2 }}>
        <div style={{ width: '100%' }}>
          <DataGrid
            rows={items}
            columns={columns}
            getRowId={(r) => r.id!}
            autoHeight
            pageSizeOptions={[5,10,25]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
            processRowUpdate={processRowUpdate}
          />
        </div>
      </Paper>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)}>
        <DialogTitle>Ajouter un produit</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Select fullWidth value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Product['category'] })}>
                <MenuItem value="fruit">Fruit</MenuItem>
                <MenuItem value="vegetable">Vegetable</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Unité" value={form.default_unit} onChange={(e) => setForm({ ...form, default_unit: e.target.value })} />
            </Grid>
            {/* Price input removed per request */}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAdd(false)}>Annuler</Button>
          <Button onClick={onSubmit} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(s => ({...s, open:false}))}>
        <Alert onClose={() => setToast(s => ({...s, open:false}))} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
