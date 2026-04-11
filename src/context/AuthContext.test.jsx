import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'

const authState = vi.hoisted(() => {
  let authCallback = null

  return {
    auth: { id: 'mock-auth' },
    onAuthStateChanged: vi.fn((auth, callback) => {
      authCallback = callback
      return vi.fn()
    }),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    getAuthCallback: () => authCallback,
  }
})

const firestoreServiceMocks = vi.hoisted(() => ({
  getUserDataFromFirestore: vi.fn(),
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: authState.onAuthStateChanged,
  signInWithEmailAndPassword: authState.signInWithEmailAndPassword,
  signOut: authState.signOut,
}))

vi.mock('../services/firebase', () => ({ auth: authState.auth }))
vi.mock('../services/firestoreService', () => firestoreServiceMocks)

import { AuthProvider, useAuth } from './AuthContext'

function AuthProbe() {
  const auth = useAuth()

  return (
    <div>
      <span>{auth.user ? auth.user.uid : 'no-user'}</span>
      <span>{auth.userRole || 'no-role'}</span>
      <span>{auth.isAuthenticated ? 'yes' : 'no'}</span>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hydrates user and role from Firebase', async () => {
    firestoreServiceMocks.getUserDataFromFirestore.mockResolvedValue({ uid: 'u-1', rol: 'ESTUDIANTE', nombre: 'Ana' })

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await act(async () => {
      await authState.getAuthCallback()({ uid: 'u-1' })
    })

    await waitFor(() => {
      expect(screen.getByText('u-1')).toBeInTheDocument()
      expect(screen.getByText('ESTUDIANTE')).toBeInTheDocument()
      expect(screen.getByText('yes')).toBeInTheDocument()
    })
  })

  it('exposes a logged-out state when Firebase returns null', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await act(async () => {
      await authState.getAuthCallback()(null)
    })

    await waitFor(() => {
      expect(screen.getByText('no-user')).toBeInTheDocument()
      expect(screen.getByText('no-role')).toBeInTheDocument()
      expect(screen.getByText('no')).toBeInTheDocument()
    })
  })
})