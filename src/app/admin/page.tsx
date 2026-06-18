'use client'
import { useState, useEffect, useCallback } from 'react'
import { Settings, MapPin, Route, Truck, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, Info, Package } from 'lucide-react'
import { cn, VEHICULE_CONFIG } from '@/lib/utils'
import { toast } from '@/components/ui/Toaster'
import GraphWrapper from '@/components/graph/GraphWrapper'
import StockPanel from '@/components/ui/StockPanel'

interface Point { id: string; nom: string; adresse: string; actif: boolean; _count?: { commandes: number } }
interface Chemin { id: string; distance: number; actif: boolean; departPointId: string | null; departPoint: Point | null; arriveePoint: Point }
interface Vehicule { id: string; type: string; immatriculation: string; vitesse: number; capacite: number; disponible: boolean; _count?: { livraisons: number } }

type TabType = 'graphe' | 'points' | 'chemins' | 'vehicules' | 'stock'

export default function AdminPage() {
  const [tab, setTab] = useState<TabType>('graphe')
  const [points, setPoints] = useState<Point[]>([])
  const [chemins, setChemins] = useState<Chemin[]>([])
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [graphData, setGraphData] = useState<any>({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)

  const [newPoint, setNewPoint] = useState({ nom: '', adresse: '' })
  const [newChemin, setNewChemin] = useState({ departPointId: '', arriveePointId: '', distance: '' })
  const [newVehicule, setNewVehicule] = useState({ type: 'MOTO', immatriculation: '' })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pts, ch, veh, graph] = await Promise.all([
        fetch('/api/points').then(r => r.json()),
        fetch('/api/chemins').then(r => r.json()),
        fetch('/api/vehicules').then(r => r.json()),
        fetch('/api/graphe').then(r => r.json()),
      ])
      setPoints(Array.isArray(pts) ? pts : [])
      setChemins(Array.isArray(ch) ? ch : [])
      setVehicules(Array.isArray(veh) ? veh : [])
      setGraphData({ nodes: graph.nodes || [], edges: graph.edges || [] })
    } catch { toast('Erreur chargement', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addPoint = async () => {
    if (!newPoint.nom || !newPoint.adresse) { toast('Nom et adresse requis', 'error'); return }
    const res = await fetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPoint) })
    if (res.ok) { toast('Point ajouté !'); setNewPoint({ nom: '', adresse: '' }); fetchAll() }
    else { const d = await res.json(); toast(d.error || 'Erreur', 'error') }
  }

  const togglePoint = async (id: string, actif: boolean) => {
    if (!actif) {
      if (!confirm('Désactiver ce point supprimera aussi ses chemins. Continuer ?')) return
      await fetch(`/api/points/${id}`, { method: 'DELETE' })
      toast('Point désactivé')
    } else {
      await fetch(`/api/points/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actif: true }) })
      toast('Point réactivé')
    }
    fetchAll()
  }

  const addChemin = async () => {
    if (!newChemin.arriveePointId || !newChemin.distance) { toast('Données incomplètes', 'error'); return }
    const res = await fetch('/api/chemins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newChemin, departPointId: newChemin.departPointId || null }) })
    if (res.ok) { toast('Chemin ajouté !'); setNewChemin({ departPointId: '', arriveePointId: '', distance: '' }); fetchAll() }
    else { const d = await res.json(); toast(d.error || 'Erreur', 'error') }
  }

  const deleteChemin = async (id: string) => {
    if (!confirm('Supprimer ce chemin ?')) return
    await fetch(`/api/chemins/${id}`, { method: 'DELETE' })
    toast('Chemin supprimé'); fetchAll()
  }

  const addVehicule = async () => {
    if (!newVehicule.immatriculation) { toast('Immatriculation requise', 'error'); return }
    const res = await fetch('/api/vehicules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newVehicule) })
    if (res.ok) { toast('Véhicule ajouté !'); setNewVehicule({ type: 'MOTO', immatriculation: '' }); fetchAll() }
    else { const d = await res.json(); toast(d.error || 'Erreur', 'error') }
  }

  const TABS = [
    { id: 'graphe' as TabType, label: 'Graphe', icon: Route },
    { id: 'points' as TabType, label: 'Points', icon: MapPin },
    { id: 'chemins' as TabType, label: 'Chemins', icon: Route },
    { id: 'vehicules' as TabType, label: 'Véhicules', icon: Truck },
    { id: 'stock' as TabType, label: 'Stocks', icon: Package },
  ]
  const activePoints = points.filter(p => p.actif)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Settings className="h-6 w-6 text-green-600" />Administration</h1>
          <p className="text-slate-500 text-sm mt-1">Gérez le graphe, points, chemins, véhicules et stocks</p>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"><RefreshCw className="h-4 w-4 text-slate-500" /></button>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium', tab === id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800')}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'graphe' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Réseau complet de distribution</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5"><Info className="h-3.5 w-3.5 text-blue-500" />Glissez les nœuds pour réorganiser</div>
            </div>
            <GraphWrapper nodes={graphData.nodes} edges={graphData.edges} height={500} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center"><p className="text-3xl font-bold text-green-600">{activePoints.length}</p><p className="text-sm text-slate-500 mt-1">Points actifs</p></div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center"><p className="text-3xl font-bold text-blue-600">{chemins.length}</p><p className="text-sm text-slate-500 mt-1">Arêtes</p></div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center"><p className="text-3xl font-bold text-purple-600">{vehicules.length}</p><p className="text-sm text-slate-500 mt-1">Véhicules</p></div>
          </div>
        </div>
      )}

      {tab === 'points' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-green-600" />Ajouter un point</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <input value={newPoint.nom} onChange={e => setNewPoint(p => ({ ...p, nom: e.target.value }))} placeholder="Nom du marché" className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              <input value={newPoint.adresse} onChange={e => setNewPoint(p => ({ ...p, adresse: e.target.value }))} placeholder="Adresse" className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <button onClick={addPoint} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"><Plus className="h-4 w-4" />Ajouter</button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr><th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nom</th><th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Adresse</th><th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Commandes</th><th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Statut</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {points.map(p => (
                  <tr key={p.id} className={cn('hover:bg-slate-50', !p.actif && 'opacity-50')}>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.nom}</td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{p.adresse}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{p._count?.commandes ?? 0}</td>
                    <td className="px-4 py-3 text-center"><span className={cn('badge', p.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{p.actif ? 'Actif' : 'Inactif'}</span></td>
                    <td className="px-4 py-3 text-right"><button onClick={() => togglePoint(p.id, !p.actif)} className={cn('p-1.5 rounded-lg', p.actif ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50')}>{p.actif ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'chemins' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-blue-600" />Ajouter un chemin</h2>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <select value={newChemin.departPointId} onChange={e => setNewChemin(c => ({ ...c, departPointId: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">🏭 Entrepôt (défaut)</option>
                {activePoints.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
              <select value={newChemin.arriveePointId} onChange={e => setNewChemin(c => ({ ...c, arriveePointId: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Arrivée...</option>
                {activePoints.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
              <input type="number" min="0.1" step="0.1" value={newChemin.distance} onChange={e => setNewChemin(c => ({ ...c, distance: e.target.value }))} placeholder="Distance (km)" className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <button onClick={addChemin} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"><Plus className="h-4 w-4" />Ajouter</button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Départ</th><th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Arrivée</th><th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Distance</th><th className="px-4 py-3" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {chemins.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{c.departPointId ? c.departPoint?.nom : '🏭 Entrepôt'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.arriveePoint.nom}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{c.distance} km</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => deleteChemin(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'vehicules' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-purple-600" />Ajouter un véhicule</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <select value={newVehicule.type} onChange={e => setNewVehicule(v => ({ ...v, type: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="MOTO">🏍️ Moto (40 km/h · 1 pt)</option>
                <option value="CAMIONNETTE">🚐 Camionnette (30 km/h · 3 pts)</option>
                <option value="CAMION">🚛 Camion (25 km/h · 6 pts)</option>
              </select>
              <input value={newVehicule.immatriculation} onChange={e => setNewVehicule(v => ({ ...v, immatriculation: e.target.value }))} placeholder="Immatriculation" className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <button onClick={addVehicule} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700"><Plus className="h-4 w-4" />Ajouter</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicules.map(v => {
              const cfg = VEHICULE_CONFIG[v.type as keyof typeof VEHICULE_CONFIG]
              return (
                <div key={v.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 card-hover">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2"><span className="text-2xl">{cfg?.icon}</span><div><p className="font-semibold text-slate-900 text-sm">{v.immatriculation}</p><p className="text-xs text-slate-500">{cfg?.label}</p></div></div>
                    <span className={cn('badge', v.disponible ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>{v.disponible ? 'Disponible' : 'En mission'}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100"><span>⚡ {v.vitesse} km/h</span><span>📦 {v.capacite} pt/tournée</span><span>📊 {v._count?.livraisons ?? 0} livraisons</span></div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'stock' && <StockPanel />}
    </div>
  )
}
