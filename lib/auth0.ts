import { Auth0Client } from '@auth0/nextjs-auth0/server'

export const auth0 = new Auth0Client()

export async function getSessionOrDev() {
	const isDev = process.env.NODE_ENV !== 'production' || process.env.DEV_AUTH_BYPASS === '1'
	if (isDev) {
		const devUser = {
			sub: 'dev|local',
			name: process.env.DEV_USER_NAME || 'Dev User',
			email: process.env.DEV_USER_EMAIL || 'dev@example.com',
			picture: process.env.DEV_USER_PICTURE || null,
		}
		return { user: devUser }
	}

	const session = await auth0.getSession()
	if (session?.user) return session

	return null
}

export async function getUserOrDev() {
	const s = await getSessionOrDev()
	return s?.user ?? null
}
