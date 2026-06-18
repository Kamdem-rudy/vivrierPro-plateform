'use client'
import { useState, useEffect, useCallback } from 'react'
import { Package, AlertTriangle, Plus, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/Toaster'

interface StockInfo { id: string; produitId: string; nomProduit: string; unite: string; quantiteDisponible: number; quantiteReservee: number; quantiteLibre: number; seuilAlerte: number; enAlerte: boolean; version: number }
interface Mouvement { id: string; type: string; quantite: number; description: string | null; versionApres: number; createdAt: string; stock: { produit: { nom: string; unite: string } } }

const TYPE_STYLE: Record<string, { label: string; color: string; icon: string }> = {
  ENTREE: { label: 'Entrée', color: 'bg-green-100 text-green-700', icon: '📥' },
  RESERVATION: { label: 'Réservation', color: 'bg-blue-100 text-blue-700', icon: '🔒' },
  LIBERATION: { label: 'Libération', color: 'bg-amber-100 text-amber-700', icon: '🔓' },
  LIVRAISON: { label: 'Livraison', color: 'bg-purple-100 text-purple-700', icon: '🚛' },
  AJUSTEMENT: { label: 'Ajustement', color: 'bg-slate-100 text-slate-700', icon: '⚙️' },
}

export default function StockPanel() {
  const [stocks, setStocks] = useState<StockInfo[]>([])
  const [mouvements, setMouvements] = useState<Mouvement[]>([])
  const [loading, setLoading] = useState(true)
  const [showMouvements, setShowMouvements] = useState(false)
  const [showAppro, setShowAppro] = useState<string | null>(null)
  const [approQte, setApproQte] = useState('')
  const [approDesc, setApproDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([
        fetch('/api/stock').then(r => r.json()),
        fetch('/api/stock/mouvements').then(r => r.json()),
      ])
      setStocks(Array.isArray(s) ? s : [])
      setMouvements(Array.isArray(m) ? m : [])
    } catch { toast('Erreur chargement', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAppro = async (produitId: string) => {
    if (!approQte || parseFloat(approQte) <= 0) { toast('Quantité invalide', 'error'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ produitId, quantite: parseFloat(approQte), description: approDesc || 'Approvisionnement' }) })
      if (res.ok) { toast('Stock approvisionné !'); setShowAppro(null); setApproQte(''); setApproDesc(''); fetchData() }
      else { const d = await res.json(); toast(d.error || 'Erreur', 'error') }
    } catch { toast('Erreur', 'error') }
    finally { setSubmitting(false) }
  }

  const totalAlerte = stocks.filter(s => s.enAlerte).length
  if (loading) return <div className="text-center py-8 text-slate-400">Chargement...</div>

  return (
    <div className="space-y-5">
      {totalAlerte > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">{totalAlerte} produit(s) en dessous du seuil d&apos;alerte</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">🔐 Verrouillage optimiste actif</p>
        <p className="text-blue-700 text-xs leading-relaxed">
          Garantit que la somme des quantités accordées ne dépasse jamais le stock disponible, même en cas de commandes simultanées.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stocks.map(s => {
          const pct = s.quantiteDisponible > 0 ? Math.round((s.quantiteLibre / s.quantiteDisponible) * 100) : 0
          return (
            <div key={s.id} className={cn('bg-white rounded-xl border shadow-sm p-4', s.enAlerte ? 'border-amber-300' : 'border-slate-200')}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-slate-500" />
                    <p className="font-semibold text-slate-900 text-sm">{s.nomProduit}</p>
                    {s.enAlerte && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">v{s.version} · unité : {s.unite}</p>
                </div>
                <button onClick={() => { setShowAppro(s.produitId); setApproQte(''); setApproDesc('') }} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="Approvisionner">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Libre : <strong className={cn(s.enAlerte ? 'text-amber-600' : 'text-green-600')}>{s.quantiteLibre} {s.unite}</strong></span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', s.enAlerte ? 'bg-amber-400' : 'bg-green-500')} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 rounded-lg p-1.5"><p className="font-bold text-slate-800">{s.quantiteDisponible}</p><p className="text-slate-400">Total</p></div>
                <div className="bg-blue-50 rounded-lg p-1.5"><p className="font-bold text-blue-700">{s.quantiteReservee}</p><p className="text-blue-500">Réservé</p></div>
                <div className={cn('rounded-lg p-1.5', s.enAlerte ? 'bg-amber-50' : 'bg-green-50')}><p className={cn('font-bold', s.enAlerte ? 'text-amber-700' : 'text-green-700')}>{s.quantiteLibre}</p><p className={s.enAlerte ? 'text-amber-500' : 'text-green-500'}>Libre</p></div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Seuil alerte : {s.seuilAlerte} {s.unite}</p>
              {showAppro === s.produitId && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Approvisionner</p>
                  <input type="number" min="0.1" step="0.1" value={approQte} onChange={e => setApproQte(e.target.value)} placeholder={`Quantité (${s.unite})`} className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <input type="text" value={approDesc} onChange={e => setApproDesc(e.target.value)} placeholder="Description" className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowAppro(null)} className="flex-1 text-xs py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Annuler</button>
                    <button onClick={() => handleAppro(s.produitId)} disabled={submitting} className="flex-1 text-xs py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">Confirmer</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button onClick={() => setShowMouvements(!showMouvements)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-900">Journal des mouvements</span>
            <span className="badge bg-slate-100 text-slate-600">{mouvements.length}</span>
          </div>
          <span className="text-slate-400 text-sm">{showMouvements ? '▲ Masquer' : '▼ Afficher'}</span>
        </button>
        {showMouvements && (
          <div className="border-t border-slate-100 max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Produit</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">Quantité</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Version</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mouvements.map(m => {
                  const style = TYPE_STYLE[m.type] || { label: m.type, color: 'bg-slate-100 text-slate-700', icon: '•' }
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5"><span className={cn('badge', style.color)}>{style.icon} {style.label}</span></td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 text-xs">{m.stock.produit.nom}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-700">{['RESERVATION', 'LIVRAISON'].includes(m.type) ? '-' : '+'}{m.quantite} {m.stock.produit.unite}</td>
                      <td className="px-4 py-2.5 text-center"><span className="text-xs font-mono text-slate-400">v{m.versionApres}</span></td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 text-right whitespace-nowrap">{new Date(m.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
