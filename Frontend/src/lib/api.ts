import type { GoogleUser } from '../types/auth'

const API_URL = import.meta.env.VITE_API_URL
const SESSION_KEY = 'junior_google_session'

type SavedSession = {
  credential: string
  user: GoogleUser
}

let googleCredential: string | null = null

function isCredentialExpired(credential: string): boolean {
  try {
    const payload = credential.split('.')[1]

    if (!payload) return true

    const normalized = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    )

    const claims = JSON.parse(atob(padded))

    return (
      typeof claims.exp !== 'number' ||
      claims.exp <= Math.floor(Date.now() / 1000) + 30
    )
  } catch {
    return true
  }
}

export function setGoogleCredential(credential: string | null) {
  googleCredential = credential
}

export function saveGoogleSession(
  credential: string,
  user: GoogleUser,
) {
  if (isCredentialExpired(credential)) {
    clearGoogleSession()
    throw new Error('Google credential has expired.')
  }

  const session: SavedSession = {
    credential,
    user,
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  googleCredential = credential
}

export function restoreGoogleSession(): GoogleUser | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY)

    if (!stored) {
      googleCredential = null
      return null
    }

    const session = JSON.parse(stored) as SavedSession

    if (
      !session.credential ||
      !session.user?.sub ||
      isCredentialExpired(session.credential)
    ) {
      clearGoogleSession()
      return null
    }

    googleCredential = session.credential

    return session.user
  } catch {
    clearGoogleSession()
    return null
  }
}

export function clearGoogleSession() {
  googleCredential = null

  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured.')
  }

  const headers = new Headers(options?.headers)

  headers.set('Content-Type', 'application/json')

  if (googleCredential && endpoint !== '/auth/google') {
    headers.set('Authorization', `Bearer ${googleCredential}`)
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401 && endpoint !== '/auth/google') {
    clearGoogleSession()

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('junior-auth-expired'))
    }
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json() as Promise<T>
}
