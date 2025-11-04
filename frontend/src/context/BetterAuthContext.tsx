import React, { createContext, useContext, type ReactNode } from "react"
import { useSession } from "../lib/auth-client"

// Extended user type with custom fields from Better Auth backend
interface ExtendedUser {
  id: string
  email: string
  emailVerified: boolean
  name: string
  image?: string | null
  createdAt: Date
  updatedAt: Date
  // Custom fields
  role: string
  chapter_id: number
  first_name: string
  last_name: string
  profile_picture?: string
  is_active: boolean
}

interface ExtendedSession {
  id: string
  userId: string
  expiresAt: Date
  user: ExtendedUser
}

interface BetterAuthContextType {
  user: ExtendedUser | null
  session: ExtendedSession | null
  isLoading: boolean
  isAuthenticated: boolean
  hasRole: (role: string | string[]) => boolean
  hasPermission: (permission: string) => boolean
}

const BetterAuthContext = createContext<BetterAuthContextType | undefined>(undefined)

export const BetterAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: sessionData, isPending } = useSession()
  
  // Cast session data to include our custom fields
  const session = sessionData as ExtendedSession | null

  const hasRole = (role: string | string[]) => {
    if (!session?.user) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(session.user.role)
  }

  const hasPermission = (permission: string) => {
    if (!session?.user) return false
    
    const permissionMap: Record<string, string[]> = {
      student: ["course:view", "lesson:view", "quiz:take"],
      teacher: ["course:create", "course:edit_own", "lesson:create", "video:upload"],
      chapter_admin: ["course:edit_any", "user:manage", "chapter:manage"],
      platform_admin: ["system:admin"],
    }

    const userPermissions = permissionMap[session.user.role] || []
    return userPermissions.includes(permission)
  }

  const value: BetterAuthContextType = {
    user: session?.user || null,
    session: session || null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    hasRole,
    hasPermission,
  }

  // Don't block rendering while loading - let the app handle loading states
  return <BetterAuthContext.Provider value={value}>{children}</BetterAuthContext.Provider>
}

export const useBetterAuth = () => {
  const context = useContext(BetterAuthContext)
  if (context === undefined) {
    throw new Error("useBetterAuth must be used within BetterAuthProvider")
  }
  return context
}
