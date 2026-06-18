'use client'
// src/app/acces-refuse/page.tsx
import Link from 'next/link'
import { ShieldX, ArrowLeft } from 'lucide-react'

export default function AccesRefusePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-red-100 rounded-full"><ShieldX className="h-12 w-12 text-red-500" /></div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Accès refusé</h1>
        <p className="text-slate-500 mb-6">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
          Contactez votre administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">
          <ArrowLeft className="h-4 w-4" />Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
