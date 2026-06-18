'use client'
// src/components/SessionProvider.tsx
import { SessionProvider as NextSessionProvider } from 'next-auth/react'

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextSessionProvider>{children}</NextSessionProvider>
}
