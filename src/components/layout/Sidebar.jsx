export default function Sidebar({ children }) {
  return (
    <aside className="w-64 min-h-screen bg-gray-800 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <span className="text-lg font-bold">SIIS</span>
      </div>
      <nav className="flex-1 p-4">
        {children}
      </nav>
    </aside>
  )
}
