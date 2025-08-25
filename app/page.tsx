'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Journal from '@/components/Journal'
import SWRegister from '@/components/SWRegister'

export default function Home() {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setAuthed(!!data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => setAuthed(!!session))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!ready) return null
  if (!authed) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null
  }

  return (<><SWRegister /><Journal /></>)
}