import { useEffect, useState } from 'react'
// Product selection removed for classic sale view
import { listSales, createSale, updateSale, deleteSale, type Sale } from '../api/sales'
import {
  Box, Button, Grid, TextField, Typography, Snackbar, Alert, Paper, Skeleton
} from '@mui/material'
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid'
// Charts removed for this page per request (focus on quantities and revenue over 30 days)

export default function VentesPage() {
  // No product filter for classic sales
  const [items, setItems] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState<Sale & { total_amount_input?: number }>({ date: new Date().toISOString().slice(0,10), market: '', quantity_kg: 0, unit_price: 0, total_amount_input: 0 })
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [toast, setToast] = useState<{open: boolean, msg: string, severity: 'success'|'error'}>({open:false, msg:'', severity:'success'})
  // Period fixed to 'day' for 30-day table
  const [period] = useState<'day'>('day')
  // No aggregate chart/table here

  useEffect(() => {
    // Initialize last 30 days window on mount
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 29)
    setFromDate(start.toISOString().slice(0,10))
    setToDate(end.toISOString().slice(0,10))
  }, [])

  useEffect(() => {
    if (!fromDate || !toDate) return
    refresh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate])

  // Auto-refresh when date filters change
  // (handled above)

  const refresh = async () => {
    setLoading(true)
    setErr(null)
    try {
      const params: any = {}
      if (fromDate) params['date__gte'] = fromDate
      if (toDate) params['date__lte'] = toDate
    const data = await listSales(params)
    setItems(data)
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur chargement ventes')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
  // Compute unit_price from total amount input if provided
  const qty = Number(form.quantity_kg) || 0
  const total = Number(form.total_amount_input) || 0
  const unitPrice = qty > 0 ? (total / qty) : 0
  await createSale({ ...form, unit_price: unitPrice })
  setForm(f => ({ ...f, market: '', quantity_kg: 0, unit_price: 0, total_amount_input: 0 }))
      setToast({open:true, msg:'Vente ajoutée', severity:'success'})
      refresh()
    } catch (e: any) {
      setToast({open:true, msg:'Erreur: ' + (e?.message ?? ''), severity:'error'})
    }
  }

  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', flex: 1, editable: false },
    { field: 'market', headerName: 'Marché', flex: 1, editable: true, valueGetter: (p: any) => p.row.market || '' },
    { field: 'quantity_kg', headerName: 'Quantité (kg)', type: 'number', flex: 1, editable: true },
    { field: 'total_amount', headerName: 'Total (€)', type: 'number', flex: 1, valueGetter: (p: any) => (Number(p.row.quantity_kg)*Number(p.row.unit_price)).toFixed(2) },
    { field: 'actions', headerName: 'Actions', sortable: false, flex: 1, renderCell: (p) => (
      <Button color="error" onClick={() => onDelete(p.row.id)}>Supprimer</Button>
    )},
  ]

  const onDelete = async (id?: number) => {
    if (!id) return
    if (!confirm('Supprimer cette vente ?')) return
    await deleteSale(id)
    refresh()
  }

  const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    try {
      const changed: any = {}
      ;(['market','quantity_kg'] as const).forEach(k => {
        if (newRow[k] !== oldRow[k]) changed[k] = newRow[k]
      })
      if (Object.keys(changed).length) {
        await updateSale(Number(newRow.id), changed)
        setToast({open:true, msg:'Vente mise à jour', severity:'success'})
        await refresh()
      }
      return newRow
    } catch (e: any) {
      setToast({open:true, msg:'Erreur maj: ' + (e?.message ?? ''), severity:'error'})
      throw e
    }
  }

  // Removed 30-day aggregate table and totals per request

  // AI forecast disabled in classic sales view

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Ventes</Typography>

      <Grid container spacing={2} alignItems="center">
  {/* Classic sales: no product filter */}
        <Grid item xs={12} md={3}>
          <TextField fullWidth type="date" label="Du" InputLabelProps={{ shrink: true }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth type="date" label="Au" InputLabelProps={{ shrink: true }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <Button variant="contained" onClick={refresh}>Filtrer</Button>
        </Grid>
        {/* Period selection removed; fixed to 30 days (daily) */}
        <Grid item xs={12} md={3}>
          <Button variant="outlined" onClick={() => {
            const qs = new URLSearchParams()
            if (fromDate) qs.append('date__gte', fromDate)
            if (toDate) qs.append('date__lte', toDate)
            qs.append('period', period)
            const url = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api') + '/sales/export/' + `?${qs.toString()}`
            window.open(url, '_blank')
          }}>Export CSV</Button>
          <Button sx={{ ml: 1 }} variant="outlined" onClick={() => {
            const qs = new URLSearchParams()
            if (fromDate) qs.append('date__gte', fromDate)
            if (toDate) qs.append('date__lte', toDate)
            qs.append('period', period)
            const url = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api') + '/sales/export_xlsx/' + `?${qs.toString()}`
            window.open(url, '_blank')
          }}>Export Excel</Button>
        </Grid>
      </Grid>

      <Box mt={3} component={Paper} sx={{ p:2 }}>
        <Typography variant="h6" gutterBottom>Ajouter une vente</Typography>
        <Grid container spacing={2} alignItems="center" component="form" onSubmit={onSubmit}>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Marché" value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth type="number" inputProps={{ step: '0.01' }} label="Quantité (kg)" value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: Number(e.target.value) })} required />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth type="number" inputProps={{ step: '0.01' }} label="Total encaissé (€)" value={form.total_amount_input || 0} onChange={(e) => setForm({ ...form, total_amount_input: Number(e.target.value) })} required />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button type="submit" variant="contained">Enregistrer</Button>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12}>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6" gutterBottom>Table des ventes</Typography>
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
              />
              )}
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

      {/* Prévisions IA désactivées pour cette vue */}
    </Box>
  )
}
