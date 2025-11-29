import { useEffect, useMemo, useState } from 'react'
import { createHarvest, listHarvests, updateHarvest, aggregateHarvests, deleteHarvest, type Harvest, type HarvestAggregateRow } from '../api/harvests'
import { listProducts, type Product } from '../api/products'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts'
import {
  Box, Button, Grid, MenuItem, Select, TextField, Typography, Snackbar, Alert, Paper, Skeleton, Chip,
  ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, FormControl, InputLabel, CircularProgress
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import Link from 'next/link'
import { DataGrid, GridColDef, GridRowModel, GridValueGetter } from '@mui/x-data-grid'

export default function RecoltesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [items, setItems] = useState<Harvest[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState<Harvest>({ product: 0, date: new Date().toISOString().slice(0, 10), quantity_kg: 0, area_m2: 0, cultivation_type: 'plein_champ' })
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [cultivation, setCultivation] = useState<'serre' | 'plein_champ' | ''>('')
  const [toast, setToast] = useState<{ open: boolean, msg: string, severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' })
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [aggAll, setAggAll] = useState<HarvestAggregateRow[]>([])
  const [aggSerre, setAggSerre] = useState<HarvestAggregateRow[]>([])
  const [aggPlein, setAggPlein] = useState<HarvestAggregateRow[]>([])
  const [localFallback, setLocalFallback] = useState(false)

  const [stackMode, setStackMode] = useState<'stacked' | 'grouped'>('stacked')

  // Dynamic product management state
  const [openNewProductDialog, setOpenNewProductDialog] = useState(false)
  const [newProductName, setNewProductName] = useState('')

  useEffect(() => {
    (async () => {
      const p = await listProducts()
      setProducts(p)
      if (p.length) {
        setSelectedProducts([p[0].id!])
        setForm(f => ({ ...f, product: p[0].id! }))
      }
    })()
  }, [])

  useEffect(() => {
    if (!selectedProducts || selectedProducts.length === 0) return
    const controller = new AbortController()
    refresh(controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProducts, fromDate, toDate, cultivation])

  const refresh = async (signal?: AbortSignal) => {
    if (!selectedProducts || selectedProducts.length === 0) {
      // clear any previously displayed data when no product is selected
      setItems([])
      setAggAll([])
      setAggSerre([])
      setAggPlein([])
      setLocalFallback(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      // If multiple products are selected, fetch each and merge results client-side
      let allItems: Harvest[] = []
      if (selectedProducts.length === 1) {
        const params: any = { product: Number(selectedProducts[0]) }
        if (fromDate) params['date__gte'] = fromDate
        if (toDate) params['date__lte'] = toDate
        if (cultivation) params['cultivation_type'] = cultivation
        const data = await listHarvests(params, signal)
        allItems = data
      } else {
        const promises = selectedProducts.map(id => {
          const params: any = { product: Number(id) }
          if (fromDate) params['date__gte'] = fromDate
          if (toDate) params['date__lte'] = toDate
          if (cultivation) params['cultivation_type'] = cultivation
          return listHarvests(params, signal)
        })
        const arrays = await Promise.all(promises)
        allItems = arrays.flat()
      }
      if (signal?.aborted) return
      setItems(allItems)
      // update aggregates after loading items to ensure local fallback has data
      try { await refreshAggregates(allItems, signal) } catch (e) { /* ignore */ }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setErr(e?.message ?? 'Erreur chargement récoltes')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  // Load aggregated series (all + by culture)
  const refreshAggregates = async (itemsSource?: Harvest[], signal?: AbortSignal) => {
    if (!selectedProducts || selectedProducts.length === 0 || !selectedProducts[0]) return
    try {
      let usedFallback = false
      const argsBaseCommon = { period, date__gte: fromDate || undefined, date__lte: toDate || undefined } as const
      const computeLocalAggregates = (filterCult?: 'serre' | 'plein_champ' | undefined) => {
        const src = (itemsSource ?? items).filter(it => (!filterCult || it.cultivation_type === filterCult))
        if (!src.length) return [] as HarvestAggregateRow[]
        // group by period key
        const map = new Map<string, { sum_quantity_kg: number; sum_area_m2: number }>()
        src.forEach(it => {
          let key = it.date
          if (period === 'week') {
            // use ISO week string YYYY-Www
            const d = new Date(it.date)
            const y = d.getFullYear()
            const week = (function (dt) {
              const t = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
              const dayNum = t.getUTCDay() || 7
              t.setUTCDate(t.getUTCDate() + 4 - dayNum)
              const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
              return Math.ceil((((t as any) - (yearStart as any)) / 86400000 + 1) / 7)
            })(d)
            key = `${y}-W${String(week).padStart(2, '0')}`
          } else if (period === 'month') {
            key = it.date.slice(0, 7)
          }
          const prev = map.get(key) || { sum_quantity_kg: 0, sum_area_m2: 0 }
          prev.sum_quantity_kg += Number(it.quantity_kg || 0)
          prev.sum_area_m2 += Number(it.area_m2 || 0)
          map.set(key, prev)
        })
        const arr: HarvestAggregateRow[] = Array.from(map.entries()).map(([k, v]) => ({ date: k, sum_quantity_kg: v.sum_quantity_kg, avg_yield_kg_per_m2: v.sum_area_m2 > 0 ? v.sum_quantity_kg / v.sum_area_m2 : 0 }))
        return arr.sort((a, b) => a.date.localeCompare(b.date))
      }
      // If multiple products selected, call aggregate endpoint per product and merge by date
      if (selectedProducts.length <= 1) {
        const prod = selectedProducts[0]
        const argsBase = { product: Number(prod), ...argsBaseCommon } as const
        const [all, serre, plein] = await Promise.all([
          aggregateHarvests(argsBase as any, signal),
          aggregateHarvests({ ...(argsBase as any), cultivation_type: 'serre' }, signal),
          aggregateHarvests({ ...(argsBase as any), cultivation_type: 'plein_champ' }, signal),
        ])
        if (signal?.aborted) return
        setAggAll(all)
        if (serre.length) {
          setAggSerre(serre)
        } else {
          setAggSerre(computeLocalAggregates('serre'))
          usedFallback = true
        }
        if (plein.length) {
          setAggPlein(plein)
        } else {
          setAggPlein(computeLocalAggregates('plein_champ'))
          usedFallback = true
        }
      } else {
        // merge aggregate arrays from multiple product ids
        const mergeArrays = (arrays: HarvestAggregateRow[][]) => {
          const map = new Map<string, { sum_quantity_kg: number; sum_area_m2: number }>()
          arrays.forEach(arr => arr.forEach(r => {
            const existing = map.get(r.date) || { sum_quantity_kg: 0, sum_area_m2: 0 }
            existing.sum_quantity_kg += Number(r.sum_quantity_kg || 0)
            // approximate sum_area_m2 from avg_yield if possible
            existing.sum_area_m2 += r.avg_yield_kg_per_m2 > 0 ? (Number(r.sum_quantity_kg || 0) / r.avg_yield_kg_per_m2) : 0
            map.set(r.date, existing)
          }))
          return Array.from(map.entries()).map(([k, v]) => ({ date: k, sum_quantity_kg: v.sum_quantity_kg, avg_yield_kg_per_m2: v.sum_area_m2 > 0 ? v.sum_quantity_kg / v.sum_area_m2 : 0 }))
        }

        // for 'all'
        const allPromises = selectedProducts.map(id => aggregateHarvests({ product: Number(id), ...argsBaseCommon } as any, signal))
        const serrePromises = selectedProducts.map(id => aggregateHarvests({ product: Number(id), ...argsBaseCommon, cultivation_type: 'serre' } as any, signal))
        const pleinPromises = selectedProducts.map(id => aggregateHarvests({ product: Number(id), ...argsBaseCommon, cultivation_type: 'plein_champ' } as any, signal))
        const [allArrays, serreArrays, pleinArrays] = await Promise.all([
          Promise.all(allPromises),
          Promise.all(serrePromises),
          Promise.all(pleinPromises),
        ])
        if (signal?.aborted) return
        const mergedAll = mergeArrays(allArrays)
        const mergedSerre = mergeArrays(serreArrays)
        const mergedPlein = mergeArrays(pleinArrays)
        setAggAll(mergedAll.sort((a, b) => a.date.localeCompare(b.date)))
        if (mergedSerre.length) {
          setAggSerre(mergedSerre.sort((a, b) => a.date.localeCompare(b.date)))
        } else {
          setAggSerre(computeLocalAggregates('serre'))
          usedFallback = true
        }
        if (mergedPlein.length) {
          setAggPlein(mergedPlein.sort((a, b) => a.date.localeCompare(b.date)))
        } else {
          setAggPlein(computeLocalAggregates('plein_champ'))
          usedFallback = true
        }
      }
      setLocalFallback(usedFallback)
    } catch (e) {
      // silent
    }
  }

  useEffect(() => {
    const ac = new AbortController()
    refreshAggregates(undefined, ac.signal)
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

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
    return arr.sort((a, b) => a.date.localeCompare(b.date))
  }, [aggSerre, aggPlein, cultivation])

  // Helper for charts
  const formatTick = (tick: string) => {
    try {
      return new Date(tick).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    } catch {
      return tick
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createHarvest(form)
      setToast({ open: true, msg: 'Récolte enregistrée', severity: 'success' })
      setForm(f => ({ ...f, quantity_kg: 0, area_m2: 0 }))
      refresh()
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur: ' + (e?.message ?? ''), severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddProduct = async () => {
    if (!newProductName.trim()) return
    setSubmitting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const res = await fetch(`${apiBase}/products/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newProductName.trim(),
          category: 'vegetable' // Default category to satisfy model requirement
        })
      })
      if (res.ok) {
        const newProd = await res.json()
        setProducts(prev => [...prev, newProd])
        setSelectedProducts([newProd.id])
        setForm(f => ({ ...f, product: newProd.id }))
        setOpenNewProductDialog(false)
        setNewProductName('')
        setToast({ open: true, msg: 'Produit ajouté', severity: 'success' })
      } else {
        const errData = await res.json().catch(() => ({}))
        const errMsg = errData.detail || JSON.stringify(errData) || 'Erreur ajout produit'
        throw new Error(errMsg)
      }
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur: ' + (e?.message ?? ''), severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean, id: number | null }>({ open: false, id: null })

  const handleDeleteProduct = (id: number) => {
    setDeleteConfirm({ open: true, id })
  }

  const confirmDeleteProduct = async () => {
    const id = deleteConfirm.id
    if (!id) return
    setSubmitting(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const res = await fetch(`${apiBase}/products/${id}/`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id))
        setSelectedProducts([])
        setItems([])
        setToast({ open: true, msg: 'Produit supprimé', severity: 'success' })
      } else {
        throw new Error('Erreur suppression')
      }
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur: ' + (e?.message ?? ''), severity: 'error' })
    } finally {
      setDeleteConfirm({ open: false, id: null })
      setSubmitting(false)
    }
  }

  const [deleteHarvestConfirm, setDeleteHarvestConfirm] = useState<{ open: boolean, id: number | null }>({ open: false, id: null })

  const confirmDeleteHarvest = async () => {
    const id = deleteHarvestConfirm.id
    if (!id) return
    setSubmitting(true)
    try {
      await deleteHarvest(id)
      setToast({ open: true, msg: 'Récolte supprimée', severity: 'success' })
      refresh()
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur: ' + (e?.message ?? ''), severity: 'error' })
    } finally {
      setDeleteHarvestConfirm({ open: false, id: null })
      setSubmitting(false)
    }
  }

  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', flex: 1, editable: false },
    // 'parcel' column removed per request
    {
      field: 'cultivation_type',
      headerName: 'Culture',
      flex: 1,
      editable: true,
      type: 'singleSelect',
      valueOptions: ['serre', 'plein_champ']
    },
    {
      field: 'quantity_kg',
      headerName: 'Quantité (kg)',
      type: 'number',
      flex: 1,
      editable: true
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      width: 120,
      renderCell: (params) => {
        const onDelete = () => {
          setDeleteHarvestConfirm({ open: true, id: Number(params.row.id) })
        }
        return (
          <Button color="error" onClick={onDelete}>Supprimer</Button>
        )
      }
    },
  ]

  const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    try {
      const changed: any = {}
        ; (['cultivation_type', 'quantity_kg'] as const).forEach(k => {
          if (newRow[k] !== oldRow[k]) changed[k] = newRow[k]
        })
      if (Object.keys(changed).length) {
        await updateHarvest(Number(newRow.id), changed)
        setToast({ open: true, msg: 'Récolte mise à jour', severity: 'success' })
        await refresh()
      }
      return newRow
    } catch (e: any) {
      setToast({ open: true, msg: 'Erreur maj: ' + (e?.message ?? ''), severity: 'error' })
      throw e
    }
  }


  // Removed costs per m² chart per request
  // Helper: format kilograms
  const formatKg = (v?: number) => {
    if (v === undefined || v === null) return '0 kg'
    try { return Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' kg' } catch { return String(v) + ' kg' }
  }

  // Custom tooltip for bar charts (modern look)
  function CustomBarTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null
    return (
      <Paper sx={{ p: 1, minWidth: 160 }}>
        <Typography variant="subtitle2">{formatTick(String(label))}</Typography>
        {payload.map((p: any) => (
          <Box key={p.name} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 0.5 }}>
            <Typography variant="body2" sx={{ color: p.color }}>{p.name}</Typography>
            <Typography variant="body2"><strong>{formatKg(p.value)}</strong></Typography>
          </Box>
        ))}
      </Paper>
    )
  }
  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h4" gutterBottom sx={{ m: 0 }}>Récoltes</Typography>
      </Box>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <Select
            fullWidth
            value={selectedProducts.length ? selectedProducts[0] : ''}
            onChange={(e) => {
              const val = e.target.value
              if (val === '__NEW__') {
                setOpenNewProductDialog(true)
              } else if (val === '' || val === null) {
                setSelectedProducts([])
                setItems([])
                setAggAll([])
                setAggSerre([])
                setAggPlein([])
                setLocalFallback(false)
                setForm(f => ({ ...f, product: 0 }))
              } else {
                const id = Number(val)
                if (!isNaN(id)) {
                  setSelectedProducts([id])
                  setForm(f => ({ ...f, product: id }))
                }
              }
            }}
            displayEmpty
          >
            <MenuItem value="">-- Choisir un produit --</MenuItem>
            <MenuItem value="__NEW__" sx={{ fontStyle: 'italic', color: 'primary.main' }}>+ Ajouter un nouveau produit...</MenuItem>
            {products.map(p => (
              <MenuItem key={p.id} value={p.id!} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{p.name}</span>
                <IconButton
                  size="small"
                  color="error"
                  disableRipple
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleDeleteProduct(p.id!)
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth type="date" label="Du" InputLabelProps={{ shrink: true }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth type="date" label="Au" InputLabelProps={{ shrink: true }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={() => refresh()}>Filtrer</Button>
          <Button variant="outlined" onClick={() => { setFromDate(''); setToDate(''); setCultivation(''); refresh() }}>Reset</Button>
        </Grid>
        <Grid item xs={12} md={3}>
          <Select fullWidth value={cultivation} displayEmpty onChange={(e) => setCultivation(e.target.value as any)}>
            <MenuItem value="">Toutes cultures</MenuItem>
            <MenuItem value="serre">Serre</MenuItem>
            <MenuItem value="plein_champ">Plein champ</MenuItem>
          </Select>
        </Grid>
        {/* Period selector removed — period remains fixed to 'day' */}
        <Grid item xs={12} md={3}>
          <ToggleButtonGroup
            value={stackMode}
            exclusive
            size="small"
            onChange={(_, v) => { if (v) setStackMode(v) }}
            aria-label="stack-mode"
          >
            <ToggleButton value="stacked">Empilé</ToggleButton>
            <ToggleButton value="grouped">Groupé</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
        <Grid item xs={12} md={3}>
          {/* Export CSV/Excel buttons removed */}
        </Grid>
        <Grid item xs={12}>
          {localFallback && (
            <Chip label="Données calculées localement" color="warning" size="small" sx={{ mt: 1 }} />
          )}
        </Grid>
      </Grid>

      <Box mt={3} component={Paper} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Ajouter une récolte</Typography>
        <Grid container spacing={2} alignItems="center" component="form" onSubmit={onSubmit}>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </Grid>
          {/* Parcelle field removed per request */}
          <Grid item xs={12} md={3}>
            <Select fullWidth value={form.cultivation_type} onChange={(e) => setForm({ ...form, cultivation_type: e.target.value as any })} displayEmpty>
              <MenuItem value={'' as any}>Choisir culture</MenuItem>
              <MenuItem value="serre">Serre</MenuItem>
              <MenuItem value="plein_champ">Plein champ</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="number"
              inputProps={{ step: '1' }}
              label="Quantité (kg)"
              value={form.quantity_kg}
              onChange={(e) => setForm({ ...form, quantity_kg: Number(e.target.value) })}
              onFocus={(e) => e.target.value === '0' && setForm({ ...form, quantity_kg: '' as any })}
              required
            />
          </Grid>
          {/* Surface (m²) removed per request */}
          <Grid item xs={12} md={2}>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Enregistrer'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2} mt={1}>
        {/* Rendement moyen chart removed as requested. */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, boxShadow: 3, borderRadius: 2, minHeight: 360, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Parts par culture</Typography>
            <Box sx={{ width: '100%', height: 320 }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={320} /> : (
                (() => {
                  const totalSerre = aggSerre.reduce((s, r) => s + (r.sum_quantity_kg || 0), 0)
                  const totalPlein = aggPlein.reduce((s, r) => s + (r.sum_quantity_kg || 0), 0)
                  const total = totalSerre + totalPlein
                  if (!total) return <Typography variant="body2" color="text.secondary">Pas assez de données pour afficher le camembert.</Typography>
                  // If a specific cultivation is selected, show only that culture's slice
                  const showCult = cultivation === 'serre' || cultivation === 'plein_champ'
                  const data = showCult
                    ? [{ name: cultivation === 'serre' ? 'Serre' : 'Plein champ', value: cultivation === 'serre' ? totalSerre : totalPlein }]
                    : [
                      { name: 'Serre', value: totalSerre },
                      { name: 'Plein champ', value: totalPlein }
                    ]
                  const COLORS = showCult ? [cultivation === 'serre' ? '#d32f2f' : '#1976d2'] : ['#d32f2f', '#1976d2']
                  return (
                    <ResponsiveContainer>
                      <PieChart>
                        {/* Gradient defs for a softer look */}
                        <defs>
                          <linearGradient id="gSerre" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#f44336" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#d32f2f" stopOpacity={0.95} />
                          </linearGradient>
                          <linearGradient id="gPlein" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#64b5f6" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#1976d2" stopOpacity={0.95} />
                          </linearGradient>
                        </defs>
                        <Pie
                          data={data}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={showCult ? 80 : 60}
                          outerRadius={showCult ? 120 : 100}
                          paddingAngle={4}
                          cornerRadius={8}
                          label={({ name, percent }) => `${name} (${Math.round((percent || 0) * 100)}%)`}
                        >
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={showCult ? (entry.name === 'Serre' ? 'url(#gSerre)' : 'url(#gPlein)') : (index === 0 ? 'url(#gSerre)' : 'url(#gPlein)')} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toFixed(0)} kg`} contentStyle={{ borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                })()
              )}
            </Box>
          </Paper>
        </Grid>
        {/* Costs per m² chart removed per request */}
        {/* 'Volume agrégé' chart removed per request */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, boxShadow: 3, borderRadius: 2, minHeight: 360, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Volumes par culture (empilé)</Typography>
            <Box sx={{ width: '100%', height: 320 }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={320} /> : (
                <ResponsiveContainer>
                  <BarChart data={stackedByCulture} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.6} />
                    <XAxis dataKey="date" tickFormatter={formatTick} />
                    <YAxis />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend verticalAlign="top" height={36} />
                    {stackMode === 'stacked' ? (
                      <>
                        <Bar stackId="1" dataKey="serre" name="Serre" fill="#d32f2f" radius={[6, 6, 0, 0]} animationDuration={800} />
                        <Bar stackId="1" dataKey="plein" name="Plein champ" fill="#1976d2" radius={[6, 6, 0, 0]} animationDuration={800} />
                      </>
                    ) : (
                      <>
                        <Bar dataKey="serre" name="Serre" fill="#d32f2f" radius={[6, 6, 0, 0]} barSize={18} animationDuration={800} />
                        <Bar dataKey="plein" name="Plein champ" fill="#1976d2" radius={[6, 6, 0, 0]} barSize={18} animationDuration={800} />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2, minHeight: 360, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Table des récoltes</Typography>
            <Box sx={{ width: '100%', flex: 1 }}>
              {loading ? <Skeleton variant="rounded" width="100%" height={320} /> : (
                <div style={{ width: '100%', height: '100%' }}>
                  <DataGrid
                    rows={items}
                    columns={columns}
                    getRowId={(r) => r.id!}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                    disableRowSelectionOnClick
                    processRowUpdate={processRowUpdate}
                    sx={{ height: '100%' }}
                  />
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <Typography variant="h6">
                      Total: <strong>{items.reduce((sum, item) => sum + Number(item.quantity_kg || 0), 0).toFixed(0)} kg</strong>
                    </Typography>
                  </Box>
                </div>
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
      <Dialog open={openNewProductDialog} onClose={() => setOpenNewProductDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouveau Produit</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom du produit"
            fullWidth
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            placeholder="Ex: Tomate, Courgette..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewProductDialog(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={handleAddProduct} variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null })}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Voulez-vous vraiment supprimer ce produit et toutes ses récoltes ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null })} disabled={submitting}>Annuler</Button>
          <Button onClick={confirmDeleteProduct} color="error" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteHarvestConfirm.open} onClose={() => setDeleteHarvestConfirm({ open: false, id: null })}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Voulez-vous vraiment supprimer cette récolte ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteHarvestConfirm({ open: false, id: null })} disabled={submitting}>Annuler</Button>
          <Button onClick={confirmDeleteHarvest} color="error" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  )
}
