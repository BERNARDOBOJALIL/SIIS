import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function MainLayout() {
  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <Navbar />
      {/* El contenido empieza después de la navbar fija (h-14 = 56px) */}
      <main className="flex-1 overflow-hidden" style={{ marginTop: '56px' }}>
        <Outlet />
      </main>
    </div>
  )
}

