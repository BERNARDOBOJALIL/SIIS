export default function Footer() {
  return (
    <footer className="bg-white border-t py-4">
      <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} SIIS. Todos los derechos reservados.
      </div>
    </footer>
  )
}
