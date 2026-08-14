'use client'

import { PropsWithChildren } from 'react'
import { Auth0Provider } from '@auth0/nextjs-auth0/client'

export default function AuthProvider({ children }: PropsWithChildren) {
  return <Auth0Provider profileRoute="/api/auth/me">{children}</Auth0Provider>
}
    