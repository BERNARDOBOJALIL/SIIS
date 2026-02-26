import { useState, useEffect } from 'react'

// Coordenadas de Puebla, México
const LAT = 19.0414
const LON = -98.2063
const CITY = 'Puebla'

const WMO_CODES = {
  0:  { label: 'Despejado',       icon: '☀️' },
  1:  { label: 'Mayormente claro',icon: '🌤️' },
  2:  { label: 'Parcialmente nublado', icon: '⛅' },
  3:  { label: 'Nublado',         icon: '☁️' },
  45: { label: 'Neblina',         icon: '🌫️' },
  48: { label: 'Neblina helada',  icon: '🌫️' },
  51: { label: 'Llovizna leve',   icon: '🌦️' },
  53: { label: 'Llovizna',        icon: '🌦️' },
  55: { label: 'Llovizna densa',  icon: '🌧️' },
  61: { label: 'Lluvia leve',     icon: '🌧️' },
  63: { label: 'Lluvia',          icon: '🌧️' },
  65: { label: 'Lluvia fuerte',   icon: '🌧️' },
  71: { label: 'Nieve leve',      icon: '❄️' },
  73: { label: 'Nieve',           icon: '❄️' },
  75: { label: 'Nevada fuerte',   icon: '❄️' },
  80: { label: 'Chubascos',       icon: '🌦️' },
  81: { label: 'Chubascos mod.',  icon: '🌧️' },
  82: { label: 'Chubascos fuertes',icon: '🌧️' },
  95: { label: 'Tormenta',        icon: '⛈️' },
  96: { label: 'Tormenta c/granizo', icon: '⛈️' },
  99: { label: 'Tormenta intensa',icon: '⛈️' },
}

export function useWeather() {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchWeather() {
      try {
        setLoading(true)
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${LAT}&longitude=${LON}` +
          `&current_weather=true&temperature_unit=celsius` +
          `&windspeed_unit=kmh`

        const res  = await fetch(url, { signal: controller.signal })
        const data = await res.json()
        const cw   = data.current_weather

        const code    = cw.weathercode
        const meta    = WMO_CODES[code] ?? { label: 'Desconocido', icon: '🌡️' }

        setWeather({
          city:        CITY,
          temp:        Math.round(cw.temperature),
          windspeed:   Math.round(cw.windspeed),
          icon:        meta.icon,
          description: meta.label,
          isDay:       cw.is_day === 1,
        })
      } catch (err) {
        if (err.name !== 'AbortError') setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
    // Actualizar cada 10 minutos
    const interval = setInterval(fetchWeather, 10 * 60 * 1000)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [])

  return { weather, loading, error }
}
