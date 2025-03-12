'use server'

import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/drizzle/db'
import { UserTable } from '@/drizzle/schema'
import { getCurrentUser } from '@/auth/nextjs/currentUser'
import { updateUserSessionData } from '@/auth/core/session'

export async function toggleRole() {
	const user = await getCurrentUser({ redirectIfNotFound: true })

	const [updatedUser] = await db
		.update(UserTable)
		.set({ role: user.role === 'admin' ? 'user' : 'admin' })
		.where(eq(UserTable.id, user.id))
		.returning({ id: UserTable.id, role: UserTable.role })

	await updateUserSessionData(updatedUser, await cookies())
}
