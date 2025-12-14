import { useEffect, useState, useMemo } from 'react'
// Product selection removed for classic sale view
import { listSales, createSale, updateSale, deleteSale, type Sale } from '../api/sales'
import { listProducts, type Product } from '../api/products'
import {
  Box, Button, Grid, TextField, Typography, Snackbar, Alert, Paper, Skeleton, MenuItem, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, CircularProgress
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip } from 'recharts'
// Charts removed for this page per request (focus on quantities and revenue over 30 days)

export default function VentesPage() {
  // No product filter for classic sales
  const [items, setItems] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState<Sale & { total_amount_input?: number, market: string | number, product?: number }>({
    date: new Date().toISOString().slice(0, 10),
    market: '',
    product: undefined,
    quantity_kg: 0,
    unit_price: 0,
    total_amount_input: 0
  })
  const [markets, setMarkets] = useState<any[]>([])
  const [openNewMarketDialog, setOpenNewMarketDialog] = useState(false)
  const [newMarketName, setNewMarketName] = useState('')
  const [inputMode, setInputMode] = useState<'total' | 'detail'>('total') // Toggle between total amount or quantity×price
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [toast, setToast] = useState<{ open: boolean, msg: string, severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' })
  // Period fixed to 'day' for 30-day table
  const [period] = useState<'day'>('day')

  // Chart Data Preparation
  const chartData = useMemo(() => {
    if (!items || !items.length) return []
    const map = new Map<string, number>()
    items.forEach(sale => {
      const date = sale.date
      const amount = Number(sale.total_amount || 0)
      map.set(date, (map.get(date) || 0) + amount)
    })
    // Sort by date
    return Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [items])
  // No aggregate chart/table here

  useEffect(() => {
    // Load markets
    fetch((process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api') + '/markets/', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setMarkets(d || []))
      .catch(console.error)

    // Load products
    listProducts().then(setProducts).catch(console.error)

    // Load initial data (no filter)
    refresh()
  }, [])

  useEffect(() => {
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
    setSubmitting(true)
    try {
      const payload: any = {
        date: form.date,
        market: form.market ? Number(form.market) : null,
        product: form.product || null,
      }

      if (inputMode === 'total') {
        // Mode Total Direct
        const total = Number(form.total_amount_input) || 0
        if (total <= 0) {
          setToast({ open: true, msg: 'Le montant doit être supérieur à 0.', severity: 'error' })
          setSubmitting(false)
          return
        }
        payload.total_amount = total
        // On laisse quantity_kg et unit_price à 0 ou null
        payload.quantity_kg = 0
        payload.unit_price = 0
      } else {
        // Mode Quantité × Prix
        const qty = Number(form.quantity_kg) || 0
        const price = Number(form.unit_price) || 0
        if (qty <= 0 || price <= 0) {
          setToast({ open: true, msg: 'La quantité et le prix doivent être supérieurs à 0.', severity: 'error' })
          setSubmitting(false)
          return
        }
        payload.quantity_kg = qty
        payload.unit_price = price
        // Le backend calculera le total, mais on peut aussi l'envoyer
        payload.total_amount = qty * price
      }

      await createSale(payload)
      setForm(f => ({ ...f, market: '', product: undefined, quantity_kg: 0, unit_price: 0, total_amount_input: 0 }))
      setToast({ open: true, msg: 'Vente ajoutée', severity: 'success' })
      refresh()
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur: ' + (e?.message ?? ''), severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddMarket = async () => {
    if (!newMarketName.trim()) return
    setSubmitting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const res = await fetch(`${apiBase}/markets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newMarketName.trim() })
      })
      if (res.ok) {
        const newMarket = await res.json()
        setMarkets(prev => [...prev, newMarket])
        setForm(f => ({ ...f, market: newMarket.id }))
        setOpenNewMarketDialog(false)
        setNewMarketName('')
        setToast({ open: true, msg: 'Marché ajouté', severity: 'success' })
      } else {
        const error = await res.json()
        setToast({ open: true, msg: error.name?.[0] || "Erreur lors de l'ajout", severity: 'error' })
      }
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur: ' + (e?.message ?? ''), severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean, id: number | null }>({ open: false, id: null })

  const handleDeleteMarket = (id: number) => {
    setDeleteConfirm({ open: true, id })
  }

  const confirmDeleteMarket = async () => {
    const id = deleteConfirm.id
    if (!id) return
    setSubmitting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const res = await fetch(`${apiBase}/markets/${id}/`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        setMarkets(prev => prev.filter(m => m.id !== id))
        if (Number(form.market) === id) {
          setForm(f => ({ ...f, market: '' }))
        }
        setToast({ open: true, msg: 'Marché supprimé', severity: 'success' })
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

  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', flex: 1, editable: false },
    { field: 'product', headerName: 'Produit', flex: 1, valueGetter: (value, row) => row?.product_name || '' },
    { field: 'market', headerName: 'Marché / Client', flex: 1, editable: true, valueGetter: (value, row) => row?.market_name || '' },
    { field: 'quantity_kg', headerName: 'Quantité (kg)', type: 'number', flex: 1, editable: true },
    {
      field: 'unit_price', headerName: 'Prix Unitaire (€)', type: 'number', flex: 1, editable: true, valueFormatter: (params: any) => {
        const val = (params && typeof params === 'object' && 'value' in params) ? params.value : params
        return (val !== undefined && val !== null && val !== '') ? `${Number(val).toFixed(2)} €` : ''
      }
    },
    {
      field: 'total_amount', headerName: 'Total (€)', type: 'number', flex: 1, valueFormatter: (params: any) => {
        const val = (params && typeof params === 'object' && 'value' in params) ? params.value : params
        return (val !== undefined && val !== null && val !== '') ? `${Number(val).toFixed(2)} €` : ''
      }
    },
    {
      field: 'actions', headerName: 'Actions', sortable: false, flex: 1, renderCell: (p) => (
        <Button color="error" onClick={() => onDelete(p?.row?.id)}>Supprimer</Button>
      )
    },
  ]

  const [deleteSaleConfirm, setDeleteSaleConfirm] = useState<{ open: boolean, id: number | null }>({ open: false, id: null })

  const confirmDeleteSale = async () => {
    const id = deleteSaleConfirm.id
    if (!id) return
    setSubmitting(true)
    try {
      await deleteSale(id)
      window.dispatchEvent(new Event('data-updated'))
      refresh()
      setToast({ open: true, msg: 'Vente supprimée', severity: 'success' })
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur: ' + (e?.message ?? ''), severity: 'error' })
    } finally {
      setDeleteSaleConfirm({ open: false, id: null })
      setSubmitting(false)
    }
  }

  const onDelete = (id?: number) => {
    if (!id) return
    setDeleteSaleConfirm({ open: true, id })
  }

  const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    try {
      const changed: any = {}
        ; (['market', 'quantity_kg', 'unit_price'] as const).forEach(k => {
          if (newRow[k] !== oldRow[k]) changed[k] = newRow[k]
        })
      if (Object.keys(changed).length) {
        await updateSale(Number(newRow.id), changed)
        setToast({ open: true, msg: 'Vente mise à jour', severity: 'success' })
        await refresh()
      }
      return newRow
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur maj: ' + (e?.message ?? ''), severity: 'error' })
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
        <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={refresh}>Filtrer</Button>
          <Button variant="outlined" onClick={() => { setFromDate(''); setToDate(''); refresh() }}>Reset</Button>
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

      <Box mt={3} component={Paper} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Ajouter une vente</Typography>
        <Grid container spacing={2} alignItems="center" component="form" onSubmit={onSubmit}>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Produit (Optionnel)</InputLabel>
              <Select
                value={form.product || ''}
                label="Produit (Optionnel)"
                onChange={(e) => setForm({ ...form, product: e.target.value ? Number(e.target.value) : undefined })}
              >
                <MenuItem value=""><em>Aucun</em></MenuItem>
                {products.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth required>
              <InputLabel>Marché</InputLabel>
              <Select
                value={form.market}
                label="Marché"
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setOpenNewMarketDialog(true)
                  } else {
                    setForm({ ...form, market: e.target.value })
                  }
                }}
              >
                <MenuItem value="__NEW__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>+ Ajouter un nouveau marché...</MenuItem>
                {markets.map((m) => (
                  <MenuItem key={m.id} value={m.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{m.name}</span>
                    <IconButton
                      size="small"
                      color="error"
                      disableRipple
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleDeleteMarket(m.id)
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Toggle Input Mode */}
          <Grid item xs={12} md={12}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <Typography variant="body2">Mode de saisie:</Typography>
              <Button
                variant={inputMode === 'total' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setInputMode('total')}
              >
                Total Direct
              </Button>
              <Button
                variant={inputMode === 'detail' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setInputMode('detail')}
              >
                Quantité × Prix
              </Button>
            </Box>
          </Grid>

          {inputMode === 'total' ? (
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                inputProps={{ step: '0.01' }}
                label="Total encaissé (€)"
                value={form.total_amount_input || ''}
                onChange={(e) => setForm({ ...form, total_amount_input: Number(e.target.value) })}
                onFocus={(e) => e.target.value === '0' && setForm({ ...form, total_amount_input: '' as any })}
                required
              />
            </Grid>
          ) : (
            <>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  type="number"
                  inputProps={{ step: '0.01' }}
                  label="Quantité (kg)"
                  value={form.quantity_kg || ''}
                  onChange={(e) => setForm({ ...form, quantity_kg: Number(e.target.value) })}
                  onFocus={(e) => e.target.value === '0' && setForm({ ...form, quantity_kg: '' as any })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  type="number"
                  inputProps={{ step: '0.01' }}
                  label="Prix Unitaire (€/kg)"
                  value={form.unit_price || ''}
                  onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
                  onFocus={(e) => e.target.value === '0' && setForm({ ...form, unit_price: '' as any })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary">
                  Total: {(form.quantity_kg && form.unit_price) ? `${(form.quantity_kg * form.unit_price).toFixed(2)} €` : '0.00 €'}
                </Typography>
              </Grid>
            </>
          )}

          <Grid item xs={12} md={2}>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Enregistrer'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Évolution du Chiffre d'Affaires (€)</Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={300} /> : (
                chartData.length > 0 ? (
                  <ResponsiveContainer>
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#2e7d32" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(str) => new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      />
                      <YAxis tickFormatter={(val) => `${val}€`} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <ReTooltip
                        formatter={(value: number) => [`${value.toFixed(2)} €`, "Chiffre d'Affaires"]}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#2e7d32" fillOpacity={1} fill="url(#colorAmount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography color="text.secondary">Pas assez de données pour afficher le graphique.</Typography>
                  </Box>
                )
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Table des ventes</Typography>
            <div style={{ width: '100%' }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={280} /> : (
                <DataGrid
                  rows={items}
                  columns={columns}
                  getRowId={(r) => r.id!}
                  autoHeight
                  pageSizeOptions={[5, 10, 25]}
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
      {err && <Alert sx={{ mt: 2 }} severity="error">{err}</Alert>}

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(s => ({ ...s, open: false }))}>
        <Alert onClose={() => setToast(s => ({ ...s, open: false }))} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>

      <Dialog open={openNewMarketDialog} onClose={() => setOpenNewMarketDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouveau Marché / Client</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom"
            fullWidth
            value={newMarketName}
            onChange={(e) => setNewMarketName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewMarketDialog(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={handleAddMarket} variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null })}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Voulez-vous vraiment supprimer ce marché ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null })} disabled={submitting}>Annuler</Button>
          <Button onClick={confirmDeleteMarket} color="error" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteSaleConfirm.open} onClose={() => setDeleteSaleConfirm({ open: false, id: null })}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Voulez-vous vraiment supprimer cette vente ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSaleConfirm({ open: false, id: null })} disabled={submitting}>Annuler</Button>
          <Button onClick={confirmDeleteSale} color="error" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prévisions IA désactivées pour cette vue */}
    </Box>
  )
}
