import React, { useEffect, useState } from 'react'
import { Fab, Dialog, DialogTitle, DialogContent, Box, Typography, Grid, Chip, Alert, CircularProgress, Tooltip, IconButton, Select, MenuItem, FormControl, InputLabel, DialogActions, Button } from '@mui/material'
import { CloudQueue, WbSunny, Opacity, Air, Warning, Close } from '@mui/icons-material'
import { fetchWeather, getCachedWeather, isCacheStale, getWeatherDescription, getWeatherIcon, getAgriculturalAlerts, WeatherData, CityName, CITIES } from '../api/weather'

export default function FloatingWeatherButton() {
    const [open, setOpen] = useState(false)
    const [weather, setWeather] = useState<WeatherData | null>(null)
    const [loading, setLoading] = useState(false)
    const [isOffline, setIsOffline] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedCity, setSelectedCity] = useState<CityName>('Monteux')

    const loadWeather = async (city: CityName) => {
        try {
            // Check if cache is stale
            if (isCacheStale(city)) {
                setLoading(true)
            }

            const data = await fetchWeather(city)
            setWeather(data)
            setIsOffline(false)
            setError(null)
        } catch (err) {
            console.error('Failed to fetch weather:', err)

            // Try to use cached data
            const cached = getCachedWeather(city)
            if (cached) {
                setWeather(cached)
                setIsOffline(true)
                setError(null)
            } else {
                setError('Impossible de charger la météo')
            }
        } finally {
            setLoading(false)
        }
    }


    useEffect(() => {
        // Load weather when city changes
        if (open) {
            loadWeather(selectedCity)
        }
    }, [selectedCity, open])

    useEffect(() => {
        if (!open) return

        // Refresh every 30 minutes when dialog is open
        const interval = setInterval(() => {
            loadWeather(selectedCity)
        }, 30 * 60 * 1000)

        return () => clearInterval(interval)
    }, [open, selectedCity])

    const handleOpen = () => {
        setOpen(true)
        if (!weather || weather.city !== selectedCity) {
            loadWeather(selectedCity)
        }
    }

    const alerts = weather ? getAgriculturalAlerts(weather) : []
    const cacheAge = weather ? Math.floor((Date.now() - new Date(weather.lastUpdated).getTime()) / 60000) : 0

    return (
        <>
            {/* Floating Action Button */}
            <Fab
                color="primary"
                variant="extended"
                aria-label="météo"
                onClick={handleOpen}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1000,
                    px: 2
                }}
            >
                <CloudQueue sx={{ mr: 1 }} />
                <Typography variant="button" sx={{ lineHeight: 1.2 }}>
                    Météo
                </Typography>
            </Fab>

            {/* Weather Dialog */}
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CloudQueue sx={{ fontSize: 28, mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6" fontWeight={700}>
                            Météo Agricole
                        </Typography>
                    </Box>
                    <IconButton onClick={() => setOpen(false)} size="small">
                        <Close />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    {/* City Selector */}
                    <Box sx={{ mt: 2, mb: 3 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Ville</InputLabel>
                            <Select
                                value={selectedCity}
                                label="Ville"
                                onChange={(e) => setSelectedCity(e.target.value as CityName)}
                            >
                                {Object.keys(CITIES).map((city) => (
                                    <MenuItem key={city} value={city}>{city}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Offline indicator */}
                    {isOffline && (
                        <Chip
                            label={`Mode hors ligne (${cacheAge} min)`}
                            size="small"
                            color="warning"
                            sx={{ mb: 2 }}
                        />
                    )}

                    {loading && !weather ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : error && !weather ? (
                        <Alert severity="error">{error}</Alert>
                    ) : weather ? (
                        <>
                            {/* Current Weather */}
                            <Box sx={{ mb: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="h2" fontWeight={700} sx={{ mr: 2 }}>
                                        {Math.round(weather.current.temperature)}°C
                                    </Typography>
                                    <Typography variant="h3">
                                        {getWeatherIcon(weather.current.weatherCode)}
                                    </Typography>
                                </Box>
                                <Typography variant="body1" color="text.secondary" gutterBottom>
                                    {getWeatherDescription(weather.current.weatherCode)}
                                </Typography>

                                <Grid container spacing={1} sx={{ mt: 1 }}>
                                    <Grid item xs={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Air sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
                                            <Typography variant="body2">
                                                {Math.round(weather.current.windSpeed)} km/h
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Opacity sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
                                            <Typography variant="body2">
                                                {weather.current.humidity}%
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Agricultural Alerts */}
                            {alerts.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    {alerts.map((alert, index) => (
                                        <Alert key={index} severity="warning" icon={<Warning />} sx={{ mb: 1, py: 0.5 }}>
                                            <Typography variant="body2">{alert}</Typography>
                                        </Alert>
                                    ))}
                                </Box>
                            )}


                            {/* 7-Day Forecast */}
                            <Box>
                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                    Prévisions 7 jours
                                </Typography>
                                <Grid container spacing={1}>
                                    {weather.daily.slice(0, 7).map((day, index) => {
                                        const date = new Date(day.date)
                                        const dayName = index === 0 ? "Aujourd'hui" : date.toLocaleDateString('fr-FR', { weekday: 'short' })

                                        return (
                                            <Grid item xs={12} key={day.date}>
                                                <Tooltip title={`Pluie: ${day.precipitationSum}mm, Vent: ${Math.round(day.windSpeedMax)}km/h`}>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            p: 1,
                                                            borderRadius: 1,
                                                            bgcolor: index === 0 ? 'action.selected' : 'transparent',
                                                            '&:hover': { bgcolor: 'action.hover' }
                                                        }}
                                                    >
                                                        <Typography variant="body2" sx={{ minWidth: 80, fontWeight: index === 0 ? 600 : 400 }}>
                                                            {dayName}
                                                        </Typography>
                                                        <Typography variant="body1" sx={{ fontSize: 20 }}>
                                                            {getWeatherIcon(day.weatherCode)}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                            <Typography variant="body2" fontWeight={600}>
                                                                {Math.round(day.temperatureMax)}°
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {Math.round(day.temperatureMin)}°
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Tooltip>
                                            </Grid>
                                        )
                                    })}
                                </Grid>
                            </Box>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>

        </>
    )
}
