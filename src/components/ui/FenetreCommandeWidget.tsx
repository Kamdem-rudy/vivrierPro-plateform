'use client'
// src/components/ui/FenetreCommandeWidget.tsx
import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { infoFenetreCommande } from '@/lib/dijkstra'
import { cn } from '@/lib/utils'

export default function FenetreCommandeWidget() {
  const [info, setInfo] = useState(infoFenetreCommande())
  useEffect(() => {
    const interval = setInterval(() => setInfo(infoFenetreCommande()), 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium',
      info.ouverte ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800')}>
      <Clock className="h-4 w-4 flex-shrink-0" />
      <div>
        <span className="font-semibold">{info.ouverte ? '🟢 Commandes ouvertes' : '🔴 Commandes fermées'}</span>
        <span className="ml-2 font-normal opacity-80">{info.message}</span>
      </div>
    </div>
  )
}
