// src/lib/auth.ts
import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Identifiants',
      credentials: {
        email:      { label: 'Email',        type: 'email' },
        motDePasse: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.motDePasse) return null

        // Petit délai constant pour résister au timing attack
        await new Promise(r => setTimeout(r, 200))

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        // Toujours exécuter bcrypt même si user inexistant (évite timing attack)
        const hashFallback = '$2a$12$fallbackhashpourresistanceautimingattack00000000000000'
        const valide = await bcrypt.compare(
          credentials.motDePasse,
          user?.motDePasse ?? hashFallback
        )

        if (!user || !user.actif || !valide) return null

        return { id: user.id, name: user.nom, email: user.email, role: user.role }
      },
    }),
  ],

  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 heures

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id   = token.sub
        ;(session.user as any).role = token.role
      }
      return session
    },
  },

  pages: { signIn: '/login', error: '/login' },

  // NEXTAUTH_URL est auto-détecté sur Vercel via VERCEL_URL
  secret: process.env.NEXTAUTH_SECRET,
}

// ── Helper serveur : récupère la session dans les Server Components et API routes
export const getSession = () => getServerSession(authOptions)
