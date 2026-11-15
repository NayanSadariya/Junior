import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { saveGoogleSession } from '../lib/api'
import type { GoogleUser } from '../types/auth'

type LoginProps = {
  onLogin: (user: GoogleUser) => void
}

function decodeGoogleUser(credential: string): GoogleUser {
  const payload = credential.split('.')[1]

  if (!payload) {
    throw new Error('Invalid Google credential.')
  }

  const normalized = payload
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  )

  return JSON.parse(atob(padded)) as GoogleUser
}

function Login({ onLogin }: LoginProps) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogleSuccess(credential?: string) {
    if (!credential) {
      setError('Google did not return a credential.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Decode the Google ID token locally so the UI can log in immediately.
      const user = decodeGoogleUser(credential)

      if (!user.sub) {
        throw new Error('Google user ID is missing.')
      }

      // Save the credential + user for session restoration.
      // The backend still verifies this credential on protected API requests.
      saveGoogleSession(credential, user)

      setLoading(false)
      onLogin(user)
    } catch (error) {
      console.error('Google login error:', error)
      setError('Sign-in failed. Check the browser console.')
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="glass w-full max-w-md rounded-3xl p-8 text-center sm:p-10">
        <img
          src="/pwa-512x512.png"
          alt="JUNIOR logo"
          className="mx-auto mb-6 h-20 w-20 object-contain"
        />

        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          JUNIOR
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Your personal AI companion, ready whenever you are.
        </p>

        <div className="mt-8 flex justify-center">
          <GoogleLogin
            onSuccess={(response) => {
              void handleGoogleSuccess(response.credential)
            }}
            onError={() => {
              setError('Google sign-in failed.')
            }}
            theme="outline"
            size="large"
            text="signin_with"
            shape="pill"
          />
        </div>

        {loading && (
          <p className="mt-4 text-sm text-zinc-500">
            Signing you in...
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}

export default Login