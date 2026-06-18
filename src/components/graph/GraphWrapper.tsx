'use client'
// src/components/graph/GraphWrapper.tsx
import dynamic from 'next/dynamic'

const GraphVisualization = dynamic(() => import('./GraphVisualization'), {
  ssr: false,
  loading: () => (
    <div className="w-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200" style={{ height: 420 }}>
      <div className="flex flex-col items-center gap-2 text-slate-400">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-green-500 rounded-full animate-spin" />
        <span className="text-sm">Chargement du graphe...</span>
      </div>
    </div>
  ),
})

interface Props {
  nodes: { id: string; label: string; isEntrepot?: boolean }[]
  edges: { id: string; source: string; target: string; distance: number }[]
  height?: number
  selectedPath?: string[]
}

export default function GraphWrapper(props: Props) {
  return <GraphVisualization {...props} />
}
