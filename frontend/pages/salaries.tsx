import { useState, useEffect } from 'react'
import {
    Box, Grid, Paper, Typography, TextField, Button,
    Select, MenuItem, FormControl, InputLabel, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, CircularProgress, Checkbox
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { Delete, Edit, Save } from '@mui/icons-material'
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts'

interface Employee {
    id: number
    name: string
    default_hourly_rate: number
}

interface WorkLog {
    id: number
    employee: number
    employee_name?: string
    date: string
    hours: number
    hourly_rate: number
    total_cost: number
    notes: string
    paid: boolean
}

export default function SalariesPage() {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [logs, setLogs] = useState<WorkLog[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Forms
    const [logForm, setLogForm] = useState<Partial<WorkLog>>({
        date: new Date().toISOString().slice(0, 10),
        hours: 0,
        hourly_rate: 10
    })
    const [empForm, setEmpForm] = useState<Partial<Employee>>({
        name: '',
        default_hourly_rate: 10
    })

    // Dialogs
    const [openEmpDialog, setOpenEmpDialog] = useState(false)
    const [deleteLogConfirm, setDeleteLogConfirm] = useState<number | null>(null)
    const [deleteEmpConfirm, setDeleteEmpConfirm] = useState<number | null>(null)
    const [openPdfDialog, setOpenPdfDialog] = useState(false)
    const [pdfForm, setPdfForm] = useState({
        employee: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    })

    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [empRes, logRes] = await Promise.all([
                fetch(`${apiBase}/employees/`, { credentials: 'include' }),
                fetch(`${apiBase}/work-logs/`, { credentials: 'include' })
            ])
            const empData = await empRes.json()
            const logData = await logRes.json()
            setEmployees(empData)
            setLogs(logData)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateEmployee = async () => {
        if (!empForm.name) return
        setSubmitting(true)
        try {
            await fetch(`${apiBase}/employees/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(empForm)
            })
            setOpenEmpDialog(false)
            setEmpForm({ name: '', default_hourly_rate: 10 })
            loadData()
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteEmployee = async () => {
        if (!deleteEmpConfirm) return
        setSubmitting(true)
        try {
            await fetch(`${apiBase}/employees/${deleteEmpConfirm}/`, {
                method: 'DELETE',
                credentials: 'include'
            })
            setDeleteEmpConfirm(null)
            loadData()
        } catch (error) {
            console.error(error)
            setDeleteEmpConfirm(null)
            setSubmitting(false)
        }
    }

    const handleTogglePaid = async (id: number, currentPaid: boolean) => {
        try {
            await fetch(`${apiBase}/work-logs/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ paid: !currentPaid })
            })
            setLogs(prev => prev.map(l => l.id === id ? { ...l, paid: !currentPaid } : l))
        } catch (error) {
            console.error(error)
        }
    }

    const handleDownloadPdf = async () => {
        if (!pdfForm.employee) return
        setSubmitting(true)
        try {
            const res = await fetch(`${apiBase}/employees/${pdfForm.employee}/payslip/?year=${pdfForm.year}&month=${pdfForm.month}`, {
                credentials: 'include'
            })
            if (res.ok) {
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `Fiche_Paie_${pdfForm.month}_${pdfForm.year}.pdf`
                document.body.appendChild(a)
                a.click()
                a.remove()
                setOpenPdfDialog(false)
            } else {
                console.error('Error generating PDF')
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleCreateLog = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!logForm.employee || !logForm.date || !logForm.hours) return
        setSubmitting(true)
        try {
            await fetch(`${apiBase}/work-logs/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(logForm)
            })
            // Reset form but keep date and rate
            setLogForm(prev => ({ ...prev, hours: 0, notes: '' }))
            loadData()
            // Trigger global update for dashboard
            window.dispatchEvent(new Event('data-updated'))
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteLog = async () => {
        if (!deleteLogConfirm) return
        setSubmitting(true)
        try {
            await fetch(`${apiBase}/work-logs/${deleteLogConfirm}/`, {
                method: 'DELETE',
                credentials: 'include'
            })
            setDeleteLogConfirm(null)
            loadData()
            window.dispatchEvent(new Event('data-updated'))
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleEmployeeChange = (empId: number) => {
        const emp = employees.find(e => e.id === empId)
        setLogForm({
            ...logForm,
            employee: empId,
            hourly_rate: emp ? emp.default_hourly_rate : logForm.hourly_rate
        })
    }

    // Chart Data Preparation
    const chartData = (() => {
        // Group by date and employee
        const grouped: Record<string, Record<string, number>> = {}
        const allDates = new Set<string>()

        logs.forEach(l => {
            if (!grouped[l.date]) grouped[l.date] = {}
            const empName = l.employee_name || 'Inconnu'
            grouped[l.date][empName] = (grouped[l.date][empName] || 0) + Number(l.total_cost)
            allDates.add(l.date)
        })

        return Array.from(allDates)
            .sort()
            .map(date => ({
                date,
                ...grouped[date]
            }))
            .slice(-30)
    })()

    // Generate colors for employees
    const getEmployeeColor = (index: number) => {
        const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F', '#FFBB28', '#FF8042']
        return colors[index % colors.length]
    }

    const columns: GridColDef[] = [
        { field: 'date', headerName: 'Date', flex: 1 },
        { field: 'employee_name', headerName: 'Salarié', flex: 1 },
        { field: 'hours', headerName: 'Heures', type: 'number', flex: 1 },
        { field: 'hourly_rate', headerName: 'Taux (€/h)', type: 'number', flex: 1 },
        {
            field: 'total_cost',
            headerName: 'Coût Total (€)',
            type: 'number',
            flex: 1,
            valueFormatter: (params: any) => {
                const val = (params && typeof params === 'object' && 'value' in params) ? params.value : params
                return (val !== undefined && val !== null) ? `${Number(val).toFixed(2)} €` : ''
            }
        },
        {
            field: 'paid',
            headerName: 'Payé',
            width: 100,
            renderCell: (params) => (
                <Checkbox
                    checked={params.value || false}
                    onChange={() => handleTogglePaid(params.row.id, params.row.paid)}
                    color="primary"
                />
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <IconButton color="error" onClick={() => setDeleteLogConfirm(params.row.id)}>
                    <Delete />
                </IconButton>
            )
        }
    ]

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Gestion des Salariés</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="outlined" onClick={() => setOpenEmpDialog(true)}>
                        Gérer les Salariés
                    </Button>
                    <Button variant="contained" color="secondary" onClick={() => setOpenPdfDialog(true)}>
                        Générer Fiche de Paie
                    </Button>
                </Box>
            </Box>

            {/* Saisie des heures */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Saisir des heures</Typography>
                <form onSubmit={handleCreateLog}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Date"
                                InputLabelProps={{ shrink: true }}
                                value={logForm.date}
                                onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth required>
                                <InputLabel>Salarié</InputLabel>
                                <Select
                                    value={logForm.employee || ''}
                                    label="Salarié"
                                    onChange={(e) => handleEmployeeChange(Number(e.target.value))}
                                >
                                    {employees.map(e => (
                                        <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Heures"
                                inputProps={{ step: '0.5' }}
                                value={logForm.hours}
                                onChange={(e) => setLogForm({ ...logForm, hours: Number(e.target.value) })}
                                onFocus={(e) => e.target.value === '0' && setLogForm({ ...logForm, hours: '' as any })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Taux (€/h)"
                                inputProps={{ step: '0.5' }}
                                value={logForm.hourly_rate}
                                onChange={(e) => setLogForm({ ...logForm, hourly_rate: Number(e.target.value) })}
                                onFocus={(e) => e.target.value === '0' && setLogForm({ ...logForm, hourly_rate: '' as any })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Button type="submit" variant="contained" fullWidth size="large" startIcon={!submitting && <Save />} disabled={submitting}>
                                {submitting ? <CircularProgress size={24} color="inherit" /> : 'Ajouter'}
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Paper>

            {/* Graphique */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Coût de la main d'œuvre (30 derniers jours)</Typography>
                        <Box sx={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} />
                                    <YAxis />
                                    <Tooltip formatter={(val: number) => `${val.toFixed(2)} €`} />
                                    <Legend />
                                    {employees.map((emp, index) => (
                                        <Bar key={emp.id} dataKey={emp.name} fill={getEmployeeColor(index)} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Liste des heures */}
            <Paper sx={{ height: 500, width: '100%' }}>
                <DataGrid
                    rows={logs}
                    columns={columns}
                    loading={loading}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 10 } },
                    }}
                    pageSizeOptions={[10, 25, 50]}
                    disableRowSelectionOnClick
                />
            </Paper>

            {/* Dialog: Add/Manage Employee */}
            <Dialog open={openEmpDialog} onClose={() => setOpenEmpDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Gérer les Salariés</DialogTitle>
                <DialogContent>
                    <Box mb={3} mt={1}>
                        <Typography variant="subtitle2" gutterBottom>Ajouter un nouveau salarié</Typography>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={6}>
                                <TextField
                                    label="Nom"
                                    fullWidth
                                    size="small"
                                    value={empForm.name}
                                    onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={4}>
                                <TextField
                                    label="Taux (€/h)"
                                    type="number"
                                    fullWidth
                                    size="small"
                                    value={empForm.default_hourly_rate}
                                    onChange={(e) => setEmpForm({ ...empForm, default_hourly_rate: Number(e.target.value) })}
                                />
                            </Grid>
                            <Grid item xs={2}>
                                <Button variant="contained" onClick={handleCreateEmployee} fullWidth disabled={submitting}>
                                    {submitting ? <CircularProgress size={24} color="inherit" /> : 'OK'}
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>

                    <Typography variant="subtitle2" gutterBottom>Salariés existants</Typography>
                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {employees.length === 0 ? <Typography color="text.secondary">Aucun salarié</Typography> : (
                            <ul style={{ paddingLeft: 20 }}>
                                {employees.map(e => (
                                    <li key={e.id} style={{ marginBottom: 8 }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <span>{e.name} ({e.default_hourly_rate} €/h)</span>
                                            <IconButton size="small" color="error" onClick={() => setDeleteEmpConfirm(e.id)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEmpDialog(false)}>Fermer</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog: Confirm Delete Log */}
            <Dialog open={!!deleteLogConfirm} onClose={() => setDeleteLogConfirm(null)}>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Voulez-vous vraiment supprimer cette entrée ?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteLogConfirm(null)} disabled={submitting}>Annuler</Button>
                    <Button onClick={handleDeleteLog} color="error" autoFocus disabled={submitting}>
                        {submitting ? <CircularProgress size={24} color="inherit" /> : 'Supprimer'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog: Confirm Delete Employee */}
            <Dialog open={!!deleteEmpConfirm} onClose={() => setDeleteEmpConfirm(null)}>
                <DialogTitle>Supprimer le salarié ?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Attention : Supprimer ce salarié supprimera également tout son historique de travail.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteEmpConfirm(null)} disabled={submitting}>Annuler</Button>
                    <Button onClick={handleDeleteEmployee} color="error" autoFocus disabled={submitting}>
                        {submitting ? <CircularProgress size={24} color="inherit" /> : 'Supprimer définitivement'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog: Generate PDF */}
            <Dialog open={openPdfDialog} onClose={() => setOpenPdfDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Générer Fiche de Paie</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Salarié</InputLabel>
                                <Select
                                    value={pdfForm.employee}
                                    label="Salarié"
                                    onChange={(e) => setPdfForm({ ...pdfForm, employee: e.target.value })}
                                >
                                    {employees.map(e => (
                                        <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Mois"
                                type="number"
                                fullWidth
                                inputProps={{ min: 1, max: 12 }}
                                value={pdfForm.month}
                                onChange={(e) => setPdfForm({ ...pdfForm, month: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Année"
                                type="number"
                                fullWidth
                                value={pdfForm.year}
                                onChange={(e) => setPdfForm({ ...pdfForm, year: Number(e.target.value) })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPdfDialog(false)} disabled={submitting}>Annuler</Button>
                    <Button onClick={handleDownloadPdf} variant="contained" disabled={submitting || !pdfForm.employee}>
                        {submitting ? <CircularProgress size={24} color="inherit" /> : 'Télécharger PDF'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
