import { lazy, Suspense, useEffect, useState } from 'react'
import ThreeViewer from '../components/viewer/ThreeViewer'

// OPT: split route UI bundle from the 3D viewer bundle.
const RightPanel = lazy(() => import('../components/panels/RightPanel'))

export default function HomePage() {
  const [mountRightPanel, setMountRightPanel] = useState(false)
  const [pisoActivo, setPisoActivo] = useState('PB')

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
        <ThreeViewer onPisoChange={setPisoActivo} />
      </section>

      {/* ── Columna derecha: Panel de información ── */}
      <section
        className="home-panel shrink-0 overflow-hidden"
        style={{ width: 'clamp(260px, 28%, 340px)' }}
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
            <RightPanel piso={pisoActivo} />
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

