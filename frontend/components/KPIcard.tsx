import { Chip, Paper, Typography } from '@mui/material'

type Props = { title: string; value: string | number; tone?: 'default'|'success'|'warning'|'error' }

export default function KPIcard({ title, value, tone = 'default' }: Props) {
  const color = tone === 'default' ? 'default' : tone
  return (
    <Paper sx={{ p: 2, minWidth: 180 }}>
      <Typography variant="caption" color="text.secondary">{title}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography>
      {tone !== 'default' && <Chip color={color as any} size="small" label={tone} sx={{ mt: 1 }} />}
    </Paper>
  )
}
