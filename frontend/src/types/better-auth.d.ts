// Type extensions for Better Auth to include custom user fields
import "better-auth/types"

declare module "better-auth/types" {
  interface User {
    role: string
    chapter_id: number
    first_name: string
    last_name: string
    profile_picture?: string
    is_active: boolean
  }
}
