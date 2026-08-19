import type { NextApiRequest, NextApiResponse } from 'next'
import { auth0 } from '@/lib/auth0'
import { upsertUserFromAuth0, ensureUsersTable } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isLocal = process.env.NODE_ENV !== 'production' || !!req.headers.host?.includes('localhost')

    if (isLocal) {
      const devUser = {
        sub: 'dev|local',
        name: process.env.DEV_USER_NAME || 'Dev User',
        email: process.env.DEV_USER_EMAIL || 'dev@example.com',
        picture: process.env.DEV_USER_PICTURE || null,
      }

      // In development return a dev user immediately without DB operations
      return res.status(200).json({ user: devUser, dev: true })
    }

    const session = await auth0.getSession(req)

    if (!session || !session.user) {
      return res.status(401).json({ user: null })
    }

    const user = session.user

    // Try to persist the user into Neon/Postgres. Non-fatal if DATABASE_URL is not set.
    try {
      await ensureUsersTable()
      const dbUser = await upsertUserFromAuth0(user)
      return res.status(200).json({ user, dbUser })
    } catch (dbErr) {
      // eslint-disable-next-line no-console
      console.error('DB upsert error:', dbErr)
      // Still return the session user even if DB fails
      return res.status(200).json({ user })
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error in /api/auth/me:', err)
    return res.status(500).json({ error: 'internal_error' })
  }
}
