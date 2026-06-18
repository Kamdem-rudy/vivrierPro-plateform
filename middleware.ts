// middleware.ts
// ═══════════════════════════════════════════════════════════════════
// MATRICE DES DROITS D'ACCÈS AUX PAGES
// ═══════════════════════════════════════════════════════════════════
//
//  Route          ADMIN  OPERATEUR  CHAUFFEUR  Non connecté
//  /              ✅     ✅         ✅         → /login
//  /commandes     ✅     ✅         ❌         → /login ou /acces-refuse
//  /livraisons    ✅     ✅         ✅         → /login
//  /admin         ✅     ❌         ❌         → /login ou /acces-refuse
//  /login         ✅     ✅         ✅         ✅ (public)
//  /acces-refuse  ✅     ✅         ✅         ✅ (public)
//  /api/*         Protégé par api-guard.ts dans chaque handler

import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth
    const path = req.nextUrl.pathname
    const role = token?.role as string | undefined

    // /admin → ADMIN uniquement
    if (path.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/acces-refuse', req.url))
    }

    // /commandes → ADMIN ou OPERATEUR
    if (path.startsWith('/commandes') && role === 'CHAUFFEUR') {
      return NextResponse.redirect(new URL('/acces-refuse', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Redirige vers /login si pas de token
      authorized: ({ token }) => !!token,
    },
  }
)

// Routes soumises au middleware (tout sauf les publiques)
export const config = {
  matcher: [
    '/((?!login|acces-refuse|api/auth|_next/static|_next/image|favicon\\.ico).*)',
  ],
}
