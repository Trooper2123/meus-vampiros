import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@auth0/nextjs-auth0'
import { upsertUserFromAuth0, ensureUsersTable } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = getSession(req, res)

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
