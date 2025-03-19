import { z } from 'zod'
import { Cookies } from '../session'
import { env } from '@/data/env/server'

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
		const url = new URL('https://discord.com/oauth2/authorize')
		url.searchParams.set('client_id', env.DISCORD_CLIENT_ID)
		url.searchParams.set('redirect_uri', this.redirectUrl.toString())
		url.searchParams.set('response_type', 'code')
		url.searchParams.set('scope', 'identify email')

		return url.toString()
	}

	async fetchUser(code: string) {
		const { accessToken, tokenType } = await this.fetchToken(code)

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

	private fetchToken(code: string) {
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
