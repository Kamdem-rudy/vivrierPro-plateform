// prisma/seed.ts
import { PrismaClient, TypeVehicule } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed VivriérPro...\n')

  // Entrepôt
  await prisma.entrepot.upsert({ where: { id: 'e-001' }, update: {}, create: { id: 'e-001', nom: 'Entrepôt Central', adresse: 'Zone Industrielle, Abidjan' } })

  // Points de distribution
  const points = [
    { id: 'pd-001', nom: 'Marché Adjamé',     adresse: 'Adjamé, Abidjan' },
    { id: 'pd-002', nom: 'Marché Cocody',      adresse: 'Cocody, Abidjan' },
    { id: 'pd-003', nom: 'Marché Treichville', adresse: 'Treichville, Abidjan' },
    { id: 'pd-004', nom: 'Marché Yopougon',    adresse: 'Yopougon, Abidjan' },
    { id: 'pd-005', nom: 'Marché Marcory',     adresse: 'Marcory, Abidjan' },
  ]
  for (const p of points) await prisma.pointDistribution.upsert({ where: { id: p.id }, update: {}, create: p })

  // Chemins
  const chemins = [
    { id: 'ch-001', departPointId: null,     arriveePointId: 'pd-001', distance: 8.5 },
    { id: 'ch-002', departPointId: null,     arriveePointId: 'pd-002', distance: 12.0 },
    { id: 'ch-003', departPointId: null,     arriveePointId: 'pd-003', distance: 10.0 },
    { id: 'ch-004', departPointId: null,     arriveePointId: 'pd-004', distance: 15.0 },
    { id: 'ch-005', departPointId: null,     arriveePointId: 'pd-005', distance: 14.5 },
    { id: 'ch-006', departPointId: 'pd-001', arriveePointId: 'pd-002', distance: 7.0 },
    { id: 'ch-007', departPointId: 'pd-002', arriveePointId: 'pd-001', distance: 7.0 },
    { id: 'ch-008', departPointId: 'pd-001', arriveePointId: 'pd-004', distance: 9.0 },
    { id: 'ch-009', departPointId: 'pd-004', arriveePointId: 'pd-001', distance: 9.0 },
    { id: 'ch-010', departPointId: 'pd-002', arriveePointId: 'pd-005', distance: 6.5 },
    { id: 'ch-011', departPointId: 'pd-005', arriveePointId: 'pd-002', distance: 6.5 },
    { id: 'ch-012', departPointId: 'pd-003', arriveePointId: 'pd-005', distance: 5.0 },
    { id: 'ch-013', departPointId: 'pd-005', arriveePointId: 'pd-003', distance: 5.0 },
  ]
  for (const c of chemins) await prisma.chemin.upsert({ where: { id: c.id }, update: {}, create: c })

  // Véhicules
  const vehicules = [
    { id: 'v-001', type: TypeVehicule.MOTO,        immatriculation: 'MOTO-001', capacite: 1, vitesse: 40 },
    { id: 'v-002', type: TypeVehicule.MOTO,        immatriculation: 'MOTO-002', capacite: 1, vitesse: 40 },
    { id: 'v-003', type: TypeVehicule.CAMIONNETTE, immatriculation: 'CAM-001',  capacite: 3, vitesse: 30 },
    { id: 'v-004', type: TypeVehicule.CAMIONNETTE, immatriculation: 'CAM-002',  capacite: 3, vitesse: 30 },
    { id: 'v-005', type: TypeVehicule.CAMION,      immatriculation: 'TRK-001',  capacite: 6, vitesse: 25 },
  ]
  for (const v of vehicules) await prisma.vehicule.upsert({ where: { id: v.id }, update: {}, create: v })

  // Produits + Stock
  const produits = [
    { id: 'p-001', nom: 'Riz local',      unite: 'kg',     stock: 5000, seuil: 500 },
    { id: 'p-002', nom: 'Maïs',           unite: 'kg',     stock: 3000, seuil: 300 },
    { id: 'p-003', nom: 'Igname',         unite: 'kg',     stock: 2000, seuil: 200 },
    { id: 'p-004', nom: 'Manioc',         unite: 'kg',     stock: 1500, seuil: 150 },
    { id: 'p-005', nom: 'Plantain',       unite: 'régime', stock: 800,  seuil: 80  },
    { id: 'p-006', nom: 'Huile de palme', unite: 'litre',  stock: 1000, seuil: 100 },
  ]
  for (const p of produits) {
    await prisma.produit.upsert({ where: { id: p.id }, update: {}, create: { id: p.id, nom: p.nom, unite: p.unite } })
    const exist = await prisma.stock.findUnique({ where: { produitId: p.id } })
    if (!exist) {
      const s = await prisma.stock.create({ data: { produitId: p.id, quantiteDisponible: p.stock, seuilAlerte: p.seuil } })
      await prisma.mouvementStock.create({ data: { stockId: s.id, type: 'ENTREE', quantite: p.stock, description: 'Stock initial', versionApres: 0 } })
      console.log(`  📦 ${p.nom.padEnd(18)} ${p.stock} ${p.unite}`)
    }
  }

  // Utilisateurs
  console.log('\n👤 Comptes utilisateurs :')
  const users = [
    { id: 'u-001', nom: 'Administrateur', email: 'admin@vivrierpro.ci',     mdp: 'Admin@2025!',  role: 'ADMIN'     as const },
    { id: 'u-002', nom: 'Jean Koné',      email: 'operateur@vivrierpro.ci', mdp: 'Oper@2025!',   role: 'OPERATEUR' as const },
    { id: 'u-003', nom: 'Kofi Asante',    email: 'chauffeur@vivrierpro.ci', mdp: 'Chauf@2025!',  role: 'CHAUFFEUR' as const },
  ]
  for (const u of users) {
    const hash = await bcrypt.hash(u.mdp, 12)
    await prisma.user.upsert({ where: { id: u.id }, update: {}, create: { id: u.id, nom: u.nom, email: u.email, motDePasse: hash, role: u.role } })
    console.log(`  ${u.role.padEnd(10)} ${u.email}  →  ${u.mdp}`)
  }
  console.log('\n✅ Seed terminé !')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
