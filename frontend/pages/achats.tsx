import { useEffect, useState } from 'react'
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid'
import { Box, Button, Grid, MenuItem, Select, Snackbar, Alert, TextField, Typography, Paper, Skeleton } from '@mui/material'
import { createPurchase, deletePurchase, listPurchases, updatePurchase, type Purchase } from '../api/purchases'

export default function AchatsPage() {
  const [items, setItems] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [category, setCategory] = useState<string>('')
  const [toast, setToast] = useState<{open: boolean, msg: string, severity: 'success'|'error'}>({open:false, msg:'', severity:'success'})
  const [form, setForm] = useState<Purchase>({ date: new Date().toISOString().slice(0,10), category: 'other', description: '', amount: 0 })

  const refresh = async () => {
    setLoading(true); setErr(null)
    try {
      const params: any = {}
      if (fromDate) params['date__gte'] = fromDate
      if (toDate) params['date__lte'] = toDate
      if (category) params['category'] = category
      const data = await listPurchases(params)
      setItems(data)
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur chargement achats')
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', flex: 1 },
    { field: 'category', headerName: 'Catégorie', flex: 1, editable: true, type: 'singleSelect', valueOptions: ['tools','inputs','other'] },
    { field: 'description', headerName: 'Description', flex: 2, editable: true },
    { field: 'amount', headerName: 'Montant (€)', type: 'number', flex: 1, editable: true },
    { field: 'actions', headerName: 'Actions', flex: 1, sortable: false, renderCell: (p) => (
      <Button color="error" onClick={() => onDelete(p.row.id)}>Supprimer</Button>
    )},
  ]

  const onDelete = async (id?: number) => {
    if (!id) return
    if (!confirm('Supprimer cet achat ?')) return
    await deletePurchase(id)
    refresh()
  }

  const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    try {
      const changed: any = {}
      ;(['category','description','amount'] as const).forEach(k => { if (newRow[k] !== oldRow[k]) changed[k] = newRow[k] })
      if (Object.keys(changed).length) {
        await updatePurchase(Number(newRow.id), changed)
        setToast({open:true, msg:'Achat mis à jour', severity:'success'})
        await refresh()
      }
      return newRow
    } catch (e: any) {
      setToast({open:true, msg:'Erreur maj: ' + (e?.message ?? ''), severity:'error'})
      throw e
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createPurchase(form)
      setForm({ date: new Date().toISOString().slice(0,10), category: 'other', description: '', amount: 0 })
      setToast({open:true, msg:'Achat ajouté', severity:'success'})
      refresh()
    } catch (e: any) {
      setToast({open:true, msg:'Erreur: ' + (e?.message ?? ''), severity:'error'})
    }
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Achats</Typography>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}><TextField fullWidth type="date" label="Du" InputLabelProps={{ shrink: true }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Grid>
        <Grid item xs={12} md={3}><TextField fullWidth type="date" label="Au" InputLabelProps={{ shrink: true }} value={toDate} onChange={(e) => setToDate(e.target.value)} /></Grid>
        <Grid item xs={12} md={3}>
          <Select fullWidth value={category} displayEmpty onChange={(e) => setCategory(e.target.value as any)}>
            <MenuItem value="">Toutes catégories</MenuItem>
            <MenuItem value="tools">Outils</MenuItem>
            <MenuItem value="inputs">Intrants</MenuItem>
            <MenuItem value="other">Autre</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={3}><Button onClick={refresh}>Filtrer</Button></Grid>
      </Grid>

      <Box mt={3} component={Paper} sx={{ p:2 }}>
        <Typography variant="h6" gutterBottom>Ajouter un achat</Typography>
        <Grid container spacing={2} alignItems="center" component="form" onSubmit={onSubmit}>
          <Grid item xs={12} md={3}><TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></Grid>
          <Grid item xs={12} md={3}>
            <Select fullWidth value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })}>
              <MenuItem value="tools">Outils</MenuItem>
              <MenuItem value="inputs">Intrants</MenuItem>
              <MenuItem value="other">Autre</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Grid>
          <Grid item xs={12} md={2}><Button type="submit">Enregistrer</Button></Grid>
        </Grid>
      </Box>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12}>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6" gutterBottom>Table des achats</Typography>
            <div style={{ width: '100%' }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={280} /> : (
              <DataGrid
                rows={items}
                columns={columns}
                getRowId={(r) => r.id!}
                autoHeight
                pageSizeOptions={[5,10,25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                disableRowSelectionOnClick
                processRowUpdate={processRowUpdate}
              />)}
            </div>
          </Paper>
        </Grid>
      </Grid>

      {loading && <Typography mt={2}>Chargement…</Typography>}
      {err && <Alert sx={{ mt:2 }} severity="error">{err}</Alert>}

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(s => ({...s, open:false}))}>
        <Alert onClose={() => setToast(s => ({...s, open:false}))} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
