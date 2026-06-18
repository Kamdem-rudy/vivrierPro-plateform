// src/app/api/stock/mouvements/route.ts
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-guard'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(req.url)
    const produitId = searchParams.get('produitId')
    const mouvements = await prisma.mouvementStock.findMany({
      where: produitId ? { stock: { produitId } } : {},
      include: { stock: { include: { produit: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(mouvements)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
