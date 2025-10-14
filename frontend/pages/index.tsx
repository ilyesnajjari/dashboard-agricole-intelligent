import { useEffect, useState } from 'react'
import { Box, Grid, Typography, Select, MenuItem, Skeleton, Button, Paper, List, ListItem, ListItemText, Chip } from '@mui/material'
import { getDemandPlan, type DemandPlanItem } from '../api/ai'
import KPIcard from '../components/KPIcard'
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts'

export default function Home() {
  const [health, setHealth] = useState<string>('checking...')
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [annual, setAnnual] = useState<{ year: number, revenue_total: number, expenses_total: number, profit_total: number, months: { month: string, revenue: number, expenses: number, profit: number }[] } | null>(null)
  const [dpLoading, setDpLoading] = useState(false)
  const [demandPlan, setDemandPlan] = useState<{ date: string; items: DemandPlanItem[] } | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const fmtEUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  useEffect(() => {
    fetchHealth()
  }, [])

  const fetchHealth = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const healthUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) + '/health/' : (apiBase.replace('/api', '') + '/health/')
      const res = await fetch(healthUrl)
      const data = await res.json()
      setHealth(data.status)
    } catch (e) {
      setHealth('unreachable')
    }
  }

  const loadAnnual = async () => {
    setLoading(true)
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
  const res = await fetch(`${base}/kpi/annual/?year=${year}`, { credentials: 'include' })
      const data = await res.json()
      setAnnual(data)
    } catch (e) {
      setAnnual(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAnnual() }, [year])
  useEffect(() => {
    // Refresh KPIs periodically (every 15s)
    const id = setInterval(() => { loadAnnual() }, 15000)
    return () => clearInterval(id)
  }, [year])

  useEffect(() => {
    // Charger un aperçu du plan de demande (IA) pour aujourd'hui
    ;(async () => {
      setDpLoading(true)
      try {
        const today = new Date().toISOString().slice(0,10)
        const dp = await getDemandPlan(today, 5)
        setDemandPlan(dp)
        setLastUpdated(new Date())
      } catch {
        setDemandPlan(null)
      } finally { setDpLoading(false) }
    })()
  }, [])
  useEffect(() => {
    // Refresh demand plan periodically (every 30s)
    const id = setInterval(async () => {
      try {
        const today = new Date().toISOString().slice(0,10)
        const dp = await getDemandPlan(today, 5)
        setDemandPlan(dp)
        setLastUpdated(new Date())
      } catch {}
    }, 30000)
    return () => clearInterval(id)
  }, [])

  // Quick stats analysis from annual data
  const stats = (() => {
    if (!annual?.months?.length) return null
    const months = annual.months
    const best = months.reduce((a, b) => (a.profit > b.profit ? a : b))
    const worst = months.reduce((a, b) => (a.profit < b.profit ? a : b))
    const avgProfit = months.reduce((s, m) => s + m.profit, 0) / months.length
    // simple trend = last 3 months avg vs first 3 months avg
    const first3 = months.slice(0,3).reduce((s,m)=>s+m.profit,0)/Math.max(1,Math.min(3,months.length))
    const last3 = months.slice(-3).reduce((s,m)=>s+m.profit,0)/Math.max(1,Math.min(3,months.length))
    const trendUp = last3 >= first3
    return { best, worst, avgProfit, trendUp }
  })()

  // Monte Carlo on monthly profits to estimate risk/opportunity quickly
  function monteCarlo(profits: number[], runs = 5000) {
    if (!profits.length) return null
    const samples: number[] = []
    for (let i = 0; i < runs; i++) {
      // resample 12 months with replacement
      let total = 0
      for (let m = 0; m < 12; m++) {
        const x = profits[Math.floor(Math.random() * profits.length)]
        total += x
      }
      samples.push(total)
    }
    samples.sort((a,b)=>a-b)
    const q = (p: number) => samples[Math.floor((samples.length-1)*p)]
    const p5 = q(0.05)
    const p50 = q(0.5)
    const p95 = q(0.95)
    const probPositive = samples.filter(v => v > 0).length / samples.length
    return { p5, p50, p95, probPositive }
  }
  const mc = annual?.months ? monteCarlo(annual.months.map(m => m.profit)) : null

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Budget annuel</Typography>
      {lastUpdated && (
        <Chip size="small" label={`Mis à jour: ${lastUpdated.toLocaleTimeString('fr-FR')}`} sx={{ ml: 1 }} />
      )}
      <Typography variant="body1" sx={{ mb: 2 }}>API: <b>{health}</b></Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography>Année</Typography>
        <Select size="small" value={year} onChange={(e) => setYear(e.target.value as any)}>
          {[0,1,2,3].map(offset => {
            const y = new Date().getFullYear() - offset
            return <MenuItem key={y} value={y}>{y}</MenuItem>
          })}
        </Select>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Chiffres clés ({year})</Typography>
        {loading || !annual ? (
          <Skeleton variant="rounded" width="100%" height={100} />
        ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><KPIcard title="Chiffre d'affaires" value={fmtEUR.format(annual.revenue_total)} tone="success" /></Grid>
          <Grid item xs={12} md={4}><KPIcard title="Dépenses" value={fmtEUR.format(annual.expenses_total)} tone="warning" /></Grid>
          <Grid item xs={12} md={4}><KPIcard title="Bénéfice" value={fmtEUR.format(annual.profit_total)} tone={annual.profit_total >= 0 ? 'success' : 'error'} /></Grid>
        </Grid>
        )}
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>Comparaison mensuelle</Typography>
        {loading || !annual ? (
          <Skeleton variant="rounded" width="100%" height={320} />
        ) : (
        <Box sx={{ width: '100%', height: 360 }}>
          <ResponsiveContainer>
            <BarChart data={annual.months}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={(v: string) => {
                try { return new Date(v + '-01').toLocaleDateString('fr-FR', { month: 'short' }) } catch { return v }
              }} />
              <YAxis tickFormatter={(v: number) => fmtEUR.format(v)} />
              <Tooltip formatter={(value: any, name: any) => [fmtEUR.format(Number(value) || 0), name]} />
              <Legend />
              <Bar dataKey="revenue" name="Recettes" fill="#2e7d32" />
              <Bar dataKey="expenses" name="Dépenses" fill="#c62828" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
        )}
      </Box>

      {/* Analyse des statistiques */}
      {annual && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Analyse des statistiques</Typography>
          <Paper sx={{ p:2 }}>
            {stats ? (
              <>
                <Typography>Meilleur mois: <b>{new Date(stats.best.month + '-01').toLocaleDateString('fr-FR', { month: 'long' })}</b> ({fmtEUR.format(stats.best.profit)})</Typography>
                <Typography>Pire mois: <b>{new Date(stats.worst.month + '-01').toLocaleDateString('fr-FR', { month: 'long' })}</b> ({fmtEUR.format(stats.worst.profit)})</Typography>
                <Typography>Bénéfice moyen mensuel: <b>{fmtEUR.format(stats.avgProfit)}</b></Typography>
                <Typography>Tendance: <b style={{ color: stats.trendUp ? '#2e7d32' : '#c62828' }}>{stats.trendUp ? 'Hausse' : 'Baisse'}</b></Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">Pas assez de données pour l'analyse.</Typography>
            )}
          </Paper>
        </Box>
      )}

      {/* Monte Carlo rapide */}
      {annual && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Simulation Monte Carlo</Typography>
          <Paper sx={{ p:2 }}>
            {mc ? (
              <>
                <Typography>P5: <b>{fmtEUR.format(mc.p5)}</b> — Médiane: <b>{fmtEUR.format(mc.p50)}</b> — P95: <b>{fmtEUR.format(mc.p95)}</b></Typography>
                <Typography>Probabilité d'être bénéficiaire: <b>{(mc.probPositive*100).toFixed(1)}%</b></Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">Pas assez de données pour simuler.</Typography>
            )}
          </Paper>
        </Box>
      )}

      {/* Plan de demande (IA) - aperçu */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>Plan de demande (IA)</Typography>
        {dpLoading ? (
          <Skeleton variant="rounded" width="100%" height={120} />
        ) : demandPlan && demandPlan.items?.length ? (
          <Paper sx={{ p:2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Date: {demandPlan.date}</Typography>
            <List dense>
              {demandPlan.items.slice(0,5).map((it, idx) => (
                <ListItem key={idx} sx={{ px: 0 }}>
                  <ListItemText primary={`${it.product_name} — ${it.quantity_estimate.toFixed(0)} unités (plage ${it.low}-${it.high})`} secondary={it.price_estimate ? `Prix estimé: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(it.price_estimate)}` : undefined} />
                </ListItem>
              ))}
            </List>
            <Button size="small" variant="text" href="/plan-demande">Ouvrir le plan de demande</Button>
          </Paper>
        ) : (
          <Paper sx={{ p:2 }}>
            <Typography variant="body2" color="text.secondary">Aucune donnée de plan de demande disponible pour le moment.</Typography>
            <Button size="small" variant="text" href="/plan-demande" sx={{ mt: 1 }}>Ouvrir le plan de demande</Button>
          </Paper>
        )}
      </Box>
    </Box>
  )
}
