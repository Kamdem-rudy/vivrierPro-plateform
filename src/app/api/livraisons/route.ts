// src/app/api/livraisons/route.ts
import { prisma } from '@/lib/prisma'
import { requireOperateur, requireAny } from '@/lib/api-guard'
import { dijkstra, calculerItineraireOptimal, calculerTempsTrajet } from '@/lib/dijkstra'
import { NextRequest, NextResponse } from 'next/server'
import { StatutCommande } from '@prisma/client'

function generateRef(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

export async function GET() {
  const auth = await requireAny()
  if (auth instanceof NextResponse) return auth

  try {
    const livraisons = await prisma.livraison.findMany({
      include: {
        vehicule: true,
        arrets: { include: { point: true, commande: true }, orderBy: { ordre: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(livraisons)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireOperateur()
  if (auth instanceof NextResponse) return auth

  try {
    const { vehiculeId, commandeIds } = await req.json()

    if (!vehiculeId || !commandeIds?.length) {
      return NextResponse.json({ error: 'Véhicule et commandes requis' }, { status: 400 })
    }

    const vehicule = await prisma.vehicule.findUnique({ where: { id: vehiculeId } })
    if (!vehicule) return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 })
    if (!vehicule.disponible) return NextResponse.json({ error: 'Véhicule non disponible' }, { status: 409 })

    const commandes = await prisma.commande.findMany({
      where: { id: { in: commandeIds }, statut: StatutCommande.VALIDEE },
      include: { point: true, produit: true },
    })
    if (!commandes.length) return NextResponse.json({ error: 'Aucune commande validée' }, { status: 400 })

    const pointsIds = [...new Set(commandes.map(c => c.pointId))]
    if (pointsIds.length > vehicule.capacite) {
      return NextResponse.json(
        { error: `Capacité dépassée : ${pointsIds.length} points pour ${vehicule.capacite} max` },
        { status: 400 }
      )
    }

    const [points, chemins] = await Promise.all([
      prisma.pointDistribution.findMany({ where: { actif: true } }),
      prisma.chemin.findMany({ where: { actif: true } }),
    ])

    const graph = {
      nodes: [{ id: 'ENTREPOT', label: 'Entrepôt', isEntrepot: true }, ...points.map(p => ({ id: p.id, label: p.nom }))],
      edges: chemins.map(c => ({ id: c.id, source: c.departPointId ?? 'ENTREPOT', target: c.arriveePointId, distance: c.distance })),
    }

    const { itineraire, distanceTotale } = calculerItineraireOptimal(graph, 'ENTREPOT', pointsIds)
    const tempsPrevuMin = calculerTempsTrajet(distanceTotale, vehicule.vitesse, 1)

    const livraison = await prisma.$transaction(async tx => {
      const liv = await tx.livraison.create({
        data: {
          reference: generateRef('LIV'),
          vehiculeId,
          distanceTotale,
          tempsPrevuMin,
          dateDepart: new Date(),
          itineraire: JSON.stringify(itineraire),
        },
      })

      const pointsVisites = itineraire.filter((id: string) => id !== 'ENTREPOT')
      for (let i = 0; i < pointsVisites.length; i++) {
        const pointId = pointsVisites[i]
        const cmdsDuPoint = commandes.filter(c => c.pointId === pointId)
        for (const cmd of cmdsDuPoint) {
          await tx.arretLivraison.create({
            data: { livraisonId: liv.id, pointId, commandeId: cmd.id, ordre: i + 1 },
          })
          await tx.commande.update({ where: { id: cmd.id }, data: { statut: StatutCommande.EN_COURS_LIVRAISON } })
        }
      }
      await tx.vehicule.update({ where: { id: vehiculeId }, data: { disponible: false } })
      return liv
    })

    const livraisonComplete = await prisma.livraison.findUnique({
      where: { id: livraison.id },
      include: { vehicule: true, arrets: { include: { point: true, commande: true }, orderBy: { ordre: 'asc' } } },
    })

    return NextResponse.json(livraisonComplete, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
