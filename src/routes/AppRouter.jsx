import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ROUTES } from '../constants'
import { MainLayout } from '../components/layout'
import HomePage from '../pages/HomePage'
import AppointmentsPage from '../pages/AppointmentsPage'
import NotFoundPage from '../pages/NotFoundPage'
import SalonesPanel from '../components/panels/SalonesPanel'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
  <Route path={ROUTES.HOME} element={<HomePage />} />
  <Route path={ROUTES.APPOINTMENTS} element={<AppointmentsPage />} />
  <Route path={ROUTES.SALONES} element={<SalonesPanel />} />
</Route>
        <Route path="*" element={<NotFoundPage />} />
        <Route path={ROUTES.SALONES} element={<SalonesPanel />} />
      </Routes>
    </BrowserRouter>
  )
}
