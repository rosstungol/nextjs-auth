import { LogOutButton } from '@/auth/nextjs/components/LogOutButton'
import { getCurrentUser } from '@/auth/nextjs/currentUser'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'

export default async function HomePage() {
	const { userId } = await auth()

	return (
		<div className="container mx-auto p-4">
			{userId == null ? (
				<div className="flex gap-4">
					<Button asChild>
						<SignInButton />
					</Button>
					<Button asChild>
						<SignUpButton />
					</Button>
				</div>
			) : (
				<Card className="max-w-[500px] mt-4">
					<CardHeader>
						<UserButton />
					</CardHeader>
				</Card>
			)}
		</div>
	)
}
