/// <reference path="../types/better-auth.d.ts" />
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || "http://localhost:5000",
  fetchOptions: {
    credentials: "include", // CRITICAL: Send cookies with requests
  },
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient
