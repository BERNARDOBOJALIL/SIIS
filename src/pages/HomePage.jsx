import ThreeViewer from '../components/viewer/ThreeViewer'
import RightPanel  from '../components/panels/RightPanel'

export default function HomePage() {
  return (
    /*
     * Layout de dos columnas a altura completa.
     * La columna izquierda (viewer 3D) ocupa ~70 %
     * La columna derecha  (panel info) ocupa ~30 %
     */
    <div
      className="flex w-full h-full overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* ── Columna izquierda: Visor 3D ── */}
      <section
        className="flex-1 min-w-0 flex flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        <ThreeViewer />
      </section>

      {/* ── Columna derecha: Panel de información ── */}
      <section
        className="shrink-0 overflow-hidden"
        style={{ width: 'clamp(260px, 28%, 340px)' }}
      >
        <RightPanel />
      </section>
    </div>
  )
}

