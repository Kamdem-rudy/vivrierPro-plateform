// src/app/api/commandes/[id]/route.ts
import { prisma } from '@/lib/prisma'
import { requireOperateur } from '@/lib/api-guard'
import { libererStock } from '@/lib/stock'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOperateur()
  if (auth instanceof NextResponse) return auth

  try {
    const { statut } = await req.json()
    const commande = await prisma.commande.findUnique({ where: { id: params.id } })
    if (!commande) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    const updated = await prisma.commande.update({
      where: { id: params.id },
      data: { statut },
      include: { point: true, produit: true },
    })

    if (statut === 'ANNULEE' && ['EN_ATTENTE', 'VALIDEE'].includes(commande.statut)) {
      await libererStock(commande.produitId, commande.quantite, commande.id)
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOperateur()
  if (auth instanceof NextResponse) return auth

  try {
    const commande = await prisma.commande.findUnique({ where: { id: params.id } })
    if (!commande) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    await prisma.commande.update({ where: { id: params.id }, data: { statut: 'ANNULEE' } })

    if (['EN_ATTENTE', 'VALIDEE'].includes(commande.statut)) {
      await libererStock(commande.produitId, commande.quantite, commande.id)
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur annulation' }, { status: 500 })
  }
}
