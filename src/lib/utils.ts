import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
export function formatDistance(km: number) { return `${km.toFixed(1)} km` }
export function formatDuree(min: number) { if (min < 60) return `${min} min`; const h = Math.floor(min/60); const m = min%60; return m ? `${h}h ${m}min` : `${h}h` }
export const VEHICULE_CONFIG = {
  MOTO:        { label: 'Moto',        vitesse: 40, capacite: 1, icon: '🏍️', color: 'text-amber-600' },
  CAMIONNETTE: { label: 'Camionnette', vitesse: 30, capacite: 3, icon: '🚐', color: 'text-blue-600' },
  CAMION:      { label: 'Camion',      vitesse: 25, capacite: 6, icon: '🚛', color: 'text-green-600' },
}
export const STATUT_COMMANDE_LABELS: Record<string, { label: string; color: string }> = {
  EN_ATTENTE:         { label: 'En attente',   color: 'bg-yellow-100 text-yellow-800' },
  VALIDEE:            { label: 'Validée',       color: 'bg-blue-100 text-blue-800' },
  EN_COURS_LIVRAISON: { label: 'En livraison',  color: 'bg-purple-100 text-purple-800' },
  LIVREE:             { label: 'Livrée',        color: 'bg-green-100 text-green-800' },
  ANNULEE:            { label: 'Annulée',       color: 'bg-red-100 text-red-800' },
}
export const STATUT_LIVRAISON_LABELS: Record<string, { label: string; color: string }> = {
  PLANIFIEE: { label: 'Planifiée', color: 'bg-blue-100 text-blue-800' },
  EN_COURS:  { label: 'En cours',  color: 'bg-purple-100 text-purple-800' },
  TERMINEE:  { label: 'Terminée',  color: 'bg-green-100 text-green-800' },
  ANNULEE:   { label: 'Annulée',   color: 'bg-red-100 text-red-800' },
}
