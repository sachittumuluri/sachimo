import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!
const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://sachandsimo.love'
const coupleCsv = process.env.COUPLE_EMAILS || 'sachi11umuluri@gmail.com,simonechariell@gmail.com'
const COUPLE = coupleCsv.split(',').map(e => e.trim().toLowerCase())

export async function POST(request: Request) {
  if (!service) return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  const { email } = await request.json() as { email: string }
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const target = email.toLowerCase()
  if (!COUPLE.includes(target)) return NextResponse.json({ error: 'not allowed' }, { status: 403 })

  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })

  // Ensure both users exist and are confirmed
  const users: any[] = []
  for (const e of COUPLE) {
    // list users (could be paginated; small set so fine)
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    let found = list?.users?.find((u: any) => u.email?.toLowerCase() === e)
    if (!found) {
      const { data, error } = await admin.auth.admin.createUser({ email: e, email_confirm: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      found = data.user
    }
    users.push(found)
  }

  // Find a shared pair for these two users
  const [u1, u2] = users
  const pairsFor = async (uid: string) => {
    const { data, error } = await admin.from('pair_members').select('pair_id').eq('user_id', uid)
    if (error) throw new Error(error.message)
    return new Set((data || []).map(r => r.pair_id as string))
  }
  let pairId: string | undefined
  const p1 = await pairsFor(u1.id); const p2 = await pairsFor(u2.id)
  for (const pid of p1) { if (p2.has(pid)) { pairId = pid; break } }

  if (!pairId) {
    const { data: pairIns, error: pairErr } = await admin.from('pairs').insert({}).select('id').single()
    if (pairErr) return NextResponse.json({ error: pairErr.message }, { status: 400 })
    pairId = (pairIns as any).id
    await admin.from('pair_members').upsert([ { pair_id: pairId, user_id: u1.id }, { pair_id: pairId, user_id: u2.id } ], { onConflict: 'pair_id,user_id' })
  }

  // Generate a magic link for the target email without sending email
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink', email: target, options: { redirectTo: site }
  })
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 })
  const link = (linkData as any)?.properties?.action_link
  return NextResponse.json({ link, pairId })
}