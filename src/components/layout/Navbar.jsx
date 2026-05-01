import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWeather } from '../../hooks/useWeather'
import { useAuth } from '../../context'
import { useChatContext } from './MainLayout'
import { ROUTES } from '../../constants'
import { getUserDataFromFirestore } from '../../services/firestoreService'
import { Button, Input, Modal } from '../common'
import {
  Menu, X, Home, Lock, Calendar, MessageCircle, Factory, Users,
  Wind, Thermometer, CloudOff, Loader2, School, Shield
} from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [pendingPath, setPendingPath] = useState(ROUTES.APPOINTMENTS)
  const { weather, loading } = useWeather()
  const {
    user,
    userRole,
    isAuthenticated,
    login,
    registerStudent,
    loginWithGoogle,
    logout,
    authLoading,
  } = useAuth()
  const { chatOpen, setChatOpen } = useChatContext()

  const resetAuthForm = () => {
    setFullName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setLoginError('')
  }

  const handleAppointmentsClick = () => {
    if (isAuthenticated) {
      setMenuOpen(false)
      navigate(ROUTES.APPOINTMENTS)
      return
    }

    setPendingPath(ROUTES.APPOINTMENTS)
    setMenuOpen(false)
    setLoginError('')
    setIsRegisterMode(false)
    setLoginOpen(true)
  }

  const handleOpenLoginModal = () => {
    setMenuOpen(false)
    setPendingPath(ROUTES.HOME)
    setLoginError('')
    setIsRegisterMode(false)
    setLoginOpen(true)
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      let credentials = null

      if (isRegisterMode) {
        const trimmedName = fullName.trim()
        if (!trimmedName) {
          throw new Error('name-required')
        }
        if (password.length < 6) {
          throw new Error('weak-password')
        }
        if (password !== confirmPassword) {
          throw new Error('password-mismatch')
        }

        credentials = await registerStudent({
          nombre: trimmedName,
          email: email.trim(),
          password,
        })
      } else {
        credentials = await login(email.trim(), password)
      }

      const authUser = credentials?.user
      const profile = authUser?.uid
        ? await getUserDataFromFirestore(authUser.uid, authUser.email)
        : null
      const nextPath = profile?.rol === 'ADMINISTRADOR' ? ROUTES.ADMIN : pendingPath

      setLoginOpen(false)
      resetAuthForm()
      navigate(nextPath)
    } catch (error) {
      const code = error?.code || error?.message

      if (code === 'name-required') {
        setLoginError('Ingresa tu nombre para completar el registro.')
      } else if (code === 'password-mismatch') {
        setLoginError('Las contraseñas no coinciden.')
      } else if (code === 'weak-password' || code === 'auth/weak-password') {
        setLoginError('La contraseña debe tener al menos 6 caracteres.')
      } else if (code === 'auth/email-already-in-use') {
        setLoginError('Este correo ya está registrado. Intenta iniciar sesión.')
      } else if (code === 'auth/invalid-email') {
        setLoginError('El correo no es válido.')
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setLoginError('No se pudo iniciar sesión. Verifica tu correo y contraseña.')
      } else {
        setLoginError('No se pudo completar la autenticación. Inténtalo de nuevo.')
      }
    } finally {
      setLoginLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoginError('')
    setLoginLoading(true)

    try {
      const credentials = await loginWithGoogle()
      const authUser = credentials?.user
      const profile = authUser?.uid
        ? await getUserDataFromFirestore(authUser.uid, authUser.email)
        : null
      const nextPath = profile?.rol === 'ADMINISTRADOR' ? ROUTES.ADMIN : pendingPath

      setLoginOpen(false)
      resetAuthForm()
      navigate(nextPath)
    } catch {
      setLoginError('No se pudo continuar con Google. Inténtalo de nuevo.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    setMenuOpen(false)
    navigate(ROUTES.HOME)
  }

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
            src="/logo_fnegro_tblanco.png"
            alt="SIIS"
            className="h-8 w-auto"
          />
        </Link>
      </div>

      {/* ── CENTRO: Widget de clima + Botón de Chat ── */}
      <div className="flex items-center gap-2">
        {!authLoading && isAuthenticated && userRole && (
          <span
            className="hidden md:inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
            style={{ background: 'rgba(255,255,255,0.18)', color: 'white', border: '1px solid rgba(255,255,255,0.26)' }}
          >
            {userRole}
          </span>
        )}

        {!authLoading && !isAuthenticated && (
          <button
            type="button"
            onClick={handleOpenLoginModal}
            className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.18)', color: 'white', border: '1px solid rgba(255,255,255,0.28)' }}
          >
            Iniciar sesión
          </button>
        )}

        {/* Botón de Chat */}
        <button
          onClick={() => setChatOpen(o => !o)}
          title="Abrir chat con agente inteligente"
          className="p-2 rounded-lg transition-all duration-200 relative group hidden sm:flex items-center justify-center hover:scale-110"
          style={{
            background: chatOpen ? 'rgba(204, 0, 0, 0.3)' : 'rgba(255,255,255,0.13)',
            border: chatOpen ? '1.5px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.18)',
            color: 'white',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = chatOpen ? 'rgba(204, 0, 0, 0.3)' : 'rgba(255,255,255,0.13)'
            e.currentTarget.style.borderColor = chatOpen ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)'
          }}
        >
          <MessageCircle size={16} />
          {/* Badge de status */}
          <span className="absolute top-1 right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-lg" />
        </button>

        {/* Widget de clima */}
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
              { label: 'Inicio',   path: ROUTES.HOME,     Icon: Home,    active: true },
{ label: 'Salones',  path: ROUTES.SALONES,  Icon: School,  active: true },
{ label: 'Personal', path: ROUTES.PERSONAL, Icon: Users,   active: true },
{ label: 'Máquinas', path: ROUTES.MAQUINAS, Icon: Factory, active: true },
...(userRole === 'ADMINISTRADOR' ? [{ label: 'Administración', path: ROUTES.ADMIN, Icon: Shield, active: true }] : []),
{ label: 'Próximamente…', path: '#',        Icon: Lock,    active: false },
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

            <button
              type="button"
              onClick={handleAppointmentsClick}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors"
              style={{ color: 'var(--color-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Calendar size={14} />
              Citas
            </button>

            {!authLoading && isAuthenticated && (
              <>
                <div className="mx-4 my-2 h-px" style={{ background: 'var(--color-border)' }} />
                <div className="px-4 pb-2">
                  <p className="text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    {user?.email}
                  </p>
                  <Button onClick={handleLogout} variant="secondary" className="w-full !text-[12px] !py-1.5">
                    Cerrar sesión
                  </Button>
                </div>
              </>
            )}
          </nav>
        </>
      )}

      <Modal
        isOpen={loginOpen}
        onClose={() => {
          if (loginLoading) return
          setLoginOpen(false)
          resetAuthForm()
        }}
        title={isRegisterMode ? 'Crear cuenta de estudiante' : 'Iniciar sesión'}
      >
        <form className="flex flex-col gap-3" onSubmit={handleLoginSubmit}>
          {isRegisterMode && (
            <Input
              label="Nombre"
              name="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Tu nombre"
              required
            />
          )}

          <Input
            label="Correo"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="usuario@correo.com"
            required
          />

          <Input
            label="Contraseña"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />

          {isRegisterMode && (
            <Input
              label="Confirmar contraseña"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          )}

          {loginError && <p className="text-xs text-red-500">{loginError}</p>}

          <Button type="submit" disabled={loginLoading} className="mt-1">
            {loginLoading
              ? 'Procesando...'
              : isRegisterMode
                ? 'Registrarme como estudiante'
                : 'Entrar'}
          </Button>

          <button
            type="button"
            disabled={loginLoading}
            onClick={handleGoogleAuth}
            className="w-full rounded-md border px-3 py-2 text-sm font-medium transition"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            Continuar con Google
          </button>

          <p className="text-[11px] text-center" style={{ color: 'var(--color-text-muted)' }}>
            {isRegisterMode
              ? 'El autoregistro solo crea cuentas con rol ESTUDIANTE.'
              : 'Si no tienes cuenta, puedes registrarte como ESTUDIANTE.'}
          </p>

          <button
            type="button"
            disabled={loginLoading}
            onClick={() => {
              setIsRegisterMode((prev) => !prev)
              setLoginError('')
              setPassword('')
              setConfirmPassword('')
            }}
            className="text-xs underline underline-offset-2"
            style={{ color: 'var(--color-primary)' }}
          >
            {isRegisterMode ? 'Ya tengo cuenta, iniciar sesión' : 'Crear cuenta nueva'}
          </button>
        </form>
      </Modal>
    </header>
  )
}
