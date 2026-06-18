// src/lib/dijkstra.ts
export interface GraphNode { id: string; label: string; isEntrepot?: boolean }
export interface GraphEdge { id: string; source: string; target: string; distance: number }
export interface Graph { nodes: GraphNode[]; edges: GraphEdge[] }
export interface DijkstraResult {
  distances: Map<string, number>
  previous: Map<string, string | null>
  paths: Map<string, string[]>
}

export function dijkstra(graph: Graph, sourceId: string): DijkstraResult {
  const distances = new Map<string, number>()
  const previous = new Map<string, string | null>()
  const visited = new Set<string>()
  const nodeIds = graph.nodes.map(n => n.id)

  for (const id of nodeIds) { distances.set(id, Infinity); previous.set(id, null) }
  distances.set(sourceId, 0)

  const queue = [...nodeIds]
  while (queue.length > 0) {
    queue.sort((a, b) => (distances.get(a) ?? Infinity) - (distances.get(b) ?? Infinity))
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    if (distances.get(current) === Infinity) break

    for (const edge of graph.edges.filter(e => e.source === current)) {
      if (visited.has(edge.target)) continue
      const alt = (distances.get(current) ?? Infinity) + edge.distance
      if (alt < (distances.get(edge.target) ?? Infinity)) {
        distances.set(edge.target, alt)
        previous.set(edge.target, current)
      }
    }
  }

  const paths = new Map<string, string[]>()
  for (const id of nodeIds) {
    if (id === sourceId) { paths.set(id, [sourceId]); continue }
    const path: string[] = []
    let cur: string | null = id
    while (cur !== null) { path.unshift(cur); cur = previous.get(cur) ?? null }
    paths.set(id, path[0] === sourceId ? path : [])
  }
  return { distances, previous, paths }
}

export function calculerItineraireOptimal(graph: Graph, sourceId: string, pointsIds: string[]): { itineraire: string[]; distanceTotale: number } {
  if (!pointsIds.length) return { itineraire: [], distanceTotale: 0 }
  const aVisiter = new Set(pointsIds)
  const itineraire: string[] = [sourceId]
  let distanceTotale = 0
  let pos = sourceId

  while (aVisiter.size > 0) {
    const res = dijkstra(graph, pos)
    let minDist = Infinity, prochain: string | null = null
    for (const id of aVisiter) {
      const d = res.distances.get(id) ?? Infinity
      if (d < minDist) { minDist = d; prochain = id }
    }
    if (!prochain || minDist === Infinity) break
    const chemin = res.paths.get(prochain) ?? []
    for (let i = 1; i < chemin.length; i++) itineraire.push(chemin[i])
    distanceTotale += minDist
    aVisiter.delete(prochain)
    pos = prochain
  }
  return { itineraire, distanceTotale }
}

export function calculerTempsTrajet(distanceKm: number, vitesseKmh: number, nbVehicules = 1): number {
  if (vitesseKmh <= 0 || nbVehicules <= 0) return 0
  return Math.ceil((distanceKm / vitesseKmh) * 60 / Math.sqrt(nbVehicules))
}

export function infoFenetreCommande() {
  const now = new Date()
  const h = now.getHours(), m = now.getMinutes()
  if (h >= 20 && h < 23) {
    const min = (23 - h - 1) * 60 + (60 - m)
    return { ouverte: true, message: `Ferme dans ${Math.floor(min/60)}h${min%60}min`, heuresRestantes: Math.floor(min/60), minutesRestantes: min%60 }
  }
  const min = h < 20 ? (20 - h - 1) * 60 + (60 - m) : (24 - h + 20) * 60 - m
  return { ouverte: false, message: `Ouvre dans ${Math.floor(min/60)}h${min%60}min`, heuresRestantes: Math.floor(min/60), minutesRestantes: min%60 }
}
