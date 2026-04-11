import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Outlet } from 'react-router-dom'

vi.mock('../components/layout', () => ({
  MainLayout: () => <Outlet />,
}))

vi.mock('../pages/HomePage', () => ({
  default: () => <div>home-page</div>,
}))

vi.mock('../pages/AppointmentsPage', () => ({
  default: () => <div>appointments-page</div>,
}))

vi.mock('../components/panels/SalonesPanel', () => ({
  default: () => <div>salones-panel</div>,
}))

vi.mock('../pages/NotFoundPage', () => ({
  default: () => <div>not-found-page</div>,
}))

import AppRouter from './AppRouter'

describe('AppRouter', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('renders the home route', () => {
    render(<AppRouter />)

    expect(screen.getByText('home-page')).toBeInTheDocument()
  })

  it('renders the appointments route', () => {
    window.history.pushState({}, '', '/citas')

    render(<AppRouter />)

    expect(screen.getByText('appointments-page')).toBeInTheDocument()
  })

  it('renders the 404 route for unknown paths', () => {
    window.history.pushState({}, '', '/ruta-inexistente')

    render(<AppRouter />)

    expect(screen.getByText('not-found-page')).toBeInTheDocument()
  })
})