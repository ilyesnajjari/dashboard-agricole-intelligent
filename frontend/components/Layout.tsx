import React from 'react'
import Link from 'next/link'
import { AppBar, Box, Button, Container, IconButton, Toolbar, Typography, MenuItem, Select, Tooltip, TextField, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress } from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import { listUsersForImpersonation, startImpersonation, stopImpersonation } from '../api/admin'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { ColorModeContext } from '../theme'

type Props = { children: React.ReactNode, user?: any }

export default function Layout({ children, user }: Props) {
  const { mode, toggle } = React.useContext(ColorModeContext)
  const router = require('next/router').useRouter()
  const [me, setMe] = React.useState<any>(user || null)
  const [users, setUsers] = React.useState<any[]>([])
  const [selected, setSelected] = React.useState<number | ''>('')
  const [query, setQuery] = React.useState('')
  const [detail, setDetail] = React.useState<any | null>(null)
  const [impLoading, setImpLoading] = React.useState(false)

  React.useEffect(() => {
    setMe(user)
  }, [user])

  React.useEffect(() => {
    ; (async () => {
      try {
        let currentUser = user
        if (!currentUser) {
          const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
          const res = await fetch(base + '/me/', { credentials: 'include' })
          currentUser = await res.json()
          setMe(currentUser)
        }

        if (currentUser?.is_staff) {
          const u = await listUsersForImpersonation()
          setUsers(u.users || [])
        }
      } catch (e) {
        // ignore
      }
    })()
  }, [user])
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <AppBar position="sticky" color="inherit" elevation={0}>
        <Toolbar disableGutters sx={{ gap: 1, px: { xs: 2, md: 4 }, minHeight: 64 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, background: 'linear-gradient(45deg, #059669, #d97706)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dashboard Agricole
          </Typography>

          {/** Navigation Links */}
          {[
            { label: 'Accueil', href: '/' },
            { label: 'Récoltes', href: '/recoltes' },
            { label: 'Ventes', href: '/ventes' },
            { label: 'Achats', href: '/achats' },
            { label: 'Salariés', href: '/salaries' },
            { label: 'Journal', href: '/journal' },
            { label: 'Planning', href: '/planning' },
          ].map((link) => {
            const isActive = link.href === '/' ? router.pathname === '/' : router.pathname?.startsWith(link.href)
            return (
              <Button
                key={link.href}
                component={Link}
                href={link.href}
                variant="text"
                sx={{
                  color: isActive ? 'primary.main' : 'text.secondary',
                  bgcolor: isActive ? (mode === 'light' ? 'rgba(5,150,105,0.1)' : 'rgba(16,185,129,0.1)') : 'transparent',
                  fontWeight: isActive ? 700 : 500,
                  '&:hover': {
                    bgcolor: isActive ? (mode === 'light' ? 'rgba(5,150,105,0.15)' : 'rgba(16,185,129,0.15)') : 'action.hover',
                    color: 'primary.main',
                  }
                }}
              >
                {link.label}
              </Button>
            )
          })}

          <Box sx={{ flexGrow: 0, ml: 2, display: 'flex', gap: 1 }}>
            {!me || !me.is_authenticated ? (
              <Button component={Link} href="/login" variant="outlined">Se connecter</Button>
            ) : (
              <Button
                variant="outlined"
                color="error"
                onClick={async () => { const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'; await fetch(base + '/logout/', { method: 'POST', credentials: 'include' }); window.location.href = '/login' }}
                sx={{ borderColor: 'error.main', color: 'error.main', '&:hover': { bgcolor: 'error.main', color: 'white', borderColor: 'error.main' } }}
              >
                Déconnexion
              </Button>
            )}

            <IconButton onClick={toggle} sx={{ ml: 1, bgcolor: 'action.hover' }}>
              {mode === 'light' ? <Brightness4Icon color="action" /> : <Brightness7Icon color="warning" />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 4 }}>{children}</Container>
      <Dialog open={!!detail} onClose={() => setDetail(null)}>
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
          <Button onClick={() => setDetail(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
