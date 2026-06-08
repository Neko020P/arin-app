//app/(auth)/login/page.tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function LoginForm() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const next = searchParams.get('next') ?? ''
    const callbackUrl = next
      ? `/auth/callback?next=${encodeURIComponent(next)}`
      : `/auth/callback`

    window.location.replace(callbackUrl)
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-600">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-600">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-purple-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Log In'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-medium mb-6">Login</h1>

        <Suspense fallback={<p className="text-sm text-gray-400">Loading...</p>}>
          <LoginForm />
        </Suspense>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Don't have an account?{' '}
          <a href="/signup" className="text-purple-600 hover:underline">Create an account</a>
        </p>
      </div>
    </main>
  )
}