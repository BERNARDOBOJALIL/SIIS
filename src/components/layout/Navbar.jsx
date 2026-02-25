import { Link, NavLink } from 'react-router-dom'

export default function Navbar() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-blue-600">SIIS</Link>
        <nav className="flex gap-6">
          <NavLink to="/" className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}>
            Inicio
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
