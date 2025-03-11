'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/drizzle/db'
import { UserTable } from '@/drizzle/schema'
import { getCurrentUser } from '@/auth/nextjs/currentUser'

export async function toggleRole() {
	const user = await getCurrentUser({ redirectIfNotFound: true })

	const [updatedUser] = await db
		.update(UserTable)
		.set({ role: user.role === 'admin' ? 'user' : 'admin' })
		.where(eq(UserTable.id, user.id))
		.returning({ id: UserTable.id, role: UserTable.role })
}
