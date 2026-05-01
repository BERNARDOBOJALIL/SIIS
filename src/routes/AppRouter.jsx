import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ROUTES } from '../constants'
import { MainLayout } from '../components/layout'
import HomePage from '../pages/HomePage'
import AppointmentsPage from '../pages/AppointmentsPage'
import NotFoundPage from '../pages/NotFoundPage'
import SalonesPanel from '../components/panels/SalonesPanel'
import PersonalPanel from '../components/panels/PersonalPanel'
import MaquinasPanel from '../components/panels/MaquinasPanel'
import AdminDashboard from '../pages/AdminDashboard'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path={ROUTES.HOME} element={<HomePage />} />
          <Route path={ROUTES.APPOINTMENTS} element={<AppointmentsPage />} />
          <Route path={ROUTES.SALONES} element={<SalonesPanel />} />
          <Route path={ROUTES.PERSONAL} element={<PersonalPanel />} />
          <Route path={ROUTES.MAQUINAS} element={<MaquinasPanel />} />
          <Route path={ROUTES.ADMIN} element={<AdminDashboard />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}