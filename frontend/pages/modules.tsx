import Link from 'next/link'
import { Box, Grid, Paper, Typography } from '@mui/material'

export default function ModulesPage() {
  const links = [
    { href: '/produits', label: 'Produits' },
    { href: '/recoltes', label: 'Récoltes' },
    { href: '/ventes', label: 'Ventes' },
    { href: '/achats', label: 'Achats' },
    { href: '/comptabilite', label: 'Comptabilité' },
    { href: '/plan-demande', label: 'Plan de demande (IA)' },
  ]
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Modules</Typography>
      <Grid container spacing={2}>
        {links.map((l) => (
          <Grid key={l.href} item xs={12} md={4}>
            <Paper sx={{ p:2 }}>
              <Typography variant="subtitle1"><Link href={l.href}>{l.label}</Link></Typography>
              <Typography variant="body2" color="text.secondary">Accéder à {l.label.toLowerCase()}.</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
