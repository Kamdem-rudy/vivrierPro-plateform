'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, ShoppingCart, Clock, CheckCircle, XCircle, Package, RefreshCw, AlertTriangle } from 'lucide-react'
import { formatDate, STATUT_COMMANDE_LABELS, cn } from '@/lib/utils'
import { infoFenetreCommande } from '@/lib/dijkstra'
import { toast } from '@/components/ui/Toaster'
import { useSession } from 'next-auth/react'

interface Point { id: string; nom: string; adresse: string }
interface Produit { id: string; nom: string; unite: string }
interface StockInfo { produitId: string; nomProduit: string; unite: string; quantiteLibre: number; enAlerte: boolean }
interface Commande { id: string; reference: string; quantite: number; statut: string; heurePassee: string; notes: string | null; point: Point; produit: Produit }

export default function CommandesPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const [commandes, setCommandes] = useState<Commande[]>([])
  const [points, setPoints] = useState<Point[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [stocks, setStocks] = useState<StockInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [fenetre, setFenetre] = useState(infoFenetreCommande())
  const [form, setForm] = useState({ pointId: '', produitId: '', quantite: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [filtre, setFiltre] = useState('TOUS')
  const [erreurStock, setErreurStock] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [cmd, pts, prods, stks] = await Promise.all([
        fetch('/api/commandes').then(r => r.json()),
        fetch('/api/points').then(r => r.json()),
        fetch('/api/produits').then(r => r.json()),
        fetch('/api/stock').then(r => r.json()),
      ])
      setCommandes(Array.isArray(cmd) ? cmd : [])
      setPoints(Array.isArray(pts) ? pts.filter((p: any) => p.actif) : [])
      setProduits(Array.isArray(prods) ? prods : [])
      setStocks(Array.isArray(stks) ? stks : [])
    } catch { toast('Erreur de chargement', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(() => setFenetre(infoFenetreCommande()), 30000)
    return () => clearInterval(t)
  }, [fetchData])

  const stockProduit = stocks.find(s => s.produitId === form.produitId)
  const qteFloat = parseFloat(form.quantite) || 0
  const stockInsuffisant = stockProduit && qteFloat > 0 && qteFloat > stockProduit.quantiteLibre

  const handleSubmit = async (forceHoraire = false) => {
    if (!form.pointId || !form.produitId || !form.quantite) { toast('Veuillez remplir tous les champs', 'error'); return }
    if (stockInsuffisant) { toast(`Stock insuffisant — disponible : ${stockProduit!.quantiteLibre} ${stockProduit!.unite}`, 'error'); return }
    setSubmitting(true); setErreurStock(null)
    try {
      const res = await fetch('/api/commandes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantite: parseFloat(form.quantite), forceHoraire }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'HORS_FENETRE') {
          if (isAdmin && confirm('Hors fenêtre horaire. Forcer (admin) ?')) { setSubmitting(false); return handleSubmit(true) }
          toast(data.error, 'error')
        } else if (data.code === 'STOCK_INSUFFISANT') setErreurStock(data.error)
        else if (data.code === 'CONFLIT_EPUISE') toast('⚡ Conflit de concurrence — réessayez.', 'error')
        else toast(data.error || 'Erreur', 'error')
        return
      }
      toast('✅ Commande créée !')
      setShowForm(false); setForm({ pointId: '', produitId: '', quantite: '', notes: '' }); setErreurStock(null)
      fetchData()
    } catch { toast('Erreur réseau', 'error') }
    finally { setSubmitting(false) }
  }

  const updateStatut = async (id: string, statut: string) => {
    try {
      const res = await fetch(`/api/commandes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut }) })
      if (!res.ok) { const d = await res.json(); toast(d.error || 'Erreur', 'error'); return }
      toast('Statut mis à jour'); fetchData()
    } catch { toast('Erreur', 'error') }
  }

  const commandesFiltrees = filtre === 'TOUS' ? commandes : commandes.filter(c => c.statut === filtre)
  const stats = {
    total: commandes.length,
    attente: commandes.filter(c => c.statut === 'EN_ATTENTE').length,
    validees: commandes.filter(c => c.statut === 'VALIDEE').length,
    livrees: commandes.filter(c => c.statut === 'LIVREE').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-green-600" />Gestion des commandes</h1>
          <p className="text-slate-500 text-sm mt-1">Fenêtre : 20h00 – 23h00 · Anti-conflits actif</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"><RefreshCw className="h-4 w-4 text-slate-500" /></button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            <Plus className="h-4 w-4" />Nouvelle commande
          </button>
        </div>
      </div>

      <div className={cn('flex items-center gap-3 p-4 rounded-xl border mb-6', fenetre.ouverte ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200')}>
        <Clock className={cn('h-5 w-5', fenetre.ouverte ? 'text-green-600' : 'text-amber-600')} />
        <div>
          <p className={cn('font-semibold', fenetre.ouverte ? 'text-green-800' : 'text-amber-800')}>{fenetre.ouverte ? '🟢 Fenêtre ouverte' : '🔴 Fenêtre fermée'}</p>
          <p className={cn('text-sm', fenetre.ouverte ? 'text-green-700' : 'text-amber-700')}>{fenetre.message}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', val: stats.total, bg: 'bg-slate-100', color: 'text-slate-800' },
          { label: 'En attente', val: stats.attente, bg: 'bg-amber-100', color: 'text-amber-700' },
          { label: 'Validées', val: stats.validees, bg: 'bg-blue-100', color: 'text-blue-700' },
          { label: 'Livrées', val: stats.livrees, bg: 'bg-green-100', color: 'text-green-700' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-3 text-center', s.bg)}>
            <p className={cn('text-2xl font-bold', s.color)}>{s.val}</p>
            <p className="text-xs text-slate-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {['TOUS', 'EN_ATTENTE', 'VALIDEE', 'EN_COURS_LIVRAISON', 'LIVREE', 'ANNULEE'].map(s => (
          <button key={s} onClick={() => setFiltre(s)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', filtre === s ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {s === 'TOUS' ? 'Toutes' : STATUT_COMMANDE_LABELS[s]?.label ?? s}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-green-600" />Nouvelle commande</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Point de distribution *</label>
                <select value={form.pointId} onChange={e => setForm(f => ({ ...f, pointId: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Sélectionner...</option>
                  {points.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Produit vivrier *</label>
                <select value={form.produitId} onChange={e => setForm(f => ({ ...f, produitId: e.target.value, quantite: '' }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Sélectionner...</option>
                  {produits.map(p => {
                    const s = stocks.find(st => st.produitId === p.id)
                    return <option key={p.id} value={p.id}>{p.nom} {s ? `— ${s.quantiteLibre} ${p.unite} libres` : ''}</option>
                  })}
                </select>
                {stockProduit && (
                  <div className={cn('mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs', stockProduit.enAlerte ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-green-50 border border-green-200 text-green-700')}>
                    {stockProduit.enAlerte ? <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> : <Package className="h-3.5 w-3.5 flex-shrink-0" />}
                    <span>Stock disponible : <strong>{stockProduit.quantiteLibre} {stockProduit.unite}</strong>{stockProduit.enAlerte && ' ⚠️'}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantité ({stockProduit?.unite || 'unité'}) *</label>
                <input type="number" min="0.1" step="0.1" value={form.quantite} onChange={e => { setForm(f => ({ ...f, quantite: e.target.value })); setErreurStock(null) }}
                  placeholder={stockProduit ? `Max : ${stockProduit.quantiteLibre}` : 'Ex: 50'}
                  className={cn('w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2', stockInsuffisant ? 'border-red-400 focus:ring-red-500' : 'border-slate-300 focus:ring-green-500')} />
                {stockInsuffisant && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Stock insuffisant — max : {stockProduit!.quantiteLibre} {stockProduit!.unite}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {erreurStock && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2"><AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" /><p>{erreurStock}</p></div>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowForm(false); setErreurStock(null) }} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Annuler</button>
              <button onClick={() => handleSubmit(false)} disabled={submitting || !!stockInsuffisant} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {submitting ? 'Traitement...' : 'Créer la commande'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-12 text-slate-400">Chargement...</div>
       : commandesFiltrees.length === 0 ? <div className="text-center py-12 text-slate-400"><ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Aucune commande</p></div>
       : (
        <div className="space-y-3">
          {commandesFiltrees.map(cmd => {
            const statutInfo = STATUT_COMMANDE_LABELS[cmd.statut]
            return (
              <div key={cmd.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 card-hover">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-400">{cmd.reference}</span>
                      <span className={cn('badge', statutInfo?.color)}>{statutInfo?.label}</span>
                    </div>
                    <p className="font-semibold text-slate-900">{cmd.point.nom}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span>📦 {cmd.produit.nom} — {cmd.quantite} {cmd.produit.unite}</span>
                      <span>🕐 {formatDate(cmd.heurePassee)}</span>
                    </div>
                    {cmd.notes && <p className="text-xs text-slate-400 mt-1">📝 {cmd.notes}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {cmd.statut === 'EN_ATTENTE' && <button onClick={() => updateStatut(cmd.id, 'VALIDEE')} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><CheckCircle className="h-4 w-4" /></button>}
                    {['EN_ATTENTE', 'VALIDEE'].includes(cmd.statut) && <button onClick={() => updateStatut(cmd.id, 'ANNULEE')} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><XCircle className="h-4 w-4" /></button>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
