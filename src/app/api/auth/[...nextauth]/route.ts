// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

// Handler NextAuth standard
const handler = NextAuth(authOptions)

// Wrapper POST avec rate limiting sur le login
export async function POST(req: NextRequest, context: any) {
  // Appliquer le rate limit uniquement sur /api/auth/callback/credentials (login)
  if (req.nextUrl.pathname.includes('callback/credentials')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed, remaining, resetAt } = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000)

    if (!allowed) {
      const minutesRestantes = Math.ceil((resetAt - Date.now()) / 60000)
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${minutesRestantes} minute(s).` },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }
  }

  return handler(req as any, context)
}

export const GET = handler
