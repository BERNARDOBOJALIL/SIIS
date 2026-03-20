import AppRouter from './routes/AppRouter'
import { AuthProvider } from './context'

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}