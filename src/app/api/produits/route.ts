// src/app/api/produits/route.ts
import { prisma } from '@/lib/prisma'
import { requireAny } from '@/lib/api-guard'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireAny()
  if (auth instanceof NextResponse) return auth
  try {
    const produits = await prisma.produit.findMany({
      where: { actif: true },
      include: { stock: true },
      orderBy: { nom: 'asc' },
    })
    return NextResponse.json(produits)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
