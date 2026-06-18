// src/app/api/graphe/route.ts
import { prisma } from '@/lib/prisma'
import { requireAny } from '@/lib/api-guard'
import { dijkstra } from '@/lib/dijkstra'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = await requireAny()
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(req.url)
    const targetId = searchParams.get('target')

    const [points, chemins] = await Promise.all([
      prisma.pointDistribution.findMany({ where: { actif: true } }),
      prisma.chemin.findMany({ where: { actif: true } }),
    ])

    const nodes = [
      { id: 'ENTREPOT', label: 'Entrepôt Central', isEntrepot: true },
      ...points.map(p => ({ id: p.id, label: p.nom })),
    ]
    const edges = chemins.map(c => ({
      id: c.id,
      source: c.departPointId ?? 'ENTREPOT',
      target: c.arriveePointId,
      distance: c.distance,
    }))

    let cheminOptimal = null
    if (targetId) {
      const result = dijkstra({ nodes, edges }, 'ENTREPOT')
      cheminOptimal = {
        path: result.paths.get(targetId) ?? [],
        distance: result.distances.get(targetId) ?? Infinity,
      }
    }

    return NextResponse.json({ nodes, edges, cheminOptimal })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
