import React from 'react'
import Link from 'next/link'
import { AppBar, Box, Button, Container, IconButton, Toolbar, Typography, MenuItem, Select, Tooltip } from '@mui/material'
import { listUsersForImpersonation, startImpersonation, stopImpersonation } from '../api/admin'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { ColorModeContext } from '../theme'

type Props = { children: React.ReactNode }

export default function Layout({ children }: Props) {
  const { mode, toggle } = React.useContext(ColorModeContext)
  const [me, setMe] = React.useState<any>(null)
  const [users, setUsers] = React.useState<any[]>([])
  const [selected, setSelected] = React.useState<number | ''>('')

  React.useEffect(() => {
    ;(async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
        const res = await fetch(base + '/me/', { credentials: 'include' })
        const data = await res.json()
        setMe(data)
        if (data.is_staff) {
          const u = await listUsersForImpersonation()
          setUsers(u.users || [])
        }
      } catch (e) {
        // ignore
      }
    })()
  }, [])
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <AppBar position="static" color="primary">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Dashboard Agricole</Typography>
          <Button color="inherit" component={Link} href="/">Accueil</Button>
          <Button color="inherit" component={Link} href="/produits">Produits</Button>
          <Button color="inherit" component={Link} href="/recoltes">Récoltes</Button>
          <Button color="inherit" component={Link} href="/ventes">Ventes</Button>
          {!me || !me.is_authenticated ? (
            <Button color="inherit" component={Link} href="/login">Se connecter</Button>
          ) : (
            <Button color="inherit" onClick={async () => { const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'; await fetch(base + '/logout/', { method: 'POST', credentials: 'include' }); window.location.reload() }}>Se déconnecter</Button>
          )}
          {me && me.is_impersonating && (
            <Tooltip title={`Impersonating ${me.impersonated_username}`}>
              <Typography variant="caption" sx={{ mx: 1, color: 'warning.main' }}>Impers: {me.impersonated_username}</Typography>
            </Tooltip>
          )}
          {me && me.is_staff && (
            <>
              <Select size="small" value={selected} onChange={(e) => setSelected(e.target.value as any)} sx={{ mr: 1, color: 'inherit' }}>
                <MenuItem value="">Impersonate...</MenuItem>
                {users.map(u => <MenuItem key={u.id} value={u.id}>{u.username}</MenuItem>)}
              </Select>
              <Button color="inherit" onClick={async () => { if (selected) { await startImpersonation(Number(selected)); window.location.reload() } }}>Start</Button>
              <Button color="inherit" onClick={async () => { await stopImpersonation(); window.location.reload() }}>Stop</Button>
            </>
          )}
          <IconButton color="inherit" onClick={toggle} aria-label="toggle theme">
            {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>{children}</Container>
    </Box>
  )
}
