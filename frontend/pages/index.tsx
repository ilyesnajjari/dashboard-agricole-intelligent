import { useEffect, useState } from 'react'
import { Box, Grid, Typography, Select, MenuItem, Skeleton, Paper, Button } from '@mui/material'
import Link from 'next/link'
import KPIcard from '../components/KPIcard'
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts'
import { GetServerSideProps } from 'next'
import FloatingWeatherButton from '../components/FloatingWeatherButton'
import DailyTasksWidget from '../components/DailyTasksWidget'

interface Props {
  initialAnnual: any
  initialActivity: any[]
}

export default function Home({ initialAnnual, initialActivity }: Props) {
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [annual, setAnnual] = useState<{ year: number, revenue_total: number, expenses_total: number, profit_total: number, months: { month: string, revenue: number, expenses: number, profit: number }[] } | null>(initialAnnual || null)
  const [recentActivity, setRecentActivity] = useState<any[]>(initialActivity || [])
  const fmtEUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  const loadAnnual = async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const res = await fetch(`${base}/kpi/annual/?year=${year}`, { credentials: 'include', signal })
      const data = await res.json()
      if (!signal?.aborted) setAnnual(data)
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        // keep old data or set null? If error, maybe keep old to avoid flash
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  const loadRecentActivity = async (signal?: AbortSignal) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
      const res = await fetch(`${base}/dashboard/recent-activity/`, { credentials: 'include', signal })
      const data = await res.json()
      if (!signal?.aborted && data.activity) setRecentActivity(data.activity)
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    // Always fetch when year changes
    setAnnual(null)

    const controller = new AbortController()
    loadAnnual(controller.signal)
    loadRecentActivity(controller.signal)
    return () => controller.abort()
  }, [year])

  useEffect(() => {
    // Refresh KPIs periodically (every 15s)
    const id = setInterval(() => {
      const controller = new AbortController()
      loadAnnual(controller.signal)
      loadRecentActivity(controller.signal)
    }, 15000)

    // Listen for global updates
    const handleUpdate = () => {
      const controller = new AbortController()
      loadAnnual(controller.signal)
      loadRecentActivity(controller.signal)
    }
    window.addEventListener('data-updated', handleUpdate)

    return () => {
      clearInterval(id)
      window.removeEventListener('data-updated', handleUpdate)
    }
  }, [year])

  // Quick stats analysis from annual data
  const stats = (() => {
    if (!annual?.months?.length) return null
    const months = annual.months
    const best = months.reduce((a, b) => (a.profit > b.profit ? a : b))
    const worst = months.reduce((a, b) => (a.profit < b.profit ? a : b))
    const avgProfit = months.reduce((s, m) => s + m.profit, 0) / months.length
    // simple trend = last 3 months avg vs first 3 months avg
    const first3 = months.slice(0, 3).reduce((s, m) => s + m.profit, 0) / Math.max(1, Math.min(3, months.length))
    const last3 = months.slice(-3).reduce((s, m) => s + m.profit, 0) / Math.max(1, Math.min(3, months.length))
    const trendUp = last3 >= first3
    return { best, worst, avgProfit, trendUp }
  })()

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Tableau de Bord</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" color="primary" component={Link} href="/recoltes">Nouvelle Récolte</Button>
          <Button variant="contained" color="secondary" component={Link} href="/ventes">Nouvelle Vente</Button>
          <Button variant="outlined" component={Link} href="/achats">Nouvel Achat</Button>
          <Button variant="text" component={Link} href="/budget">Budget & Rapports</Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography>Année</Typography>
        <Select size="small" value={year} onChange={(e) => setYear(e.target.value as any)}>
          {[0, 1, 2, 3].map(offset => {
            const y = new Date().getFullYear() - offset
            return <MenuItem key={y} value={y}>{y}</MenuItem>
          })}
        </Select>
      </Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Chiffres clés ({year})</Typography>
        {loading && !annual ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} /></Grid>
            <Grid item xs={12} md={4}><Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} /></Grid>
            <Grid item xs={12} md={4}><Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} /></Grid>
          </Grid>
        ) : annual ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><KPIcard title="Ventes" value={fmtEUR.format(annual.revenue_total)} tone="success" /></Grid>
            <Grid item xs={12} md={4}><KPIcard title="Dépenses" value={fmtEUR.format(annual.expenses_total)} tone="warning" /></Grid>
            <Grid item xs={12} md={4}><KPIcard title="Bénéfice" value={fmtEUR.format(annual.profit_total)} tone="info" /></Grid>
          </Grid>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} /></Grid>
            <Grid item xs={12} md={4}><Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} /></Grid>
            <Grid item xs={12} md={4}><Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} /></Grid>
          </Grid>
        )}
      </Box>

      {/* Daily Tasks Widget */}
      <Box sx={{ mb: 3 }}>
        <DailyTasksWidget />
      </Box>

      {/* Floating Weather Button */}
      <FloatingWeatherButton />

      <Box>
        <Typography variant="h6" gutterBottom>Comparaison mensuelle</Typography>
        {loading && !annual ? (
          <Skeleton variant="rounded" width="100%" height={320} />
        ) : annual ? (
          <Box sx={{ width: '100%', height: 360, contain: 'layout paint' }}>
            <ResponsiveContainer>
              <BarChart data={annual.months}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tickFormatter={(v: string) => {
                  try { return new Date(v + '-01').toLocaleDateString('fr-FR', { month: 'short' }) } catch { return v }
                }} />
                <YAxis tickFormatter={(v: number) => fmtEUR.format(v)} />
                <Tooltip formatter={(value: any, name: any) => [fmtEUR.format(Number(value) || 0), name]} />
                <Legend />
                <Bar dataKey="revenue" name="Recettes" fill="#2e7d32" isAnimationActive={false} />
                <Bar dataKey="expenses" name="Dépenses" fill="#c62828" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Skeleton variant="rounded" width="100%" height={320} />
        )}
      </Box>

      {/* Analyse des statistiques */}
      {annual && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Analyse des statistiques</Typography>
          <Paper sx={{ p: 2 }}>
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

      {/* Activité Récente */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>Activité Récente</Typography>
        <Paper sx={{ p: 0 }}>
          {recentActivity.length === 0 ? (
            <Box p={2}><Typography color="text.secondary">Aucune activité récente.</Typography></Box>
          ) : (
            recentActivity.map((item, i) => (
              <Box key={i} sx={{ p: 2, borderBottom: i < recentActivity.length - 1 ? '1px solid #eee' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>{item.action}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.detail} • {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </Typography>
                </Box>
                <Typography fontWeight={700} sx={{ color: item.color }}>{item.amount}</Typography>
              </Box>
            ))
          )}
        </Paper>
      </Box>
    </Box>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req } = context
  const year = new Date().getFullYear()
  // Use localhost for server-side fetch if not defined
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'

  const cookie = req.headers.cookie || ''

  try {
    const [annualRes, activityRes] = await Promise.all([
      fetch(`${base}/kpi/annual/?year=${year}`, { headers: { cookie } }),
      fetch(`${base}/dashboard/recent-activity/`, { headers: { cookie } })
    ])

    const initialAnnual = annualRes.ok ? await annualRes.json() : null
    const initialActivityData = activityRes.ok ? await activityRes.json() : {}
    const initialActivity = initialActivityData.activity || []

    return {
      props: {
        initialAnnual,
        initialActivity
      }
    }
  } catch (e) {
    console.error('SSR Error:', e)
    return {
      props: {
        initialAnnual: null,
        initialActivity: []
      }
    }
  }
}
