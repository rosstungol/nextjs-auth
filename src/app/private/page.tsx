import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function PrivatePage() {
	const currentUser = { role: 'user' }

	return (
		<div className="container mx-auto p-4">
			<h1 className=" text-4xl mb-8>">Private: {currentUser.role}</h1>
			<div className="flex gap-2">
				{/* <ToggleRoleButton /> */}
				<Button>
					<Link href="/">Home</Link>
				</Button>
			</div>
		</div>
	)
}
