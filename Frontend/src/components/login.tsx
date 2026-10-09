import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { apiRequest, setGoogleCredential } from '../lib/api'
import type { GoogleUser } from '../types/auth'

type LoginProps = {
  onLogin: (user: GoogleUser) => void
}

function Login({ onLogin }: LoginProps) {
  const [user, setUser] = useState<GoogleUser | null>(null)
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
      const verifiedUser = await apiRequest<GoogleUser>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      })

      if (!verifiedUser.sub) {
        throw new Error('Google user ID is missing from the backend response.')
      }

      // Keep the verified Google credential in memory for protected API requests.
      setGoogleCredential(credential)

      setUser(verifiedUser)
      onLogin(verifiedUser)
    } 
    // catch {
    //   setGoogleCredential(null)
    //   setError('Sign-in failed. Please try again.')
    // } 
    
    catch (error) {
  setGoogleCredential(null)
  console.error('Google login error:', error)
  setError('Sign-in failed. Check the browser console.')
    }

    finally {
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

        {user ? (
          <div className="mt-8">
            {user.picture && (
              <img
                src={user.picture}
                alt=""
                className="mx-auto mb-3 h-14 w-14 rounded-full"
              />
            )}

            <p className="font-medium text-zinc-900">
              Welcome, {user.name ?? user.email ?? 'there'}!
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              {user.email}
            </p>
          </div>
        ) : (
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
        )}

        {loading && (
          <p className="mt-4 text-sm text-zinc-500">
            Verifying your Google account...
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-500">
            {error}
          </p>
        )}

        <p className="mt-6 text-xs text-zinc-400">
          Securely verified by JUNIOR's backend.
        </p>
      </div>
    </main>
  )
}

export default Login
