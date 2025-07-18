"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, RefreshCw } from "lucide-react"
import { clearUser } from "@/lib/user-persistence"

interface UserMenuProps {
  username: string
  userId: string
}

export function UserMenu({ username, userId }: UserMenuProps) {
  const handleNewSession = () => {
    if (confirm("This will start a new anonymous session. Your current username and chat history will be lost. Continue?")) {
      clearUser()
      window.location.reload()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Anonymous User</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          ID: {userId.slice(0, 16)}...
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleNewSession} className="text-red-600">
          <RefreshCw className="mr-2 h-4 w-4" />
          New Session
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}