'use client'

import { Button } from '@/components/ui/button'
import { toggleRole } from '@/actions/toggleRole'

export function ToggleRoleButton() {
	return <Button onClick={toggleRole}> Toggle Role</Button>
}
