export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="text-gray-500 text-lg">Página no encontrada</p>
      <a href="/" className="text-blue-600 hover:underline">Volver al inicio</a>
    </div>
  )
}
