import { Redis } from '@upstash/redis'
import { env } from '@/data/env/server'

export const redis = new Redis({
	url: env.REDIS_URL,
	token: env.REDIS_TOKEN,
})
