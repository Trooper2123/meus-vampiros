import { Auth0Client } from '@auth0/nextjs-auth0/server'
import { NextRequest, NextResponse } from 'next/server'

const auth0 = process.env.AUTH0_DOMAIN ? new Auth0Client() : null

export async function proxy(request: NextRequest) {
  if (!auth0) {
    return NextResponse.next()
  }

  return auth0.middleware(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
