'use client'
// src/components/graph/GraphVisualization.tsx
import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'

interface Node { id: string; label: string; isEntrepot?: boolean; x?: number; y?: number; fx?: number | null; fy?: number | null }
interface Edge { id: string; source: string | Node; target: string | Node; distance: number }
interface Props { nodes: Node[]; edges: Edge[]; height?: number; selectedPath?: string[] }

export default function GraphVisualization({ nodes, edges, height = 420, selectedPath = [] }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const isOnPath = useCallback((id: string) => selectedPath.includes(id), [selectedPath])
  const isEdgeOnPath = useCallback((edge: Edge) => {
    if (selectedPath.length < 2) return false
    const s = typeof edge.source === 'string' ? edge.source : edge.source.id
    const t = typeof edge.target === 'string' ? edge.target : edge.target.id
    for (let i = 0; i < selectedPath.length - 1; i++) {
      if ((selectedPath[i] === s && selectedPath[i+1] === t) || (selectedPath[i] === t && selectedPath[i+1] === s)) return true
    }
    return false
  }, [selectedPath])

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const width = svgRef.current.clientWidth || 600

    const defs = svg.append('defs')
    defs.append('marker').attr('id', 'arrow').attr('viewBox', '0 -5 10 10').attr('refX', 22).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#94a3b8')
    defs.append('marker').attr('id', 'arrowPath').attr('viewBox', '0 -5 10 10').attr('refX', 22).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#16a34a')

    const g = svg.append('g')
    svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).on('zoom', e => g.attr('transform', e.transform)))

    const nodesCopy: Node[] = nodes.map(n => ({ ...n }))
    const edgesCopy: Edge[] = edges.map(e => ({ ...e }))
    const entrepot = nodesCopy.find(n => n.isEntrepot)
    if (entrepot) { entrepot.fx = width / 2; entrepot.fy = height / 2 }

    const sim = d3.forceSimulation<Node>(nodesCopy)
      .force('link', d3.forceLink<Node, Edge>(edgesCopy).id(d => d.id).distance(d => Math.max(60, d.distance * 6)).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(40))

    const link = g.append('g').selectAll('line').data(edgesCopy).join('line')
      .attr('stroke', d => isEdgeOnPath(d) ? '#16a34a' : '#94a3b8')
      .attr('stroke-width', d => isEdgeOnPath(d) ? 3 : 1.5)
      .attr('stroke-dasharray', d => isEdgeOnPath(d) ? '8 4' : 'none')
      .attr('marker-end', d => isEdgeOnPath(d) ? 'url(#arrowPath)' : 'url(#arrow)')
      .attr('opacity', 0.8)

    const linkLabel = g.append('g').selectAll('text').data(edgesCopy).join('text')
      .attr('text-anchor', 'middle').attr('font-size', '10px').attr('fill', '#64748b').attr('dy', -4)
      .text(d => `${d.distance} km`)

    const node = g.append('g').selectAll('g').data(nodesCopy).join('g').attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); if (!d.isEntrepot) { d.fx = null; d.fy = null } })
      )

    node.append('circle')
      .attr('r', d => d.isEntrepot ? 22 : 16)
      .attr('fill', d => d.isEntrepot ? '#16a34a' : isOnPath(d.id) ? '#f59e0b' : '#3b82f6')
      .attr('stroke', d => d.isEntrepot ? '#14532d' : isOnPath(d.id) ? '#d97706' : '#1e40af')
      .attr('stroke-width', d => isOnPath(d.id) ? 3 : 2)
      .attr('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))')

    node.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', d => d.isEntrepot ? '13px' : '10px').attr('fill', 'white').attr('font-weight', 'bold')
      .text(d => d.isEntrepot ? '⬡' : d.label.charAt(0))

    node.append('text').attr('text-anchor', 'middle').attr('dy', d => d.isEntrepot ? 30 : 24)
      .attr('font-size', '11px').attr('font-weight', d => d.isEntrepot ? '700' : '500')
      .attr('fill', d => d.isEntrepot ? '#15803d' : '#1e40af')
      .text(d => d.label.length > 14 ? d.label.slice(0, 14) + '…' : d.label)

    sim.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y).attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
      linkLabel.attr('x', (d: any) => (d.source.x + d.target.x) / 2).attr('y', (d: any) => (d.source.y + d.target.y) / 2)
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => { sim.stop() }
  }, [nodes, edges, height, isOnPath, isEdgeOnPath])

  return (
    <div style={{ height }} className="w-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative">
      <svg ref={svgRef} width="100%" height="100%" className="w-full h-full" />
      {nodes.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Aucun nœud à afficher</div>}
      <div className="absolute bottom-2 right-2 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded-md">Molette pour zoomer · Glisser pour déplacer</div>
    </div>
  )
}
