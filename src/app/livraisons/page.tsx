'use client'
import { useState, useEffect, useCallback } from 'react'
import { Truck, Plus, Route, Clock, CheckCircle, XCircle, RefreshCw, MapPin } from 'lucide-react'
import { formatDate, formatDistance, formatDuree, STATUT_LIVRAISON_LABELS, VEHICULE_CONFIG, cn } from '@/lib/utils'
import { toast } from '@/components/ui/Toaster'
import GraphWrapper from '@/components/graph/GraphWrapper'

interface Vehicule { id: string; type: string; immatriculation: string; vitesse: number; capacite: number; disponible: boolean }
interface Commande { id: string; reference: string; quantite: number; statut: string; point: { id: string; nom: string } }
interface Livraison {
  id: string; reference: string; statut: string; distanceTotale: number; tempsPrevuMin: number
  dateDepart: string; dateArrivee: string | null; vehicule: Vehicule
  arrets: { id: string; ordre: number; point: { nom: string }; commande: { reference: string; quantite: number } }[]
}
interface GraphNode { id: string; label: string; isEntrepot?: boolean }
interface GraphEdge { id: string; source: string; target: string; distance: number }

export default function LivraisonsPage() {
  const [livraisons, setLivraisons] = useState<Livraison[]>([])
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [commandesValidees, setCommandesValidees] = useState<Commande[]>([])
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
  const [selectedPath, setSelectedPath] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showPlanifier, setShowPlanifier] = useState(false)
  const [selectedVehicule, setSelectedVehicule] = useState('')
  const [selectedCommandes, setSelectedCommandes] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [liv, veh, cmd, graph] = await Promise.all([
        fetch('/api/livraisons').then(r => r.json()),
        fetch('/api/vehicules').then(r => r.json()),
        fetch('/api/commandes?statut=VALIDEE').then(r => r.json()),
        fetch('/api/graphe').then(r => r.json()),
      ])
      setLivraisons(Array.isArray(liv) ? liv : [])
      setVehicules(Array.isArray(veh) ? veh : [])
      setCommandesValidees(Array.isArray(cmd) ? cmd : [])
      setGraphData({ nodes: graph.nodes || [], edges: graph.edges || [] })
    } catch { toast('Erreur de chargement', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const previewRoute = useCallback(async () => {
    if (selectedCommandes.length === 0) { setSelectedPath([]); return }
    const pointsIds = [...new Set(commandesValidees.filter(c => selectedCommandes.includes(c.id)).map(c => c.point.id))]
    if (!pointsIds.length) return
    const res = await fetch(`/api/graphe?target=${pointsIds[0]}`).then(r => r.json())
    if (res.cheminOptimal?.path) setSelectedPath(res.cheminOptimal.path)
  }, [selectedCommandes, commandesValidees])

  useEffect(() => { previewRoute() }, [previewRoute])

  const toggleCommande = (id: string) => setSelectedCommandes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handlePlanifier = async () => {
    if (!selectedVehicule || selectedCommandes.length === 0) { toast('Sélectionnez un véhicule et des commandes', 'error'); return }
    const vehicule = vehicules.find(v => v.id === selectedVehicule)
    if (selectedCommandes.length > (vehicule?.capacite ?? 0)) { toast(`Max ${vehicule?.capacite} point(s) par tournée`, 'error'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/livraisons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vehiculeId: selectedVehicule, commandeIds: selectedCommandes }) })
      const data = await res.json()
      if (!res.ok) { toast(data.error || 'Erreur', 'error'); return }
      toast(`Livraison ${data.reference} planifiée — ${formatDistance(data.distanceTotale)} · ${formatDuree(data.tempsPrevuMin)}`)
      setShowPlanifier(false); setSelectedVehicule(''); setSelectedCommandes([])
      fetchAll()
    } catch { toast('Erreur réseau', 'error') }
    finally { setCreating(false) }
  }

  const updateStatut = async (id: string, statut: string) => {
    try {
      const res = await fetch(`/api/livraisons/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut }) })
      if (!res.ok) { const d = await res.json(); toast(d.error || 'Erreur', 'error'); return }
      toast('Statut mis à jour'); fetchAll()
    } catch { toast('Erreur', 'error') }
  }

  const vehiculeChoisi = vehicules.find(v => v.id === selectedVehicule)
  const config = vehiculeChoisi ? VEHICULE_CONFIG[vehiculeChoisi.type as keyof typeof VEHICULE_CONFIG] : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Truck className="h-6 w-6 text-green-600" />Gestion des livraisons</h1>
          <p className="text-slate-500 text-sm mt-1">Planification avec optimisation Dijkstra</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"><RefreshCw className="h-4 w-4 text-slate-500" /></button>
          <button onClick={() => setShowPlanifier(true)} disabled={commandesValidees.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
            <Plus className="h-4 w-4" />Planifier une tournée
          </button>
        </div>
      </div>

      {commandesValidees.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          ⚠️ Aucune commande validée. Validez-en dans l&apos;onglet Commandes.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Route className="h-4 w-4 text-slate-500" />Carte du réseau
            {selectedPath.length > 0 && <span className="text-xs text-green-600 font-normal ml-2">✦ Chemin optimal affiché</span>}
          </h2>
          <GraphWrapper nodes={graphData.nodes} edges={graphData.edges} height={360} selectedPath={selectedPath} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Résumé flotte</h3>
          <div className="space-y-2">
            {(['MOTO', 'CAMIONNETTE', 'CAMION'] as const).map(type => {
              const cfg = VEHICULE_CONFIG[type]
              const count = vehicules.filter(v => v.type === type).length
              const dispos = vehicules.filter(v => v.type === type && v.disponible).length
              return (
                <div key={type} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cfg.icon}</span>
                    <div><p className="text-sm font-medium text-slate-800">{cfg.label}</p><p className="text-xs text-slate-500">{cfg.vitesse} km/h · {cfg.capacite} pt/tournée</p></div>
                  </div>
                  <span className="text-xs font-medium text-slate-600">{dispos}/{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showPlanifier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2"><Truck className="h-5 w-5 text-green-600" />Planifier une nouvelle tournée</h2>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">1. Choisir le véhicule</label>
              <div className="grid sm:grid-cols-3 gap-2">
                {vehicules.filter(v => v.disponible).map(v => {
                  const cfg = VEHICULE_CONFIG[v.type as keyof typeof VEHICULE_CONFIG]
                  return (
                    <button key={v.id} onClick={() => setSelectedVehicule(v.id)}
                      className={cn('p-3 rounded-xl border-2 text-left', selectedVehicule === v.id ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300')}>
                      <div className="flex items-center gap-2 mb-1"><span className="text-lg">{cfg?.icon}</span><span className="font-medium text-sm text-slate-800">{v.immatriculation}</span></div>
                      <p className="text-xs text-slate-500">{cfg?.label} · {v.vitesse} km/h</p>
                      <p className="text-xs text-slate-500">Capacité : {v.capacite} point(s)</p>
                    </button>
                  )
                })}
              </div>
              {vehicules.filter(v => v.disponible).length === 0 && <p className="text-sm text-red-500 mt-2">Aucun véhicule disponible</p>}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                2. Sélectionner les commandes
                {config && <span className="font-normal text-slate-500 ml-2">(max {config.capacite} points · {selectedCommandes.length} sélectionné(s))</span>}
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2">
                {commandesValidees.map(cmd => (
                  <label key={cmd.id} className={cn('flex items-center gap-3 p-2.5 rounded-lg cursor-pointer', selectedCommandes.includes(cmd.id) ? 'bg-green-50' : 'hover:bg-slate-50')}>
                    <input type="checkbox" checked={selectedCommandes.includes(cmd.id)} onChange={() => toggleCommande(cmd.id)} className="rounded border-slate-300 text-green-600" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800">{cmd.point.nom}</p><p className="text-xs text-slate-500">{cmd.reference} · {cmd.quantite} kg</p></div>
                    <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  </label>
                ))}
              </div>
            </div>

            {selectedVehicule && selectedCommandes.length > 0 && config && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-5 text-sm">
                <p className="font-semibold text-green-800 mb-1">📊 Récapitulatif</p>
                <p className="text-green-700">{config.icon} {vehiculeChoisi?.immatriculation} · {selectedCommandes.length} commande(s) · {config.vitesse} km/h</p>
                <p className="text-green-600 text-xs mt-1">Itinéraire optimal calculé via Dijkstra</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowPlanifier(false); setSelectedCommandes([]); setSelectedVehicule('') }} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Annuler</button>
              <button onClick={handlePlanifier} disabled={creating || !selectedVehicule || selectedCommandes.length === 0} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {creating ? 'Calcul en cours...' : '🚀 Lancer la tournée'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-12 text-slate-400">Chargement...</div>
       : livraisons.length === 0 ? <div className="text-center py-12 text-slate-400"><Truck className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Aucune livraison</p></div>
       : (
        <div className="space-y-4">
          {livraisons.map(liv => {
            const statutInfo = STATUT_LIVRAISON_LABELS[liv.statut]
            const cfg = VEHICULE_CONFIG[liv.vehicule.type as keyof typeof VEHICULE_CONFIG]
            return (
              <div key={liv.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 card-hover">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1"><span className="font-mono text-xs text-slate-400">{liv.reference}</span><span className={cn('badge', statutInfo?.color)}>{statutInfo?.label}</span></div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{cfg?.icon} {liv.vehicule.immatriculation}</span>
                      <span className="flex items-center gap-1"><Route className="h-3.5 w-3.5" />{formatDistance(liv.distanceTotale)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuree(liv.tempsPrevuMin)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Départ : {formatDate(liv.dateDepart)}</p>
                  </div>
                  <div className="flex gap-2">
                    {liv.statut === 'PLANIFIEE' && <button onClick={() => updateStatut(liv.id, 'EN_COURS')} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200">Démarrer</button>}
                    {liv.statut === 'EN_COURS' && <button onClick={() => updateStatut(liv.id, 'TERMINEE')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200"><CheckCircle className="h-3.5 w-3.5 inline mr-1" />Terminer</button>}
                    {['PLANIFIEE', 'EN_COURS'].includes(liv.statut) && <button onClick={() => updateStatut(liv.id, 'ANNULEE')} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><XCircle className="h-4 w-4" /></button>}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Itinéraire optimisé</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">🏭 Entrepôt</span>
                    {liv.arrets.map((arret, i) => (
                      <div key={arret.id} className="flex items-center gap-1">
                        <span className="text-slate-300">→</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">{i + 1}. {arret.point.nom}</span>
                      </div>
                    ))}
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
