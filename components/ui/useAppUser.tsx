'use client'

import { use } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'

type UseAppUserResult = {
  user: any | null
  isLoading: boolean
  error: any | null
}

export default function useAppUser(): UseAppUserResult {
  const disableDevBypass = process.env.NEXT_PUBLIC_DISABLE_DEV_AUTH === '1'
  const isDev = process.env.NODE_ENV !== 'production' && typeof window !== 'undefined'

  if (isDev && !disableDevBypass) {
    const devUser = {
      sub: 'dev|local',
      name: process.env.NEXT_PUBLIC_DEV_USER_NAME || 'Dev User',
      email: process.env.NEXT_PUBLIC_DEV_USER_EMAIL || 'dev@example.com',
      picture: process.env.NEXT_PUBLIC_DEV_USER_PICTURE || null,
    }

    return { user: devUser, isLoading: false, error: null }
  }

  // In production or when bypass disabled, delegate to Auth0 hook
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user, error, isLoading } = useUser()
  return { user, isLoading, error }
}
