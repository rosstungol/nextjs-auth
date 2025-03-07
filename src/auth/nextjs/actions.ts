'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { signInSchema, signUpSchema } from './schemas'
import { eq } from 'drizzle-orm'
import { UserTable } from '@/drizzle/schema'
import { db } from '@/drizzle/db'
import { generateSalt, hashPassword } from '../core/passwordHasher'
import { createUserSession } from '../core/session'
import { cookies } from 'next/headers'

export async function signIn(unsafeData: z.infer<typeof signInSchema>) {
	const { success, data } = signInSchema.safeParse(unsafeData)

	if (!success) return 'Unable to log you in'

	redirect('/')
}

export async function signUp(unsafeData: z.infer<typeof signUpSchema>) {
	const { success, data } = signUpSchema.safeParse(unsafeData)

	if (!success) return 'Unable to create account'

	const existingUser = await db.query.UserTable.findFirst({
		where: eq(UserTable.email, data.email),
	})

	if (existingUser != null) return 'Account already exists for this email'

	try {
		const salt = generateSalt()
		const hashedPassword = await hashPassword(data.password, salt)

		const [user] = await db
			.insert(UserTable)
			.values({
				name: data.name,
				email: data.email,
				password: hashedPassword,
				salt,
			})
			.returning({ id: UserTable.id, role: UserTable.role })

		if (user == null) return 'Unable to create account'

		await createUserSession(user, await cookies())
	} catch {
		return 'Unable to create account'
	}

	redirect('/')
}

export async function logOut() {
	redirect('/')
}
