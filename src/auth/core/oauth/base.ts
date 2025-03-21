import { z } from 'zod'
import { Cookies } from '../session'
import { env } from '@/data/env/server'
import crypto from 'crypto'

const STATE_COOKIE_KEY = 'oAuthState'
const CODE_VERIFIER_COOKIE_KEY = 'oAuthCodeVerifier'
// Ten minutes in seconds
const COOKIE_EXPIRATION_SECONDS = 60 * 10

export class OAuthClient<T> {
	private readonly tokenSchema = z.object({
		access_token: z.string(),
		token_type: z.string(),
	})

	private readonly userSchema = z.object({
		id: z.string(),
		username: z.string(),
		global_name: z.string().nullable(),
		email: z.string().email(),
	})

	private get redirectUrl() {
		return new URL('discord', env.OAUTH_REDIRECT_URL_BASE)
	}

	createAuthUrl(cookies: Pick<Cookies, 'set'>) {
		const state = createState(cookies)
		const codeVerifer = createCodeVerifier(cookies)
		const url = new URL('https://discord.com/oauth2/authorize')
		url.searchParams.set('client_id', env.DISCORD_CLIENT_ID)
		url.searchParams.set('redirect_uri', this.redirectUrl.toString())
		url.searchParams.set('response_type', 'code')
		url.searchParams.set('scope', 'identify email')
		url.searchParams.set('state', state)
		url.searchParams.set('code_challenge_method', 'S256')
		url.searchParams.set(
			'code_challenge',
			crypto.hash('sha256', codeVerifer, 'base64url')
		)
		return url.toString()
	}

	async fetchUser(code: string, state: string, cookies: Pick<Cookies, 'get'>) {
		const isValidState = validateState(state, cookies)
		if (!isValidState) throw new InvalidStateError()

		const { accessToken, tokenType } = await this.fetchToken(
			code,
			getCodeVerifier(cookies)
		)

		const user = await fetch('https://discord.com/api/users/@me', {
			headers: {
				Authorization: `${tokenType} ${accessToken}`,
			},
		})
			.then((res) => res.json())
			.then((rawData) => {
				const { data, success, error } = this.userSchema.safeParse(rawData)

				if (!success) throw new InvalidUserError(error)

				return data
			})

		return {
			id: user.id,
			email: user.email,
			name: user.global_name ?? user.username,
		}
	}

	private fetchToken(code: string, codeVerifier: string) {
		return fetch('https://discord.com/api/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			body: new URLSearchParams({
				code,
				redirect_uri: this.redirectUrl.toString(),
				grant_type: 'authorization_code',
				client_id: env.DISCORD_CLIENT_ID,
				client_secret: env.DISCORD_CLIENT_SECRET,
				code_verifier: codeVerifier,
			}),
		})
			.then((res) => res.json())
			.then((rawData) => {
				const { data, success, error } = this.tokenSchema.safeParse(rawData)
				if (!success) throw new InvalidTokenError(error)

				return {
					accessToken: data.access_token,
					tokenType: data.token_type,
				}
			})
	}
}

export class InvalidTokenError extends Error {
	constructor(zodError: z.ZodError) {
		super('Invalid Token')
		this.cause = zodError
	}
}

export class InvalidUserError extends Error {
	constructor(zodError: z.ZodError) {
		super('Invalid User')
		this.cause = zodError
	}
}

export class InvalidStateError extends Error {
	constructor() {
		super('Invalid State')
	}
}

export class InvalidCodeVerifierError extends Error {
	constructor() {
		super('Invalid Code Verifier')
	}
}

function createState(cookies: Pick<Cookies, 'set'>) {
	const state = crypto.randomBytes(64).toString('hex').normalize()
	cookies.set(STATE_COOKIE_KEY, state, {
		secure: true,
		httpOnly: true,
		sameSite: 'lax',
		expires: Date.now() + COOKIE_EXPIRATION_SECONDS * 1000,
	})

	return state
}

function createCodeVerifier(cookies: Pick<Cookies, 'set'>) {
	const codeVerifier = crypto.randomBytes(64).toString('hex').normalize()
	cookies.set(CODE_VERIFIER_COOKIE_KEY, codeVerifier, {
		secure: true,
		httpOnly: true,
		sameSite: 'lax',
		expires: Date.now() + COOKIE_EXPIRATION_SECONDS * 1000,
	})

	return codeVerifier
}

function validateState(state: string, cookies: Pick<Cookies, 'get'>) {
	const cookieState = cookies.get(STATE_COOKIE_KEY)?.value

	return cookieState === state
}

function getCodeVerifier(cookies: Pick<Cookies, 'get'>) {
	const codeVerifier = cookies.get(CODE_VERIFIER_COOKIE_KEY)?.value
	if (codeVerifier == null) throw new InvalidCodeVerifierError()

	return codeVerifier
}
