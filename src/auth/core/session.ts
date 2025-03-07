import { userRoles } from '@/drizzle/schema'
import { z } from 'zod'
import crypto from 'crypto'
import { redis } from '@/redis/redis'
import { parseSetCookie } from 'next/dist/compiled/@edge-runtime/cookies'

// Seven days in seconds
const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7
const COOKIE_SESSION_KEY = 'session-id'

const sessionSchema = z.object({
	id: z.string(),
	role: z.enum(userRoles),
})

type UserSession = z.infer<typeof sessionSchema>

export type Cookies = {
	set: (
		key: string,
		value: string,
		options: {
			secure?: boolean
			httpOnly?: boolean
			sameSite?: 'strict' | 'lax'
			expires?: number
		}
	) => void
	get: (key: string) => { name: string; value: string } | undefined
	delete: (key: string) => void
}

export function getUserFromSession(cookies: Pick<Cookies, 'get'>) {
	const sessionId = cookies.get(COOKIE_SESSION_KEY)?.value
	if (sessionId == null) return null

	return getUserSessionById(sessionId)
}

export async function createUserSession(
	user: UserSession,
	cookies: Pick<Cookies, 'set'>
) {
	const sessionId = crypto.randomBytes(512).toString('hex').normalize()
	await redis.set(`session:${sessionId}`, sessionSchema.parse(user), {
		ex: SESSION_EXPIRATION_SECONDS,
	})

	setCookie(sessionId, cookies)
}

function setCookie(sessionId: string, cookies: Pick<Cookies, 'set'>) {
	cookies.set(COOKIE_SESSION_KEY, sessionId, {
		secure: true,
		httpOnly: true,
		sameSite: 'lax',
		expires: Date.now() + SESSION_EXPIRATION_SECONDS * 1000,
	})
}

async function getUserSessionById(sessionId: string) {
	const rawUser = await redis.get(`session:${sessionId}`)

	const { success, data: user } = sessionSchema.safeParse(rawUser)

	return success ? user : null
}
