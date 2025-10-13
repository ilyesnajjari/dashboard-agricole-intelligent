import { useEffect, useMemo, useState } from 'react'
import { listProducts, type Product } from '../api/products'
import { listSales, createSale, updateSale, deleteSale, type Sale, aggregateSales, type SalesAggregateRow } from '../api/sales'
import {
  Box, Button, Grid, MenuItem, Select, TextField, Typography, Snackbar, Alert, Paper, Skeleton
} from '@mui/material'
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, Legend } from 'recharts'

export default function VentesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<number | ''>('')
  const [items, setItems] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState<Sale>({ product: 0, date: new Date().toISOString().slice(0,10), market: '', quantity_kg: 0, unit_price: 0 })
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [toast, setToast] = useState<{open: boolean, msg: string, severity: 'success'|'error'}>({open:false, msg:'', severity:'success'})
  const [period, setPeriod] = useState<'day'|'week'|'month'>('day')
  const [agg, setAgg] = useState<SalesAggregateRow[]>([])
  const formatTick = (value: string) => {
    if (period === 'month') return value.slice(0,7)
    return value
  }

  useEffect(() => {
    (async () => {
      const p = await listProducts()
      setProducts(p)
      if (p.length) {
        setSelectedProduct(p[0].id!)
        setForm(f => ({ ...f, product: p[0].id! }))
      }
    })()
  }, [])

  useEffect(() => {
    if (!selectedProduct) return
    refresh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct])

  const refresh = async () => {
    if (!selectedProduct) return
    setLoading(true)
    setErr(null)
    try {
      const params: any = { product: Number(selectedProduct) }
      if (fromDate) params['date__gte'] = fromDate
      if (toDate) params['date__lte'] = toDate
      const data = await listSales(params)
      setItems(data)
      // aggregate for avg price chart
      const a = await aggregateSales({ product: Number(selectedProduct), period, fromDate, toDate })
      setAgg(a)
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur chargement ventes')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createSale({ ...form, product: Number(selectedProduct) })
      setForm(f => ({ ...f, market: '', quantity_kg: 0, unit_price: 0 }))
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
    { field: 'unit_price', headerName: 'Prix/kg (€)', type: 'number', flex: 1, editable: true },
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
      ;(['market','quantity_kg','unit_price'] as const).forEach(k => {
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

  const priceSeries = useMemo(() => {
    return items
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => ({ date: s.date, price: Number(s.unit_price) }))
  }, [items])

  // Aggregated series for charts
  const priceAggSeries = useMemo(() => {
    return agg.map(r => ({ date: r.date, avg: Number(r.avg_unit_price) }))
  }, [agg])

  const volumeAggSeries = useMemo(() => {
    return agg.map(r => ({ date: r.date, volume: Number(r.sum_quantity_kg) }))
  }, [agg])

  const revenueAggSeries = useMemo(() => {
    return agg.map(r => ({ date: r.date, revenue: Number(r.sum_total_amount) }))
  }, [agg])

  // AI widget: call backend forecast for next 7 days
  const [forecast, setForecast] = useState<{date: string, quantity_estimate: number}[]>([])
  useEffect(() => {
    (async () => {
      if (!selectedProduct) return
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
        const res = await fetch(`${base}/ai/forecast/?product=${selectedProduct}&days=7`)
        const data = await res.json()
        setForecast(Array.isArray(data) ? data : [])
      } catch (e) {
        setForecast([])
      }
    })()
  }, [selectedProduct, period])

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Ventes</Typography>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <Select fullWidth value={selectedProduct} onChange={(e) => { const v = e.target.value as number; setSelectedProduct(v); setForm(f => ({ ...f, product: v })) }} displayEmpty>
            {products.map(p => <MenuItem key={p.id} value={p.id!}>{p.name}</MenuItem>)}
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth type="date" label="Du" InputLabelProps={{ shrink: true }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth type="date" label="Au" InputLabelProps={{ shrink: true }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <Button variant="contained" onClick={refresh}>Filtrer</Button>
        </Grid>
        <Grid item xs={12} md={3}>
          <Select fullWidth value={period} onChange={(e) => setPeriod(e.target.value as any)}>
            <MenuItem value={'day'}>Jour</MenuItem>
            <MenuItem value={'week'}>Semaine</MenuItem>
            <MenuItem value={'month'}>Mois</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button variant="outlined" onClick={() => {
            const qs = new URLSearchParams()
            if (selectedProduct) qs.append('product', String(selectedProduct))
            if (fromDate) qs.append('date__gte', fromDate)
            if (toDate) qs.append('date__lte', toDate)
            qs.append('period', period)
            const url = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api') + '/sales/export/' + `?${qs.toString()}`
            window.open(url, '_blank')
          }}>Export CSV</Button>
          <Button sx={{ ml: 1 }} variant="outlined" onClick={() => {
            const qs = new URLSearchParams()
            if (selectedProduct) qs.append('product', String(selectedProduct))
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
            <TextField fullWidth type="number" inputProps={{ step: '0.01' }} label="Prix/kg (€)" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} required />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button type="submit" variant="contained">Enregistrer</Button>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6" gutterBottom>Prix moyen ({period})</Typography>
            <Box sx={{ width: '100%', height: 320 }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={320} /> : (
              <ResponsiveContainer>
                <LineChart data={priceAggSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatTick} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg" stroke="#1976d2" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6" gutterBottom>Volumes agrégés ({period})</Typography>
            <Box sx={{ width: '100%', height: 320 }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={320} /> : (
              <ResponsiveContainer>
                <BarChart data={volumeAggSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatTick} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="volume" fill="#2e7d32" />
                </BarChart>
              </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6" gutterBottom>Revenu agrégé ({period}) (€)</Typography>
            <Box sx={{ width: '100%', height: 320 }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={320} /> : (
              <ResponsiveContainer>
                <AreaChart data={revenueAggSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatTick} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#6a1b9a" fill="#ce93d8" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6" gutterBottom>Prix moyen ({period})</Typography>
            <Box sx={{ width: '100%', height: 320 }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={320} /> : (
              <ResponsiveContainer>
                <LineChart data={agg} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatTick} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg_unit_price" stroke="#ff9800" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>
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

      {/* IA: prévisions prochaine semaine */}
      <Box mt={3} component={Paper} sx={{ p:2 }}>
        <Typography variant="h6" gutterBottom>Prévisions (7 jours)</Typography>
        <Grid container spacing={1}>
          {forecast.map(f => (
            <Grid key={f.date} item xs={12} md={3}>
              <Paper sx={{ p:1, textAlign: 'center' }}>
                <Typography variant="body2">{f.date}</Typography>
                <Typography variant="h6">{f.quantity_estimate.toFixed(2)} kg</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}
