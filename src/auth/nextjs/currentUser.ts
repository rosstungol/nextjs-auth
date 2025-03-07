import { cache } from 'react'
import { getUserFromSession } from '../core/session'
import { cookies } from 'next/headers'

export const getCurrentUser = cache(async () => {
	return await getUserFromSession(await cookies())
})
