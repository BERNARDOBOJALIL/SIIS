import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import ThreeViewer from '../components/viewer/ThreeViewer'
import { useChatContext } from '../components/layout/MainLayout'

// OPT: split route UI bundle from the 3D viewer bundle.
const RightPanel = lazy(() => import('../components/panels/RightPanel'))

export default function HomePage() {
  const { setChatOpen } = useChatContext()
  const [mountRightPanel, setMountRightPanel] = useState(false)
  const [pisoActivo, setPisoActivo] = useState('PB')
  const [routeVisible, setRouteVisible] = useState(false)
  const [openSalonDetailsRequest, setOpenSalonDetailsRequest] = useState(null)

  const handleRouteVisibilityChange = useCallback((visible) => {
    setRouteVisible(Boolean(visible))
  }, [])

  const handleOpenSalonDetails = useCallback((payload) => {
    if (!payload?.name) return
    setOpenSalonDetailsRequest({
      ...payload,
      stamp: Date.now(),
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    let idleId = null
    let timeoutId = null

    // OPT: schedule non-critical panel work when main thread is idle.
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => {
        if (!cancelled) setMountRightPanel(true)
      }, { timeout: 1200 })
    } else {
      timeoutId = window.setTimeout(() => {
        if (!cancelled) setMountRightPanel(true)
      }, 280)
    }

    return () => {
      cancelled = true
      if (idleId != null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId != null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  useEffect(() => {
    setChatOpen(!routeVisible)
  }, [routeVisible, setChatOpen])

  return (
    /*
     * Layout de dos columnas a altura completa.
     * La columna izquierda (viewer 3D) ocupa ~70 %
     * La columna derecha  (panel info) ocupa ~30 %
     */
    <div
      className="home-layout flex w-full h-full overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* ── Columna izquierda: Visor 3D ── */}
      <section
        className="home-viewer flex-1 min-w-0 flex flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        <ThreeViewer
          onPisoChange={setPisoActivo}
          onRouteVisibilityChange={handleRouteVisibilityChange}
          onOpenSalonDetails={handleOpenSalonDetails}
        />
      </section>

      {/* ── Columna derecha: Panel de información ── */}
      <section
        className={`home-panel shrink-0 overflow-hidden${routeVisible ? ' home-panel--collapsed' : ''}`}
        style={{
          width: routeVisible ? 0 : 'clamp(260px, 28%, 340px)',
          minWidth: routeVisible ? 0 : 'clamp(260px, 28%, 340px)',
          opacity: routeVisible ? 0 : 1,
          pointerEvents: routeVisible ? 'none' : 'auto',
          transition: 'width 300ms ease, min-width 300ms ease, opacity 220ms ease',
        }}
      >
        {mountRightPanel ? (
          <Suspense
            fallback={(
              <div className="h-full flex items-center justify-center text-[12px]"
                style={{ color: 'var(--color-text-muted)' }}>
                Cargando panel...
              </div>
            )}
          >
            <RightPanel piso={pisoActivo} openSalonDetailsRequest={openSalonDetailsRequest} />
          </Suspense>
        ) : (
          <div className="h-full flex items-center justify-center text-[12px]"
            style={{ color: 'var(--color-text-muted)' }}>
            Preparando panel...
          </div>
        )}
      </section>
    </div>
  )
}

