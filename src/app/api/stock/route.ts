// src/app/api/stock/route.ts
import { requireAdmin, requireAny } from '@/lib/api-guard'
import { lireStocks, approvisionnerStock } from '@/lib/stock'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireAny()
  if (auth instanceof NextResponse) return auth
  try {
    return NextResponse.json(await lireStocks())
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const { produitId, quantite, description } = await req.json()
    if (!produitId || !quantite || parseFloat(quantite) <= 0) {
      return NextResponse.json({ error: 'Produit et quantité (> 0) requis' }, { status: 400 })
    }
    const stock = await approvisionnerStock(produitId, parseFloat(quantite), description)
    return NextResponse.json(stock, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 })
  }
}
