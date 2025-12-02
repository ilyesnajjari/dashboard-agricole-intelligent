import React, { useEffect, useState } from 'react'
import { Box, Paper, Typography, Grid, Chip, Alert, CircularProgress, Tooltip } from '@mui/material'
import { CloudQueue, WbSunny, Opacity, Air, Warning } from '@mui/icons-material'
import { fetchWeather, getCachedWeather, isCacheStale, getWeatherDescription, getWeatherIcon, getAgriculturalAlerts, WeatherData } from '../api/weather'

export default function WeatherWidget() {
    const [weather, setWeather] = useState<WeatherData | null>(null)
    const [loading, setLoading] = useState(true)
    const [isOffline, setIsOffline] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadWeather = async () => {
        try {
            // Check if cache is stale
            if (isCacheStale()) {
                setLoading(true)
            }

            const data = await fetchWeather()
            setWeather(data)
            setIsOffline(false)
            setError(null)
        } catch (err) {
            console.error('Failed to fetch weather:', err)

            // Try to use cached data
            const cached = getCachedWeather()
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
        // Load weather on mount
        loadWeather()

        // Refresh every 30 minutes
        const interval = setInterval(() => {
            loadWeather()
        }, 30 * 60 * 1000)

        return () => clearInterval(interval)
    }, [])

    if (loading && !weather) {
        return (
            <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
            </Paper>
        )
    }

    if (error && !weather) {
        return (
            <Paper sx={{ p: 3, height: '100%' }}>
                <Alert severity="error">{error}</Alert>
            </Paper>
        )
    }

    if (!weather) return null

    const alerts = getAgriculturalAlerts(weather)
    const cacheAge = Math.floor((Date.now() - new Date(weather.lastUpdated).getTime()) / 60000)

    return (
        <Paper sx={{ p: 3, height: '100%', position: 'relative' }}>
            {/* Offline indicator */}
            {isOffline && (
                <Chip
                    label={`Mode hors ligne (${cacheAge} min)`}
                    size="small"
                    color="warning"
                    sx={{ position: 'absolute', top: 8, right: 8, fontSize: '0.7rem' }}
                />
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudQueue sx={{ fontSize: 32, mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>
                    Météo Monteux
                </Typography>
            </Box>

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
                            <Grid item xs={12} sm={6} md={12} lg={6} key={day.date}>
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
                                        <Typography variant="body2" sx={{ minWidth: 60, fontWeight: index === 0 ? 600 : 400 }}>
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
        </Paper>
    )
}
