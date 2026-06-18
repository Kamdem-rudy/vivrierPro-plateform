// src/lib/api-guard.ts
// ═══════════════════════════════════════════════════════════════════
// GARDE D'AUTHENTIFICATION POUR LES API ROUTES
// ═══════════════════════════════════════════════════════════════════
//
// Le middleware Next.js protège les PAGES mais les API routes
// peuvent être appelées directement (Postman, curl, etc.).
// Ce module vérifie la session côté serveur sur chaque API route.
//
// Usage :
//   const auth = await requireAuth()
//   if (auth instanceof Response) return auth   // non connecté → 401
//
//   const auth = await requireRole('ADMIN')
//   if (auth instanceof Response) return auth   // mauvais rôle → 403

import { getSession } from '@/lib/auth'
import { NextResponse } from 'next/server'

type Role = 'ADMIN' | 'OPERATEUR' | 'CHAUFFEUR'

interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  role: Role
}

/**
 * Vérifie qu'un utilisateur est connecté.
 * Retourne la session user ou une Response 401.
 */
export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Non authentifié. Veuillez vous connecter.' },
      { status: 401 }
    )
  }
  return session.user as SessionUser
}

/**
 * Vérifie qu'un utilisateur a le rôle requis.
 * Retourne la session user ou une Response 401/403.
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser | NextResponse> {
  const result = await requireAuth()
  if (result instanceof NextResponse) return result

  if (!roles.includes(result.role)) {
    return NextResponse.json(
      {
        error: `Accès refusé. Rôle requis : ${roles.join(' ou ')}. Votre rôle : ${result.role}`,
        code: 'FORBIDDEN',
      },
      { status: 403 }
    )
  }
  return result
}

// Raccourcis pratiques
export const requireAdmin     = () => requireRole('ADMIN')
export const requireOperateur = () => requireRole('ADMIN', 'OPERATEUR')
export const requireAny       = () => requireAuth()
