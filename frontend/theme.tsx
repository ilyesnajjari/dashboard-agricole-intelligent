import React from 'react'
import { createTheme, PaletteMode, ThemeOptions } from '@mui/material/styles'

export const ColorModeContext = React.createContext<{ mode: PaletteMode; toggle: () => void }>({ mode: 'light', toggle: () => {} })

export function buildTheme(mode: PaletteMode) {
  const common: ThemeOptions = {
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: 'Inter, system-ui, Arial, sans-serif',
      h4: { fontWeight: 700 },
      h6: { fontWeight: 600 },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { transition: 'box-shadow .2s ease' },
        },
        defaultProps: { elevation: 1 },
      },
      MuiButton: {
        defaultProps: { variant: 'contained', disableElevation: true },
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 },
        },
      },
      MuiDataGrid: {
        defaultProps: {
          density: 'comfortable',
          disableColumnMenu: true,
          disableRowSelectionOnClick: true,
        } as any,
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
    },
  }

  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'light' ? '#2e7d32' : '#66bb6a' }, // green
      secondary: { main: mode === 'light' ? '#8d6e63' : '#bcaaa4' }, // brownish
      success: { main: mode === 'light' ? '#2e7d32' : '#81c784' },
      warning: { main: mode === 'light' ? '#f57c00' : '#ffb74d' },
      error: { main: mode === 'light' ? '#c62828' : '#ef5350' },
      background: {
        default: mode === 'light' ? '#f7faf7' : '#0e1a12',
        paper: mode === 'light' ? '#ffffff' : '#122117',
      },
    },
    ...common,
  })
}
