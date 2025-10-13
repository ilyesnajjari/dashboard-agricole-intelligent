import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Box, Grid, Paper, Typography } from '@mui/material'
import KPIcard from '../components/KPIcard'

export default function Home() {
  const [health, setHealth] = useState<string>('checking...')

  useEffect(() => {
    fetchHealth()
  }, [])

  const fetchHealth = async () => {
    try {
  const base = (typeof globalThis !== 'undefined' && (globalThis as any).NEXT_PUBLIC_API_BASE) || 'http://localhost:8000/api'
      const res = await fetch(base.replace('/api', '/health/'))
      const data = await res.json()
      setHealth(data.status)
    } catch (e) {
      setHealth('unreachable')
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard Agricole Intelligent</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>API health: <b>{health}</b></Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>KPI</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><Paper sx={{ p:2 }}><KPIcard title="Recettes" value="—" /></Paper></Grid>
          <Grid item xs={12} md={3}><Paper sx={{ p:2 }}><KPIcard title="Dépenses" value="—" /></Paper></Grid>
          <Grid item xs={12} md={3}><Paper sx={{ p:2 }}><KPIcard title="Profit net" value="—" /></Paper></Grid>
          <Grid item xs={12} md={3}><Paper sx={{ p:2 }}><KPIcard title="Rendement (kg/m²)" value="—" /></Paper></Grid>
        </Grid>
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>Navigation</Typography>
        <Grid container spacing={2}>
          {[
            { href: '/produits', label: 'Produits' },
            { href: '/recoltes', label: 'Récoltes' },
            { href: '/ventes', label: 'Ventes' },
            { href: '/achats', label: 'Achats' },
            { href: '/comptabilite', label: 'Comptabilité' },
            { href: '/ia', label: 'Prévisions IA' },
          ].map((l) => (
            <Grid key={l.href} item xs={12} md={4}>
              <Paper sx={{ p:2 }}>
                <Typography variant="subtitle1"><Link href={l.href}>{l.label}</Link></Typography>
                <Typography variant="body2" color="text.secondary">Accéder à {l.label.toLowerCase()}.</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}
