import { Box, Paper, Typography, alpha, useTheme } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'

type Props = { title: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'error' | 'info' }

export default function KPIcard({ title, value, tone = 'default' }: Props) {
  const theme = useTheme()

  let icon = <AttachMoneyIcon />
  let color = theme.palette.text.primary
  let bgGradient = 'none'

  if (title.toLowerCase().includes('ventes') || title.toLowerCase().includes('recettes')) {
    icon = <TrendingUpIcon />
    color = theme.palette.success.main
    bgGradient = `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`
  } else if (title.toLowerCase().includes('dépenses')) {
    icon = <TrendingDownIcon />
    color = theme.palette.error.main
    bgGradient = `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`
  } else if (title.toLowerCase().includes('bénéfice')) {
    icon = <AccountBalanceWalletIcon />
    if (tone === 'info') {
      color = theme.palette.info.main
      bgGradient = `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`
    } else {
      color = tone === 'error' ? theme.palette.error.main : theme.palette.success.main
      bgGradient = tone === 'error'
        ? `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`
        : `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`
    }
  } else if (title.toLowerCase().includes('chiffre')) {
    icon = <ShoppingCartIcon />
    color = theme.palette.info.main
    bgGradient = `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        minWidth: 180,
        height: '100%',
        background: bgGradient,
        border: `1px solid ${alpha(color, 0.2)}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 20px ${alpha(color, 0.15)}`,
          borderColor: alpha(color, 0.4),
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </Typography>
        <Box sx={{
          p: 1,
          borderRadius: '12px',
          bgcolor: alpha(color, 0.1),
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </Box>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {value}
      </Typography>
    </Paper>
  )
}
