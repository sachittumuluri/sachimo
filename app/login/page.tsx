'use client'
import { supabase } from '@/lib/supabaseClient'
import { useState } from 'react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) : undefined }
    })
    if (error) setError(error.message); else setSent(true)
  }

  return (
    <div className="max-w-md mx-auto pt-24 px-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-gray-600 mt-1">We’ll email you a one‑time magic link.</p>
      <form onSubmit={sendLink} className="mt-6 space-y-3">
        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
          placeholder="you@example.com" className="w-full px-3 py-2 rounded-xl border outline-none focus:ring-2" />
        <button className="w-full px-3 py-2 rounded-xl bg-gray-900 text-white">Send magic link</button>
      </form>
      {sent && <div className="mt-3 text-sm text-green-700">Check your email ✉️</div>}
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
    </div>
  )
}