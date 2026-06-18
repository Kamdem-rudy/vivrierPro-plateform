// src/lib/stock.ts
import { prisma } from '@/lib/prisma'
import { TypeMouvement } from '@prisma/client'

export interface StockInfo {
  id: string; produitId: string; nomProduit: string; unite: string
  quantiteDisponible: number; quantiteReservee: number; quantiteLibre: number
  seuilAlerte: number; enAlerte: boolean; version: number
}

export interface ReservationResult {
  success: true
  nouvelleVersion: number
  quantiteLibreRestante: number
}

export type ErreurStock =
  | { code: 'STOCK_INEXISTANT'; message: string }
  | { code: 'STOCK_INSUFFISANT'; message: string; dispo: number; demande: number; unite: string }
  | { code: 'CONFLIT_EPUISE'; message: string; tentatives: number }
  | { code: 'PRODUIT_INACTIF'; message: string }

const MAX_TENTATIVES = 3
const DELAI_BASE_MS = 50

export async function lireStocks(): Promise<StockInfo[]> {
  const stocks = await prisma.stock.findMany({ include: { produit: true }, orderBy: { produit: { nom: 'asc' } } })
  return stocks.map(toStockInfo)
}

export async function lireStock(produitId: string): Promise<StockInfo | null> {
  const stock = await prisma.stock.findUnique({ where: { produitId }, include: { produit: true } })
  return stock ? toStockInfo(stock) : null
}

export async function reserverStock(produitId: string, quantite: number, commandeId: string, description: string): Promise<ReservationResult> {
  let tentative = 0
  while (tentative < MAX_TENTATIVES) {
    tentative++
    const stock = await prisma.stock.findUnique({ where: { produitId }, include: { produit: true } })
    if (!stock) throw { code: 'STOCK_INEXISTANT', message: 'Aucun stock trouvé' } as ErreurStock
    if (!stock.produit.actif) throw { code: 'PRODUIT_INACTIF', message: `Produit "${stock.produit.nom}" indisponible` } as ErreurStock

    const libre = stock.quantiteDisponible - stock.quantiteReservee
    if (libre < quantite) throw { code: 'STOCK_INSUFFISANT', message: `Stock insuffisant pour "${stock.produit.nom}". Disponible : ${libre} ${stock.produit.unite}, demandé : ${quantite}`, dispo: libre, demande: quantite, unite: stock.produit.unite } as ErreurStock

    try {
      const versionLue = stock.version
      const nouvelleVersion = versionLue + 1
      const result = await prisma.$transaction(async tx => {
        const maj = await tx.stock.updateMany({
          where: { produitId, version: versionLue, quantiteDisponible: { gte: stock.quantiteReservee + quantite } },
          data: { quantiteReservee: { increment: quantite }, version: nouvelleVersion },
        })
        if (maj.count === 0) throw new Error('__CONFLIT__')
        await tx.mouvementStock.create({ data: { stockId: stock.id, type: TypeMouvement.RESERVATION, quantite, description, versionApres: nouvelleVersion, commandeId } })
        return { nouvelleVersion, quantiteLibreRestante: libre - quantite }
      })
      return { success: true, ...result }
    } catch (err: any) {
      if (err?.message === '__CONFLIT__' && tentative < MAX_TENTATIVES) {
        await new Promise(r => setTimeout(r, DELAI_BASE_MS * Math.pow(2, tentative - 1)))
        continue
      }
      throw { code: 'CONFLIT_EPUISE', message: `Conflit après ${MAX_TENTATIVES} tentatives. Réessayez.`, tentatives: MAX_TENTATIVES } as ErreurStock
    }
  }
  throw { code: 'CONFLIT_EPUISE', message: 'Erreur inattendue', tentatives: tentative } as ErreurStock
}

export async function libererStock(produitId: string, quantite: number, commandeId: string): Promise<void> {
  const stock = await prisma.stock.findUnique({ where: { produitId } })
  if (!stock) return
  const nouvelleVersion = stock.version + 1
  await prisma.$transaction(async tx => {
    await tx.stock.update({ where: { id: stock.id }, data: { quantiteReservee: { decrement: Math.min(quantite, stock.quantiteReservee) }, version: nouvelleVersion } })
    await tx.mouvementStock.create({ data: { stockId: stock.id, type: TypeMouvement.LIBERATION, quantite, description: 'Libération suite à annulation', versionApres: nouvelleVersion, commandeId } })
  })
}

export async function deduireStockLivraison(produitId: string, quantite: number, commandeId: string): Promise<void> {
  const stock = await prisma.stock.findUnique({ where: { produitId } })
  if (!stock) return
  const nouvelleVersion = stock.version + 1
  await prisma.$transaction(async tx => {
    await tx.stock.update({ where: { id: stock.id }, data: { quantiteDisponible: { decrement: quantite }, quantiteReservee: { decrement: Math.min(quantite, stock.quantiteReservee) }, version: nouvelleVersion } })
    await tx.mouvementStock.create({ data: { stockId: stock.id, type: TypeMouvement.LIVRAISON, quantite, description: 'Livraison effective', versionApres: nouvelleVersion, commandeId } })
  })
}

export async function approvisionnerStock(produitId: string, quantite: number, description?: string): Promise<StockInfo> {
  const stock = await prisma.stock.findUnique({ where: { produitId }, include: { produit: true } })
  if (!stock) throw new Error('Stock introuvable')
  const nouvelleVersion = stock.version + 1
  const updated = await prisma.$transaction(async tx => {
    const s = await tx.stock.update({ where: { id: stock.id }, data: { quantiteDisponible: { increment: quantite }, version: nouvelleVersion }, include: { produit: true } })
    await tx.mouvementStock.create({ data: { stockId: stock.id, type: TypeMouvement.ENTREE, quantite, description: description || 'Approvisionnement', versionApres: nouvelleVersion } })
    return s
  })
  return toStockInfo(updated)
}

function toStockInfo(stock: any): StockInfo {
  const libre = Math.max(0, stock.quantiteDisponible - stock.quantiteReservee)
  return { id: stock.id, produitId: stock.produitId, nomProduit: stock.produit.nom, unite: stock.produit.unite, quantiteDisponible: stock.quantiteDisponible, quantiteReservee: stock.quantiteReservee, quantiteLibre: libre, seuilAlerte: stock.seuilAlerte, enAlerte: libre <= stock.seuilAlerte, version: stock.version }
}
