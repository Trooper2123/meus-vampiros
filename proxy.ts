import { NextResponse, type NextRequest } from 'next/server'
import { auth0 } from './lib/auth0'

export async function proxy(request: NextRequest) {
  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_SECRET || !process.env.AUTH0_CLIENT_SECRET) {
    return NextResponse.next()
  }

  try {
    return await auth0.middleware(request)
  } catch (error) {
    console.error('[v0] Auth0 proxy falhou:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
