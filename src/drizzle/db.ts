import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '@/data/env/server'
import * as schema from './schema'

export const db = drizzle({
	schema,
	connection: env.DATABASE_URL!,
})
