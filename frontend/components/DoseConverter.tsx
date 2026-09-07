import { useState } from 'react'
import { Box, Card, CardContent, Typography, TextField, Stack, Divider, InputAdornment, Grid, Tooltip, IconButton, Alert, FormControlLabel, Switch } from '@mui/material'
import { Calculate, WaterDrop, Straighten, Landscape, HelpOutline, Opacity, NotificationsActive } from '@mui/icons-material'

export default function DoseConverter() {
    // Inputs
    const [doseUnit, setDoseUnit] = useState<'L' | 'kg' | 'ml' | 'g'>('L')
    const [dosePerHa, setDosePerHa] = useState<number | ''>(2)
    const [waterPerHa, setWaterPerHa] = useState<number | ''>(500) // Default 500 explicitly
    const [tankVolume, setTankVolume] = useState<number | ''>(15)
    const [rowSpacing, setRowSpacing] = useState<number | ''>(1.2)
    const [isDoubleRow, setIsDoubleRow] = useState<boolean>(false)

    // New targets
    const [targetArea, setTargetArea] = useState<number | ''>('')
    const [targetDistance, setTargetDistance] = useState<number | ''>('')

    const calculateResults = () => {
        if (!dosePerHa || !waterPerHa || !tankVolume || !rowSpacing) {
            return { doseInTank: 0, treatedArea: 0, linearMeters: 0, plantMeters: 0, dosePerLiter: 0, targetTanks: 0, targetWater: 0, targetDose: 0, displayDistance: 0, computeArea: 0 }
        }

        const actualWaterPerHa = waterPerHa
        const doseInTank = (dosePerHa / actualWaterPerHa) * tankVolume
        const treatedArea = (tankVolume / actualWaterPerHa) * 10000
        const linearMeters = treatedArea / rowSpacing
        const plantMeters = isDoubleRow ? linearMeters * 2 : linearMeters
        const dosePerLiter = dosePerHa / actualWaterPerHa

        // Target calculations
        let targetTanks = 0
        let targetWater = 0
        let targetDose = 0

        let computeArea = 0
        let displayDistance = 0
        if (targetArea) {
            computeArea = targetArea
            const equivalentLinearMeters = targetArea / rowSpacing
            displayDistance = isDoubleRow ? equivalentLinearMeters * 2 : equivalentLinearMeters
        } else if (targetDistance) {
            displayDistance = targetDistance
            const equivalentLinearMeters = isDoubleRow ? (targetDistance / 2) : targetDistance
            computeArea = equivalentLinearMeters * rowSpacing
        }

        if (computeArea > 0) {
            targetWater = (computeArea / 10000) * actualWaterPerHa
            targetDose = (computeArea / 10000) * dosePerHa
            targetTanks = targetWater / tankVolume
        }

        return {
            doseInTank,
            treatedArea,
            linearMeters,
            plantMeters,
            dosePerLiter,
            targetTanks,
            targetWater,
            targetDose,
            displayDistance,
            computeArea
        }
    }

    const { doseInTank, treatedArea, linearMeters, plantMeters, dosePerLiter, targetTanks, targetWater, targetDose, displayDistance, computeArea } = calculateResults()

    const formatDose = (dose: number) => {
        if (dose === 0) return '0'
        if (doseUnit === 'L') {
            return dose < 1 ? `${(dose * 1000).toFixed(1)} ml` : `${dose.toFixed(2)} L`
        }
        if (doseUnit === 'kg') {
            return dose < 1 ? `${(dose * 1000).toFixed(1)} g` : `${dose.toFixed(2)} kg`
        }
        if (doseUnit === 'ml') {
            return `${dose.toFixed(1)} ml`
        }
        if (doseUnit === 'g') {
            return `${dose.toFixed(1)} g`
        }
        return dose.toString()
    }

    const formatActualUnit = () => {
        return ['L', 'ml'].includes(doseUnit) ? 'L' : 'kg'
    }

    const isMicroDose = (dose: number) => {
        if (['L', 'kg'].includes(doseUnit)) {
            return dose > 0 && dose <= 0.01 // <= 10 ml or 10 g
        } else {
            return dose > 0 && dose <= 10 // <= 10 ml or 10 g
        }
    }

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1, sm: 2 } }}>
            <Card sx={{ boxShadow: 3, borderRadius: 3, overflow: 'visible', position: 'relative' }}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: -20,
                        left: 20,
                        bgcolor: 'primary.main',
                        color: 'white',
                        p: 1.5,
                        borderRadius: 2,
                        boxShadow: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Calculate sx={{ fontSize: 32 }} />
                </Box>
                <CardContent sx={{ pt: 5 }}>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                        Convertisseur de Doses Phytosanitaires
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.primary', opacity: 0.8 }} mb={4}>
                        Calculez la quantité exacte de produit à insérer dans votre pulvérisateur ou cuve, ainsi que la surface et la longueur de rangs que vous pourrez traiter.
                    </Typography>

                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Stack spacing={3}>
                                <Typography variant="h6" fontWeight={600} color="primary.main">
                                    Vos Paramètres
                                </Typography>

                                <Stack direction="row" spacing={2} alignItems="flex-start">
                                    <TextField
                                        label="Dose de produit (par hectare)"
                                        type="number"
                                        value={dosePerHa}
                                        onChange={(e) => setDosePerHa(e.target.value ? Math.max(0, Number(e.target.value)) : '')}
                                        fullWidth
                                        sx={{ flex: 2 }}
                                        inputProps={{ min: 0 }}
                                    />
                                    <TextField
                                        select
                                        label="Unité"
                                        value={doseUnit}
                                        onChange={(e) => setDoseUnit(e.target.value as any)}
                                        sx={{ flex: 1 }}
                                        SelectProps={{ native: true }}
                                    >
                                        <option value="L">L</option>
                                        <option value="kg">kg</option>
                                        <option value="ml">ml</option>
                                        <option value="g">g</option>
                                    </TextField>
                                </Stack>

                                <TextField
                                    label="Volume d'eau souhaité (par hectare)"
                                    type="number"
                                    value={waterPerHa}
                                    onChange={(e) => setWaterPerHa(e.target.value ? Math.max(0, Number(e.target.value)) : '')}
                                    fullWidth
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">L / ha</InputAdornment>,
                                    }}
                                    inputProps={{ min: 0 }}
                                />

                                <TextField
                                    label="Capacité de votre cuve/pulvérisateur"
                                    type="number"
                                    value={tankVolume}
                                    onChange={(e) => setTankVolume(e.target.value ? Math.max(0, Number(e.target.value)) : '')}
                                    fullWidth
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">Litres (L)</InputAdornment>,
                                    }}
                                    inputProps={{ min: 0 }}
                                />

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TextField
                                        label="Espacement entre rangs"
                                        type="number"
                                        value={rowSpacing}
                                        onChange={(e) => setRowSpacing(e.target.value ? Math.max(0, Number(e.target.value)) : '')}
                                        fullWidth
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">Mètres (m)</InputAdornment>,
                                        }}
                                        inputProps={{ min: 0 }}
                                    />
                                    <Tooltip title="Distance Inter-Rang : l'espace de passage (tracteur/marche) entre chaque ligne de culture." arrow placement="top">
                                        <IconButton size="small" sx={{ color: 'info.main' }}>
                                            <HelpOutline />
                                        </IconButton>
                                    </Tooltip>
                                </Box>

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={isDoubleRow}
                                            onChange={(e) => setIsDoubleRow(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label={
                                        <Typography variant="body1">
                                            Culture en ligne double (ex: Fraises)
                                        </Typography>
                                    }
                                />

                                <Divider sx={{ my: 2 }} />

                                <Typography variant="h6" fontWeight={600} color="secondary.main">
                                    Vos Besoins Spécifiques (Optionnel)
                                </Typography>

                                <TextField
                                    label="Surface totale à traiter"
                                    type="number"
                                    value={targetArea}
                                    onChange={(e) => {
                                        setTargetArea(e.target.value ? Math.max(0, Number(e.target.value)) : '')
                                        setTargetDistance('')
                                    }}
                                    fullWidth
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">m²</InputAdornment>,
                                    }}
                                    inputProps={{ min: 0 }}
                                    helperText="Remplissez l'un des deux au choix"
                                />

                                <TextField
                                    label="Longueur de culture souhaitée"
                                    type="number"
                                    value={targetDistance}
                                    onChange={(e) => {
                                        setTargetDistance(e.target.value ? Math.max(0, Number(e.target.value)) : '')
                                        setTargetArea('')
                                    }}
                                    fullWidth
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">Mètres de plants</InputAdornment>,
                                    }}
                                    inputProps={{ min: 0 }}
                                    helperText={isDoubleRow ? "Inscrivez la longueur totale des plants cumulée" : ""}
                                />
                            </Stack>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Stack spacing={3} sx={{ height: '100%' }}>
                                <Box sx={{
                                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100', // Un peu plus sombre pour meilleur contraste au soleil
                                    p: 3,
                                    borderRadius: 3,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 3
                                }}>
                                    <Typography variant="h6" fontWeight={600} color="primary.main">
                                        Résultats pour une cuve de {tankVolume || 0} L
                                    </Typography>

                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                        <WaterDrop sx={{ color: 'info.main', fontSize: 32 }} />
                                        <Box>
                                            <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>Produit à mettre dans la cuve</Typography>
                                            <Typography variant="h4" fontWeight="bold" color="info.main">
                                                {formatDose(doseInTank)}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'text.primary', opacity: 0.8 }}>
                                                (soit {doseInTank.toFixed(3)} {formatActualUnit()})
                                            </Typography>
                                            {isMicroDose(doseInTank) && (
                                                <Alert severity="warning" icon={<NotificationsActive fontSize="small" />} sx={{ mt: 1, py: 0, px: 1 }}>
                                                    Micro-dose : Utilisez une balance/seringue de précision
                                                </Alert>
                                            )}
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mt: 1 }}>
                                        <Opacity sx={{ color: 'info.dark', fontSize: 28 }} />
                                        <Box>
                                            <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>Dosage précis</Typography>
                                            <Typography variant="h6" fontWeight="bold" sx={{ color: 'text.primary' }}>
                                                {formatDose(dosePerLiter)} / L d'eau
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Divider />

                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                        <Landscape sx={{ color: 'success.main', fontSize: 32 }} />
                                        <Box>
                                            <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>Surface couverte avec cette cuve</Typography>
                                            <Typography variant="h5" fontWeight="bold" color="success.main">
                                                {treatedArea.toFixed(0)} m²
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                        <Straighten sx={{ color: 'warning.main', fontSize: 32 }} />
                                        <Box>
                                            <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>Longueur de plants faisable</Typography>
                                            <Typography variant="h5" fontWeight="bold" color="warning.main">
                                                {plantMeters.toFixed(0)} mètres
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'text.primary', opacity: 0.8 }}>
                                                (soit {linearMeters.toFixed(0)}m de planche, basé sur {rowSpacing || 0}m inter-rang)
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                {(targetArea || targetDistance) && (
                                    <Box sx={{
                                        bgcolor: 'primary.light',
                                        color: 'primary.contrastText',
                                        p: 3,
                                        borderRadius: 3,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                        boxShadow: 2
                                    }}>
                                        <Typography variant="h6" fontWeight={700}>
                                            Besoins pour votre parcelle
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                            Pour traiter {targetArea ? `${targetArea} m² (soit ${displayDistance.toFixed(0)} m de plants)` : `${targetDistance} m linéaires (soit ${computeArea.toFixed(0)} m²)`} :
                                        </Typography>

                                        <Grid container spacing={2} mt={1}>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" fontWeight={600}>Total Eau</Typography>
                                                <Typography variant="h6" fontWeight="bold">{targetWater.toFixed(1)} L</Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" fontWeight={600}>Total Produit</Typography>
                                                <Typography variant="h6" fontWeight="bold">{formatDose(targetDose)}</Typography>
                                            </Grid>
                                            <Grid item xs={12} mt={1}>
                                                <Typography variant="body2" fontWeight={600}>Nombre de cuves à préparer</Typography>
                                                <Typography variant="h5" fontWeight="bold">
                                                    {targetTanks.toFixed(1)} <Typography component="span" variant="body1">cuve(s) de {tankVolume} L</Typography>
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    )
}
