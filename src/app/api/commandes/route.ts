// src/app/api/commandes/route.ts
import { prisma } from '@/lib/prisma'
import { requireOperateur } from '@/lib/api-guard'
import { reserverStock } from '@/lib/stock'
import { NextRequest, NextResponse } from 'next/server'

function generateRef(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

function estDansFenetreCommande() {
  const h = new Date().getHours()
  return h >= 20 && h < 23
}

export async function GET(req: NextRequest) {
  const auth = await requireOperateur()
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(req.url)
    const statut = searchParams.get('statut')
    const commandes = await prisma.commande.findMany({
      where: statut ? { statut: statut as any } : {},
      include: { point: true, produit: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(commandes)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireOperateur()
  if (auth instanceof NextResponse) return auth

  try {
    const { pointId, produitId, quantite, notes, forceHoraire } = await req.json()

    // Seul un ADMIN peut forcer hors fenêtre
    if (!estDansFenetreCommande()) {
      if (!forceHoraire || auth.role !== 'ADMIN') {
        return NextResponse.json(
          { error: "Commandes acceptées de 20h à 23h uniquement.", code: 'HORS_FENETRE' },
          { status: 403 }
        )
      }
    }

    const qte = parseFloat(quantite)
    if (!pointId || !produitId || isNaN(qte) || qte <= 0) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const point = await prisma.pointDistribution.findUnique({
      where: { id: pointId, actif: true },
    })
    if (!point) return NextResponse.json({ error: 'Point introuvable' }, { status: 404 })

    const ref = generateRef('CMD')
    const commande = await prisma.commande.create({
      data: { reference: ref, pointId, produitId, quantite: qte, notes: notes || null },
      include: { point: true, produit: true },
    })

    try {
      await reserverStock(produitId, qte, commande.id, `Commande ${ref} — ${point.nom}`)
    } catch (errStock: any) {
      await prisma.commande.update({ where: { id: commande.id }, data: { statut: 'ANNULEE' } })
      const status = errStock.code === 'CONFLIT_EPUISE' ? 429 : 409
      return NextResponse.json({ error: errStock.message, code: errStock.code }, { status })
    }

    return NextResponse.json(commande, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
