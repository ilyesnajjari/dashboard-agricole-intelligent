import type { AppProps } from 'next/app'
import Head from 'next/head'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { buildTheme, ColorModeContext } from '../theme'
import React from 'react'
import Layout from '../components/Layout'
import { useRouter } from 'next/router'

export default function MyApp({ Component, pageProps }: AppProps) {
  const [mode, setMode] = React.useState<'light'|'dark'>('light')
  const theme = React.useMemo(() => buildTheme(mode), [mode])
  const ctx = React.useMemo(() => ({ mode, toggle: () => setMode(m => (m === 'light' ? 'dark' : 'light')) }), [mode])
  const router = useRouter()
  const [authChecked, setAuthChecked] = React.useState(false)
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    let active = true
    const check = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
        const res = await fetch(base + '/me/', { credentials: 'include' })
        const data = await res.json()
        if (!active) return
        setIsAuthenticated(!!data?.is_authenticated)
        setAuthChecked(true)
        // If not authenticated and not already on /login, redirect
        if (!data?.is_authenticated && router.pathname !== '/login') {
          router.replace('/login')
        }
      } catch (_e) {
        // On error, assume not authenticated and redirect unless already on /login
        if (router.pathname !== '/login') {
          router.replace('/login')
        }
        setIsAuthenticated(false)
        setAuthChecked(true)
      }
    }
    check()
    return () => { active = false }
  }, [router.pathname])

  return (
    <ColorModeContext.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Dashboard Agricole Intelligent</title>
        </Head>
        {/* While checking auth (on non-login routes), avoid flashing content */}
        {router.pathname === '/login' || authChecked ? (
          <Layout>
            <Component {...pageProps} />
          </Layout>
        ) : null}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}
