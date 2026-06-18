import NextAuth, { DefaultSession } from 'next-auth'
declare module 'next-auth' {
  interface Session { user: { id: string; role: 'ADMIN' | 'OPERATEUR' | 'CHAUFFEUR' } & DefaultSession['user'] }
  interface User { role: 'ADMIN' | 'OPERATEUR' | 'CHAUFFEUR' }
}
declare module 'next-auth/jwt' { interface JWT { role: 'ADMIN' | 'OPERATEUR' | 'CHAUFFEUR' } }
