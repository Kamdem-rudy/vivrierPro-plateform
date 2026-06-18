// src/app/api/livraisons/[id]/route.ts
import { prisma } from '@/lib/prisma'
import { requireOperateur } from '@/lib/api-guard'
import { deduireStockLivraison } from '@/lib/stock'
import { StatutCommande, StatutLivraison } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOperateur()
  if (auth instanceof NextResponse) return auth

  try {
    const { statut } = await req.json()

    const livraison = await prisma.livraison.findUnique({
      where: { id: params.id },
      include: { arrets: { include: { commande: true } } },
    })
    if (!livraison) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    await prisma.$transaction(async tx => {
      await tx.livraison.update({
        where: { id: params.id },
        data: { statut, dateArrivee: statut === StatutLivraison.TERMINEE ? new Date() : undefined },
      })

      if (statut === StatutLivraison.TERMINEE) {
        const ids = livraison.arrets.map(a => a.commandeId)
        await tx.commande.updateMany({ where: { id: { in: ids } }, data: { statut: StatutCommande.LIVREE } })
        await tx.vehicule.update({ where: { id: livraison.vehiculeId }, data: { disponible: true } })
        for (const arret of livraison.arrets) {
          await deduireStockLivraison(arret.commande.produitId, arret.commande.quantite, arret.commandeId)
        }
      }

      if (statut === StatutLivraison.ANNULEE) {
        const ids = livraison.arrets.map(a => a.commandeId)
        await tx.commande.updateMany({ where: { id: { in: ids } }, data: { statut: StatutCommande.VALIDEE } })
        await tx.vehicule.update({ where: { id: livraison.vehiculeId }, data: { disponible: true } })
      }
    })

    return NextResponse.json({ success: true, statut })
  } catch {
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
}
