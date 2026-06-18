// src/app/api/points/route.ts
import { prisma } from '@/lib/prisma'
import { requireAdmin, requireAny } from '@/lib/api-guard'
import { NextRequest, NextResponse } from 'next/server'

// GET — tous les rôles connectés peuvent lire les points
export async function GET() {
  const auth = await requireAny()
  if (auth instanceof NextResponse) return auth

  try {
    const points = await prisma.pointDistribution.findMany({
      orderBy: { nom: 'asc' },
      include: { _count: { select: { commandes: true } } },
    })
    return NextResponse.json(points)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST — ADMIN uniquement
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const { nom, adresse } = await req.json()
    if (!nom?.trim() || !adresse?.trim()) {
      return NextResponse.json({ error: 'Nom et adresse requis' }, { status: 400 })
    }
    const point = await prisma.pointDistribution.create({
      data: { nom: nom.trim(), adresse: adresse.trim() },
    })
    return NextResponse.json(point, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur création' }, { status: 500 })
  }
}
