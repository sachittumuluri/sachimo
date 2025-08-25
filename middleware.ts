import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-192.png|icon-512.png|sw.js).*)'] }

export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER
  const pass = process.env.BASIC_AUTH_PASS
  if (!user || !pass) return NextResponse.next()
  const auth = req.headers.get('authorization')
  if (auth) {
    const [scheme, encoded] = auth.split(' ')
    if (scheme === 'Basic') {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8')
      const [u, p] = decoded.split(':')
      if (u === user && p === pass) return NextResponse.next()
    }
  }
  return new NextResponse('Authentication required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Private Journal"' } })
}