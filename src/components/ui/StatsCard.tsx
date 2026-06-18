'use client'
// src/components/ui/StatsCard.tsx
import { MapPin, Package, Truck, TrendingUp, Clock, CheckCircle, AlertTriangle, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  MapPin, Package, Truck, TrendingUp, Clock, CheckCircle, AlertTriangle, ShoppingCart,
}

interface StatsCardProps { label: string; value: string | number; icon: string; color: string; bg: string; change?: string }

export default function StatsCard({ label, value, icon, color, bg, change }: StatsCardProps) {
  const Icon = ICONS[icon] ?? Package
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {change && <p className="text-xs text-slate-400 mt-1">{change}</p>}
        </div>
        <div className={cn('p-2.5 rounded-lg', bg)}><Icon className={cn('h-5 w-5', color)} /></div>
      </div>
    </div>
  )
}
