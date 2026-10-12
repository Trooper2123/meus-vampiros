'use client'

import { useSyncExternalStore } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'

const subscribeToHydration = () => () => {}

export default function useAppUser() {
  const auth0User = useUser()
  const disableDevBypass = process.env.NEXT_PUBLIC_DISABLE_DEV_AUTH === '1'
  const isDev = process.env.NODE_ENV !== 'production'
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )

  if (isDev && !disableDevBypass) {
    if (!isHydrated) {
      return { user: undefined, isLoading: true, error: null }
    }

    const devUser = {
      sub: 'dev|local',
      name: process.env.NEXT_PUBLIC_DEV_USER_NAME || 'Dev User',
      email: process.env.NEXT_PUBLIC_DEV_USER_EMAIL || 'dev@example.com',
      picture: process.env.NEXT_PUBLIC_DEV_USER_PICTURE || null,
    }

    return { user: devUser, isLoading: false, error: null }
  }

  return auth0User
}
