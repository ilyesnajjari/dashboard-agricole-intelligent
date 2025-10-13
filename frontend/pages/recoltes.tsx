import { useEffect, useMemo, useState } from 'react'
import { createHarvest, listHarvests, updateHarvest, aggregateHarvests, type Harvest, type HarvestAggregateRow } from '../api/harvests'
import { listProducts, type Product } from '../api/products'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import {
  Box, Button, Grid, MenuItem, Select, TextField, Typography, Snackbar, Alert, Paper, Skeleton
} from '@mui/material'
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid'

export default function RecoltesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<number | ''>('')
  const [items, setItems] = useState<Harvest[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState<Harvest>({ product: 0, date: new Date().toISOString().slice(0,10), quantity_kg: 0, area_m2: 0, parcel: '', cultivation_type: 'plein_champ' })
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [cultivation, setCultivation] = useState<'serre'|'plein_champ'|''>('')
  const [toast, setToast] = useState<{open: boolean, msg: string, severity: 'success'|'error'}>({open:false, msg:'', severity:'success'})
  const [period, setPeriod] = useState<'day'|'week'|'month'>('day')
  const [aggAll, setAggAll] = useState<HarvestAggregateRow[]>([])
  const [aggSerre, setAggSerre] = useState<HarvestAggregateRow[]>([])
  const [aggPlein, setAggPlein] = useState<HarvestAggregateRow[]>([])

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
  if (cultivation) params['cultivation_type'] = cultivation
      const data = await listHarvests(params)
      setItems(data)
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur chargement récoltes')
    } finally {
      setLoading(false)
    }
  }

  // Load aggregated series (all + by culture)
  useEffect(() => {
    if (!selectedProduct) return
    (async () => {
      try {
        const argsBase = { product: Number(selectedProduct), period, date__gte: fromDate || undefined, date__lte: toDate || undefined } as const
        const [all, serre, plein] = await Promise.all([
          aggregateHarvests(argsBase as any),
          aggregateHarvests({ ...(argsBase as any), cultivation_type: 'serre' }),
          aggregateHarvests({ ...(argsBase as any), cultivation_type: 'plein_champ' }),
        ])
        setAggAll(all)
        setAggSerre(serre)
        setAggPlein(plein)
      } catch (e) {
        // keep silent for aggregates to not block UI; could surface toast if needed
      }
    })()
  }, [selectedProduct, fromDate, toDate, period])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createHarvest({ ...form, product: Number(selectedProduct) })
      setForm(f => ({ ...f, quantity_kg: 0, area_m2: 0, parcel: '' }))
      setToast({open:true, msg:'Récolte ajoutée', severity:'success'})
      refresh()
    } catch (e: any) {
      setToast({open:true, msg:'Erreur: ' + (e?.message ?? ''), severity:'error'})
    }
  }

  // Aggregated yield per culture lines
  const chartDataSerre = useMemo(() => aggSerre.slice().sort((a,b) => a.date.localeCompare(b.date)), [aggSerre])
  const chartDataPlein = useMemo(() => aggPlein.slice().sort((a,b) => a.date.localeCompare(b.date)), [aggPlein])

  // Aggregated volume for selected filter (if a cultivation is selected, show that; else show total)
  const chartDataVolume = useMemo(() => {
    const src = cultivation === 'serre' ? aggSerre : cultivation === 'plein_champ' ? aggPlein : aggAll
    return src.slice().sort((a,b) => a.date.localeCompare(b.date))
  }, [aggAll, aggSerre, aggPlein, cultivation])
  const formatTick = (value: string) => {
    // Expecting ISO date strings; keep simple display depending on period
    if (period === 'day') return value
    if (period === 'week') return value
    if (period === 'month') return value.slice(0, 7)
    return value
  }

  // Stacked volumes by culture (join by date)
  const stackedByCulture = useMemo(() => {
    const map = new Map<string, { date: string; serre?: number; plein?: number }>()
    aggSerre.forEach(r => {
      const it = map.get(r.date) || { date: r.date }
      it.serre = r.sum_quantity_kg
      map.set(r.date, it)
    })
    aggPlein.forEach(r => {
      const it = map.get(r.date) || { date: r.date }
      it.plein = r.sum_quantity_kg
      map.set(r.date, it)
    })
    let arr = Array.from(map.values())
    // If filtered by one culture, zero-out the other for clearer view
    if (cultivation === 'serre') arr = arr.map(x => ({ ...x, plein: 0 }))
    if (cultivation === 'plein_champ') arr = arr.map(x => ({ ...x, serre: 0 }))
    return arr.sort((a,b) => a.date.localeCompare(b.date))
  }, [aggSerre, aggPlein, cultivation])

  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', flex: 1, editable: false },
    { field: 'parcel', headerName: 'Parcelle', flex: 1, editable: true, valueGetter: (p) => p.row.parcel || '' },
    { field: 'cultivation_type', headerName: 'Culture', flex: 1, editable: true, type: 'singleSelect', valueOptions: ['serre','plein_champ'] },
    { field: 'quantity_kg', headerName: 'Quantité (kg)', type: 'number', flex: 1, editable: true },
    { field: 'area_m2', headerName: 'Surface (m²)', type: 'number', flex: 1, editable: true },
    { field: 'yield', headerName: 'Rdt (kg/m²)', type: 'number', flex: 1, valueGetter: (p) => (p.row.area_m2 ? (Number(p.row.quantity_kg)/Number(p.row.area_m2)) : 0).toFixed(3) },
  ]

  const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    try {
      const changed: any = {}
      ;(['parcel','cultivation_type','quantity_kg','area_m2'] as const).forEach(k => {
        if (newRow[k] !== oldRow[k]) changed[k] = newRow[k]
      })
      if (Object.keys(changed).length) {
        await updateHarvest(Number(newRow.id), changed)
        setToast({open:true, msg:'Récolte mise à jour', severity:'success'})
        await refresh()
      }
      return newRow
    } catch (e: any) {
      setToast({open:true, msg:'Erreur maj: ' + (e?.message ?? ''), severity:'error'})
      throw e
    }
  }

  const exportCsvBackend = () => {
    const qs = new URLSearchParams()
    if (selectedProduct) qs.append('product', String(selectedProduct))
    if (fromDate) qs.append('date__gte', fromDate)
    if (toDate) qs.append('date__lte', toDate)
    qs.append('period', period)
    if (cultivation) qs.append('cultivation_type', cultivation)
    const url = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api') + '/harvests/export/' + `?${qs.toString()}`
    window.open(url, '_blank')
  }

  const exportExcelBackend = () => {
    const qs = new URLSearchParams()
    if (selectedProduct) qs.append('product', String(selectedProduct))
    if (fromDate) qs.append('date__gte', fromDate)
    if (toDate) qs.append('date__lte', toDate)
    qs.append('period', period)
    if (cultivation) qs.append('cultivation_type', cultivation)
    const url = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api') + '/harvests/export_xlsx/' + `?${qs.toString()}`
    window.open(url, '_blank')
  }

  const exportCsv = () => {
    const rows = [['date','parcel','cultivation_type','quantity_kg','area_m2','yield_kg_per_m2']]
    items.forEach(h => rows.push([
      h.date, h.parcel || '', h.cultivation_type || '', String(h.quantity_kg), String(h.area_m2), String(h.yield_kg_per_m2 ?? (h.area_m2 ? h.quantity_kg / h.area_m2 : 0))
    ]))
    const csv = rows.map(r => r.map(f => typeof f === 'string' && f.includes(',') ? `"${f}"` : f).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recoltes.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const costData = useMemo(() => {
    return items.map(h => ({ date: h.date, cost_per_m2: Number(h.cost_per_m2 ?? 0) }))
  }, [items])

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Récoltes</Typography>

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
          <Button sx={{ ml: 1 }} variant="outlined" onClick={exportCsv}>Export CSV (client)</Button>
        </Grid>
        <Grid item xs={12} md={3}>
          <Select fullWidth value={cultivation} displayEmpty onChange={(e) => setCultivation(e.target.value as any)}>
            <MenuItem value="">Toutes cultures</MenuItem>
            <MenuItem value="serre">Serre</MenuItem>
            <MenuItem value="plein_champ">Plein champ</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <Select fullWidth value={period} onChange={(e) => setPeriod(e.target.value as any)}>
            <MenuItem value="day">Jour</MenuItem>
            <MenuItem value="week">Semaine</MenuItem>
            <MenuItem value="month">Mois</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button variant="outlined" onClick={exportCsvBackend}>Export CSV (serveur agrégé)</Button>
          <Button sx={{ ml:1 }} variant="outlined" onClick={exportExcelBackend}>Export Excel</Button>
        </Grid>
      </Grid>

      <Box mt={3} component={Paper} sx={{ p:2 }}>
        <Typography variant="h6" gutterBottom>Ajouter une récolte</Typography>
        <Grid container spacing={2} alignItems="center" component="form" onSubmit={onSubmit}>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Parcelle" value={form.parcel} onChange={(e) => setForm({ ...form, parcel: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Select fullWidth value={form.cultivation_type} onChange={(e) => setForm({ ...form, cultivation_type: e.target.value as any })} displayEmpty>
              <MenuItem value={'' as any}>Choisir culture</MenuItem>
              <MenuItem value="serre">Serre</MenuItem>
              <MenuItem value="plein_champ">Plein champ</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth type="number" inputProps={{ step: '0.01' }} label="Quantité (kg)" value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: Number(e.target.value) })} required />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth type="number" inputProps={{ step: '0.01' }} label="Surface (m²)" value={form.area_m2} onChange={(e) => setForm({ ...form, area_m2: Number(e.target.value) })} required />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button type="submit" variant="contained">Enregistrer</Button>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6" gutterBottom>Rendement moyen ({period === 'day' ? 'journalier' : period === 'week' ? 'hebdomadaire' : 'mensuel'}) — Serre vs Plein champ</Typography>
            <Box sx={{ width: '100%', height: 320 }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={320} /> : (
              <ResponsiveContainer>
                <LineChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatTick} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {(cultivation === '' || cultivation === 'serre') && (
                    <Line name="Serre" type="monotone" dataKey="avg_yield_kg_per_m2" stroke="#d32f2f" strokeWidth={2} dot={false} data={chartDataSerre} />
                  )}
                  {(cultivation === '' || cultivation === 'plein_champ') && (
                    <Line name="Plein champ" type="monotone" dataKey="avg_yield_kg_per_m2" stroke="#1976d2" strokeWidth={2} dot={false} data={chartDataPlein} />
                  )}
                </LineChart>
              </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6" gutterBottom>Histogramme des coûts/m²</Typography>
            <Box sx={{ width: '100%', height: 320 }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={320} /> : (
              <ResponsiveContainer>
                <BarChart data={costData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatTick} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cost_per_m2" fill="#f57c00" />
                </BarChart>
              </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6" gutterBottom>Volume agrégé ({period === 'day' ? 'journalier' : period === 'week' ? 'hebdomadaire' : 'mensuel'}) {cultivation ? `— ${cultivation === 'serre' ? 'Serre' : 'Plein champ'}` : ''}</Typography>
            <Box sx={{ width: '100%', height: 320 }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={320} /> : (
              <ResponsiveContainer>
                <BarChart data={chartDataVolume}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatTick} />
                  <YAxis />
                  <Tooltip />
                  <Bar name="Volume (kg)" dataKey="sum_quantity_kg" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6" gutterBottom>Volumes par culture (empilé)</Typography>
            <Box sx={{ width: '100%', height: 320 }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={320} /> : (
              <ResponsiveContainer>
                <BarChart data={stackedByCulture}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatTick} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar stackId="1" dataKey="serre" name="Serre" fill="#d32f2f" />
                  <Bar stackId="1" dataKey="plein" name="Plein champ" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6" gutterBottom>Table des récoltes</Typography>
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
    </Box>
  )
}
