// Weather API client for Monteux using Open-Meteo
// Coordinates: 44.0333°N, 4.9833°E

export interface CurrentWeather {
    temperature: number
    weatherCode: number
    windSpeed: number
    windDirection: number
    humidity: number
    time: string
}

export interface DailyForecast {
    date: string
    temperatureMax: number
    temperatureMin: number
    weatherCode: number
    precipitationSum: number
    windSpeedMax: number
}

export interface WeatherData {
    current: CurrentWeather
    daily: DailyForecast[]
    lastUpdated: string
    city: string
}

// City coordinates
export const CITIES = {
    'Monteux': { lat: 44.0333, lon: 4.9833 },
    'Pernes-les-Fontaines': { lat: 43.9997, lon: 5.0594 },
    'Carpentras': { lat: 44.0550, lon: 5.0481 }
}

export type CityName = keyof typeof CITIES

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

// Weather code to description mapping (WMO codes)
export const getWeatherDescription = (code: number): string => {
    const descriptions: Record<number, string> = {
        0: 'Ciel dégagé',
        1: 'Principalement dégagé',
        2: 'Partiellement nuageux',
        3: 'Couvert',
        45: 'Brouillard',
        48: 'Brouillard givrant',
        51: 'Bruine légère',
        53: 'Bruine modérée',
        55: 'Bruine dense',
        61: 'Pluie légère',
        63: 'Pluie modérée',
        65: 'Pluie forte',
        71: 'Neige légère',
        73: 'Neige modérée',
        75: 'Neige forte',
        77: 'Grains de neige',
        80: 'Averses légères',
        81: 'Averses modérées',
        82: 'Averses violentes',
        85: 'Averses de neige légères',
        86: 'Averses de neige fortes',
        95: 'Orage',
        96: 'Orage avec grêle légère',
        99: 'Orage avec grêle forte'
    }
    return descriptions[code] || 'Inconnu'
}

// Weather code to emoji/icon
export const getWeatherIcon = (code: number): string => {
    if (code === 0) return '☀️'
    if (code <= 3) return '⛅'
    if (code <= 48) return '🌫️'
    if (code <= 55) return '🌦️'
    if (code <= 65) return '🌧️'
    if (code <= 77) return '❄️'
    if (code <= 82) return '🌧️'
    if (code <= 86) return '🌨️'
    return '⛈️'
}

// Agricultural alerts based on weather (current + forecast)
export const getAgriculturalAlerts = (weather: WeatherData): string[] => {
    const alerts: string[] = []
    const today = weather.daily[0]
    const tomorrow = weather.daily[1]
    const next3Days = weather.daily.slice(0, 3)

    // === FROST ALERTS (Critical) ===
    // Current frost
    if (weather.current.temperature < 0) {
        alerts.push('🥶 GEL EN COURS ! Couvrir immédiatement les cultures sensibles (voiles, tunnels)')
    } else if (weather.current.temperature < 2) {
        alerts.push('⚠️ Risque de gel imminent (< 2°C) - Préparer les protections')
    }

    // Frost forecast
    if (tomorrow && tomorrow.temperatureMin < 0) {
        alerts.push('❄️ GEL PRÉVU DEMAIN ! Installer les voiles de protection ce soir')
    } else if (tomorrow && tomorrow.temperatureMin < 2) {
        alerts.push('⚠️ Gel possible demain matin - Surveiller et préparer les protections')
    }

    // Extended frost forecast
    const frostDays = next3Days.filter(d => d.temperatureMin < 2).length
    if (frostDays >= 2) {
        alerts.push(`❄️ ${frostDays} jours de gel prévus - Maintenir les protections en place`)
    }

    // === RAIN ALERTS ===
    // Heavy rain today
    if (today.precipitationSum > 30) {
        alerts.push('🌧️ FORTE PLUIE AUJOUR\'HUI (>30mm) - Reporter tous travaux au champ, vérifier drainage')
    } else if (today.precipitationSum > 15) {
        alerts.push('🌧️ Pluie importante prévue (>15mm) - Éviter les travaux lourds, risque de tassement')
    } else if (today.precipitationSum > 5) {
        alerts.push('🌦️ Pluie modérée - Pas d\'arrosage nécessaire, reporter les traitements')
    }

    // Rain forecast
    if (tomorrow && tomorrow.precipitationSum > 20) {
        alerts.push('🌧️ FORTE PLUIE DEMAIN - Finir les travaux urgents aujourd\'hui, fermer les serres')
    }

    // Extended rain
    const totalRain3Days = next3Days.reduce((sum, d) => sum + d.precipitationSum, 0)
    if (totalRain3Days > 50) {
        alerts.push('🌧️ Période pluvieuse (>50mm sur 3j) - Surveiller l\'humidité des serres, risque maladies')
    }

    // === WIND ALERTS ===
    // Current strong wind
    if (weather.current.windSpeed > 60) {
        alerts.push('💨 VENT VIOLENT ! Vérifier immédiatement serres, tunnels et palissages')
    } else if (weather.current.windSpeed > 40) {
        alerts.push('💨 Vent fort - Fermer les ouvrants des serres, sécuriser le matériel')
    }

    // Wind forecast
    const maxWind3Days = Math.max(...next3Days.map(d => d.windSpeedMax))
    if (maxWind3Days > 60) {
        alerts.push('💨 ALERTE VENT VIOLENT PRÉVU - Sécuriser serres, bâches et équipements dès maintenant')
    } else if (maxWind3Days > 50) {
        alerts.push('💨 Vent fort prévu - Anticiper : fermer serres, arrimer bâches, rentrer matériel léger')
    }

    // === HEAT ALERTS ===
    // Current heat
    if (weather.current.temperature > 35) {
        alerts.push('🌡️ CANICULE ! Arroser matin et soir, ouvrir les serres, ombrager si possible')
    } else if (weather.current.temperature > 30) {
        alerts.push('☀️ Forte chaleur - Augmenter l\'arrosage, aérer les serres, surveiller stress hydrique')
    }

    // Heat forecast
    if (tomorrow && tomorrow.temperatureMax > 35) {
        alerts.push('🌡️ CANICULE DEMAIN - Prévoir arrosage renforcé, préparer ombrages, ouvrir serres tôt')
    } else if (tomorrow && tomorrow.temperatureMax > 32) {
        alerts.push('☀️ Forte chaleur demain - Planifier arrosage matinal, aération des serres')
    }

    // === GREENHOUSE MANAGEMENT ===
    // Heat + Low humidity = ventilation needed
    if (weather.current.temperature > 25 && weather.current.humidity < 50) {
        alerts.push('🏠 Ouvrir les serres - Température élevée et air sec, risque de stress')
    }

    // Cold + High humidity = disease risk
    if (weather.current.temperature < 15 && weather.current.humidity > 80) {
        alerts.push('🏠 Aérer les serres - Humidité élevée, risque de maladies fongiques')
    }

    // === IRRIGATION ALERTS ===
    // No rain + heat = irrigation needed
    const noRain3Days = next3Days.every(d => d.precipitationSum < 2)
    const avgTemp3Days = next3Days.reduce((sum, d) => sum + d.temperatureMax, 0) / 3

    if (noRain3Days && avgTemp3Days > 28) {
        alerts.push('💧 Période sèche et chaude - Arroser régulièrement, pailler pour garder l\'humidité')
    } else if (noRain3Days && avgTemp3Days > 22) {
        alerts.push('💧 Pas de pluie prévue - Surveiller l\'arrosage, surtout pour cultures en pots')
    }

    // === WORK PLANNING ===
    // Good weather window
    if (today.precipitationSum < 2 && today.windSpeedMax < 30 && today.temperatureMax > 10 && today.temperatureMax < 28) {
        alerts.push('✅ Conditions idéales aujourd\'hui - Bon moment pour plantations, traitements, travaux')
    }

    // Optimal planting conditions
    if (weather.current.temperature > 12 && weather.current.temperature < 25 && today.precipitationSum < 5) {
        alerts.push('🌱 Conditions favorables aux plantations - Sol ni trop sec ni détrempé')
    }

    return alerts
}

export const fetchWeather = async (city: CityName = 'Monteux'): Promise<WeatherData> => {
    const cacheKey = `weather_cache_${city.toLowerCase().replace(/[^a-z]/g, '_')}`

    try {
        const coords = CITIES[city]
        // Try to fetch from API
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=Europe/Paris&forecast_days=7`

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error('Weather API request failed')
        }

        const data = await response.json()

        const weatherData: WeatherData = {
            current: {
                temperature: data.current.temperature_2m,
                weatherCode: data.current.weather_code,
                windSpeed: data.current.wind_speed_10m,
                windDirection: data.current.wind_direction_10m,
                humidity: data.current.relative_humidity_2m,
                time: data.current.time
            },
            daily: data.daily.time.map((date: string, index: number) => ({
                date,
                temperatureMax: data.daily.temperature_2m_max[index],
                temperatureMin: data.daily.temperature_2m_min[index],
                weatherCode: data.daily.weather_code[index],
                precipitationSum: data.daily.precipitation_sum[index],
                windSpeedMax: data.daily.wind_speed_10m_max[index]
            })),
            lastUpdated: new Date().toISOString(),
            city
        }

        // Cache the data
        localStorage.setItem(cacheKey, JSON.stringify(weatherData))

        return weatherData
    } catch (error) {
        console.error('Error fetching weather:', error)

        // Try to get cached data
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
            return JSON.parse(cached)
        }

        throw error
    }
}

export const getCachedWeather = (city: CityName = 'Monteux'): WeatherData | null => {
    const cacheKey = `weather_cache_${city.toLowerCase().replace(/[^a-z]/g, '_')}`
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null

    try {
        const data = JSON.parse(cached)
        const cacheAge = Date.now() - new Date(data.lastUpdated).getTime()

        // Return cached data even if old (for offline mode)
        return data
    } catch {
        return null
    }
}

export const isCacheStale = (city: CityName = 'Monteux'): boolean => {
    const cached = getCachedWeather(city)
    if (!cached) return true

    const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime()
    return cacheAge > CACHE_DURATION
}

export interface FrostHoursResponse {
    season: string
    hours: Record<string, number>
}

export const fetchFrostHours = async (force: boolean = false): Promise<FrostHoursResponse> => {
    const url = force ? '/api/weather/frost-hours/?force=true' : '/api/weather/frost-hours/'
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error('Failed to fetch frost hours')
    }
    return response.json()
}
