import React from 'react'
import Link from 'next/link'
import { AppBar, Box, Button, Container, IconButton, Toolbar, Typography, MenuItem, Select, Tooltip, TextField, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress } from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
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
  const [query, setQuery] = React.useState('')
  const [detail, setDetail] = React.useState<any | null>(null)
  const [impLoading, setImpLoading] = React.useState(false)

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
          <Button color="inherit" component={Link} href="/recoltes">Récoltes</Button>
          <Button color="inherit" component={Link} href="/ventes">Ventes</Button>
          <Button color="inherit" component={Link} href="/achats">Achats</Button>
          <Button color="inherit" component={Link} href="/comptabilite">Comptabilité</Button>
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
              <Autocomplete
                size="small"
                sx={{ width: 240, bgcolor: 'background.paper', borderRadius: 1 }}
                options={users}
                getOptionLabel={(u:any) => (u?.username ? `${u.username}${u.email ? ' ('+u.email+')' : ''}` : '')}
                renderInput={(params) => <TextField {...params} placeholder="Rechercher user" />}
                onInputChange={(_, value) => setQuery(value)}
                onChange={(_, value:any) => setSelected(value ? value.id : '')}
                loading={false}
                filterOptions={(opts) => {
                  const q = (query||'').toLowerCase()
                  if (!q) return opts
                  return opts.filter((u:any) => (u.username||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q))
                }}
              />
              <Button color="inherit" onClick={() => { const u = users.find(x => x.id === selected); if (u) setDetail(u) }} disabled={!selected} sx={{ ml: 1 }}>Détails</Button>
              <Button color="inherit" disabled={!selected || impLoading} onClick={async () => {
                if (!selected) return
                setImpLoading(true)
                try {
                  await startImpersonation(Number(selected))
                  // refresh /me in place
                  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
                  const res = await fetch(base + '/me/', { credentials: 'include' })
                  const data = await res.json()
                  setMe(data)
                } finally { setImpLoading(false) }
              }}>
                {impLoading ? <CircularProgress size={16} color="inherit" /> : 'Start'}
              </Button>
              <Button color="inherit" disabled={impLoading} onClick={async () => {
                setImpLoading(true)
                try {
                  await stopImpersonation()
                  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
                  const res = await fetch(base + '/me/', { credentials: 'include' })
                  const data = await res.json()
                  setMe(data)
                } finally { setImpLoading(false) }
              }}>Stop</Button>
            </>
          )}
          <IconButton color="inherit" onClick={toggle} aria-label="toggle theme">
            {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>{children}</Container>
      <Dialog open={!!detail} onClose={()=>setDetail(null)}>
        <DialogTitle>Utilisateur</DialogTitle>
        <DialogContent>
          {detail && (
            <DialogContentText component="div">
              <Typography><b>Username:</b> {detail.username}</Typography>
              <Typography><b>Email:</b> {detail.email || '-'}</Typography>
              <Typography><b>Actif:</b> {String(detail.is_active)}</Typography>
              <Typography><b>Staff:</b> {String(detail.is_staff)}</Typography>
              <Typography><b>Superuser:</b> {String(detail.is_superuser)}</Typography>
              <Typography><b>Dernière connexion:</b> {detail.last_login || '-'}</Typography>
              <Typography><b>Créé le:</b> {detail.date_joined || '-'}</Typography>
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setDetail(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
