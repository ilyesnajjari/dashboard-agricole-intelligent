import type { AppProps } from 'next/app'
import Head from 'next/head'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { buildTheme, ColorModeContext } from '../theme'
import React from 'react'
import Layout from '../components/Layout'
import { useRouter } from 'next/router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// Configure NProgress
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.2 })

export default function MyApp({ Component, pageProps }: AppProps) {
  const [mode, setMode] = React.useState<'light' | 'dark'>('light')
  const theme = React.useMemo(() => buildTheme(mode), [mode])
  const ctx = React.useMemo(() => ({ mode, toggle: () => setMode(m => (m === 'light' ? 'dark' : 'light')) }), [mode])
  const router = useRouter()
  const [authChecked, setAuthChecked] = React.useState(false)
  const [user, setUser] = React.useState<any>(null)

  React.useEffect(() => {
    const handleStart = () => NProgress.start()
    const handleStop = () => NProgress.done()

    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeComplete', handleStop)
    router.events.on('routeChangeError', handleStop)

    return () => {
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleStop)
      router.events.off('routeChangeError', handleStop)
    }
  }, [router])

  React.useEffect(() => {
    let active = true
    const check = async () => {
      // Optimization: If already authenticated, don't re-verify on every client-side navigation
      if (authChecked && user?.is_authenticated) return

      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
        const res = await fetch(base + '/me/', { credentials: 'include' })
        const data = await res.json()
        if (!active) return
        setUser(data)

        const publicRoutes = ['/login', '/signup', '/forgot-password']
        // If not authenticated and not on a public route, redirect to /login
        if (!data?.is_authenticated && !publicRoutes.includes(router.pathname)) {
          router.replace('/login')
          return
        }
        // If authenticated but on a public route, redirect to home
        if (data?.is_authenticated && publicRoutes.includes(router.pathname)) {
          router.replace('/')
          return
        }

        setAuthChecked(true)
      } catch (_e) {
        // On error, assume not authenticated and redirect unless already on /login
        const publicRoutes = ['/login', '/signup', '/forgot-password']
        if (!publicRoutes.includes(router.pathname)) {
          router.replace('/login')
          return
        }
        setUser(null)
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
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#2e7d32" />
          <title>Dashboard Agricole Intelligent</title>
        </Head>
        {/* Render login (and signup) pages bare, without the Layout */}
        {['/login', '/signup', '/forgot-password'].includes(router.pathname) ? (
          <Component {...pageProps} />
        ) : (
          authChecked ? (
            <Layout user={user}>
              <Component {...pageProps} />
            </Layout>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              Chargement...
            </div>
          )
        )}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}
