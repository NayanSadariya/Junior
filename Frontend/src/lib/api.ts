const API_URL = import.meta.env.VITE_API_URL

let googleCredential: string | null = null

export function setGoogleCredential(credential: string | null) {
  googleCredential = credential
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers)

  headers.set('Content-Type', 'application/json')

  if (googleCredential && endpoint !== '/auth/google') {
    headers.set('Authorization', `Bearer ${googleCredential}`)
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json() as Promise<T>
}
