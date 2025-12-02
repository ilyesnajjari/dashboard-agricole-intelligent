import React from 'react'
import { createTheme, PaletteMode, ThemeOptions, alpha } from '@mui/material/styles'
import type { } from '@mui/x-data-grid/themeAugmentation'

export const ColorModeContext = React.createContext<{ mode: PaletteMode; toggle: () => void }>({ mode: 'light', toggle: () => { } })

// Modern Agritech Palette
const PALETTE = {
  light: {
    primary: { main: '#059669', light: '#34d399', dark: '#047857', contrastText: '#ffffff' }, // Emerald
    secondary: { main: '#d97706', light: '#fbbf24', dark: '#b45309', contrastText: '#ffffff' }, // Amber
    background: { default: '#f8fafc', paper: '#ffffff' }, // Slate-50 / White
    text: { primary: '#1e293b', secondary: '#64748b' }, // Slate-800 / Slate-500
    success: { main: '#10b981' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    info: { main: '#3b82f6' },
  },
  dark: {
    primary: { main: '#10b981', light: '#34d399', dark: '#047857', contrastText: '#ffffff' },
    secondary: { main: '#fbbf24', light: '#fcd34d', dark: '#d97706', contrastText: '#1e293b' },
    background: { default: '#0f172a', paper: '#1e293b' }, // Slate-900 / Slate-800
    text: { primary: '#f1f5f9', secondary: '#94a3b8' }, // Slate-100 / Slate-400
    success: { main: '#34d399' },
    warning: { main: '#fbbf24' },
    error: { main: '#f87171' },
    info: { main: '#60a5fa' },
  }
}

export function buildTheme(mode: PaletteMode) {
  const colors = PALETTE[mode]

  const common: ThemeOptions = {
    shape: { borderRadius: 16 }, // More rounded for modern feel
    typography: {
      fontFamily: '"Inter", "Outfit", system-ui, -apple-system, sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontWeight: 600, letterSpacing: '-0.01em' },
      h4: { fontWeight: 600, letterSpacing: '-0.01em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
      body1: { lineHeight: 1.6 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': { width: '8px', height: '8px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: mode === 'light' ? '#cbd5e1' : '#475569',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: mode === 'light' ? '#94a3b8' : '#64748b',
            },
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none', // Disable default overlay in dark mode
            transition: 'box-shadow 0.3s ease-in-out, transform 0.2s ease-in-out',
          },
          elevation1: {
            boxShadow: mode === 'light'
              ? '0px 1px 3px rgba(0,0,0,0.05), 0px 1px 2px rgba(0,0,0,0.1)'
              : '0px 1px 3px rgba(0,0,0,0.2), 0px 1px 2px rgba(0,0,0,0.4)',
            border: `1px solid ${mode === 'light' ? alpha('#000', 0.05) : alpha('#fff', 0.05)}`,
          },
          elevation3: {
            // Used for charts/cards
            boxShadow: mode === 'light'
              ? '0px 4px 6px -1px rgba(0,0,0,0.05), 0px 2px 4px -1px rgba(0,0,0,0.03)'
              : '0px 4px 6px -1px rgba(0,0,0,0.3), 0px 2px 4px -1px rgba(0,0,0,0.2)',
          }
        },
        defaultProps: { elevation: 1 },
      },
      MuiButton: {
        defaultProps: { variant: 'contained', disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '8px 20px',
            transition: 'all 0.2s ease',
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
            '&:hover': {
              boxShadow: `0 4px 12px ${alpha(colors.primary.main, 0.4)}`,
              transform: 'translateY(-1px)',
            },
          },
          outlined: {
            borderWidth: '2px',
            '&:hover': { borderWidth: '2px' }
          }
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: 'none',
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${mode === 'light' ? '#f1f5f9' : '#334155'}`,
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: mode === 'light' ? '#f8fafc' : '#1e293b',
              borderBottom: `2px solid ${mode === 'light' ? '#e2e8f0' : '#334155'}`,
              color: colors.text.secondary,
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: mode === 'light' ? '#f0fdf4' : alpha('#059669', 0.1), // Subtle green tint
            },
          }
        },
        defaultProps: {
          density: 'comfortable',
          disableColumnMenu: true,
          disableRowSelectionOnClick: true,
        } as any,
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
          filled: { border: '1px solid transparent' },
          outlined: { borderWidth: '1px' },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              '& fieldset': { borderColor: mode === 'light' ? '#e2e8f0' : '#475569' },
              '&:hover fieldset': { borderColor: colors.primary.light },
              '&.Mui-focused fieldset': { borderColor: colors.primary.main, borderWidth: '2px' },
            }
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(colors.background.paper, 0.8),
            backdropFilter: 'blur(12px)',
            color: colors.text.primary,
            boxShadow: mode === 'light'
              ? '0 1px 0 rgba(0,0,0,0.05)'
              : '0 1px 0 rgba(255,255,255,0.05)',
          }
        }
      }
    },
  }

  const base = createTheme({
    palette: {
      mode,
      ...colors,
    },
    ...common,
  })

  return base
}
