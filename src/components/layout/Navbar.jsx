import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWeather } from '../../hooks/useWeather'
import {
  Menu, X, Home, Lock,
  Wind, Thermometer, CloudOff, Loader2,
} from 'lucide-react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { weather, loading } = useWeather()

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
      style={{
        background: 'var(--color-primary)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.28)',
      }}
    >
      {/* ── IZQUIERDA: Hamburguesa + Logo ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
          style={{ background: menuOpen ? 'rgba(255,255,255,0.2)' : 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = menuOpen ? 'rgba(255,255,255,0.2)' : 'transparent')}
        >
          {menuOpen
            ? <X size={18} color="white" strokeWidth={2.2} />
            : <Menu size={18} color="white" strokeWidth={2.2} />
          }
        </button>

        <Link to="/" className="flex items-center gap-2 select-none">
          <img
            src="/Logo_proyecto.svg"
            alt="SIIS"
            className="h-8 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </Link>
      </div>

      {/* ── Widget de clima ── */}
      <div
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.18)' }}
      >
        {loading ? (
          <Loader2 size={14} color="rgba(255,255,255,0.7)" className="animate-spin" />
        ) : weather ? (
          <>
            <Thermometer size={15} color="rgba(255,255,255,0.90)" />
            <div className="flex flex-col leading-tight">
              <span className="text-white font-bold text-[14px] leading-none">
                {weather.temp}°C
              </span>
              <span className="text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.72)' }}>
                {weather.city} · {weather.description}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1 ml-1 pl-2"
              style={{ borderLeft: '1px solid rgba(255,255,255,0.22)' }}>
              <Wind size={12} color="rgba(255,255,255,0.65)" />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {weather.windspeed} km/h
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <CloudOff size={14} color="rgba(255,255,255,0.55)" />
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Sin datos
            </span>
          </div>
        )}
      </div>

      {/* ── Menú desplegable ── */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-14 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            className="absolute top-14 left-0 z-50 w-52 py-1.5 rounded-b-xl overflow-hidden"
            style={{
              background:  'var(--color-site-white)',
              boxShadow:   '0 8px 24px rgba(0,0,0,0.18)',
              border:      '1px solid var(--color-border)',
              borderTop:   'none',
            }}
          >
            <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-text-muted)' }}>
              Navegación
            </p>

            {[
              { label: 'Inicio',         path: '/',  Icon: Home,  active: true  },
              { label: 'Próximamente…',  path: '#',  Icon: Lock,  active: false },
            ].map(({ label, path, Icon, active }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors"
                style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </header>
  )
}
