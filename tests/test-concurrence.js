#!/usr/bin/env node
// tests/test-concurrence.js — Test anti race-condition sur le stock
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v] }))
const NB_UTILISATEURS = parseInt(args.utilisateurs || '10')
const QUANTITE = parseFloat(args.quantite || '100')

const ok = s => `✅ ${s}`
const err = s => `❌ ${s}`

async function main() {
  console.log('\n=== TEST DE CONCURRENCE — VivriérPro ===\n')
  console.log('⚠️  Ce test nécessite un cookie de session valide (ADMIN ou OPERATEUR).')
  console.log('    Connectez-vous d\'abord dans le navigateur et copiez le cookie next-auth.session-token.\n')

  const sessionCookie = process.env.SESSION_COOKIE
  if (!sessionCookie) {
    console.log(err('Variable SESSION_COOKIE manquante. Exemple :'))
    console.log('   SESSION_COOKIE="next-auth.session-token=xxxxx" node tests/test-concurrence.js\n')
    process.exit(1)
  }

  const headers = { 'Content-Type': 'application/json', Cookie: sessionCookie }

  const stocks = await fetch(`${BASE_URL}/api/stock`, { headers }).then(r => r.json())
  const points = await fetch(`${BASE_URL}/api/points`, { headers }).then(r => r.json())
  const produit = stocks.sort((a, b) => b.quantiteLibre - a.quantiteLibre)[0]
  const point = points.find(p => p.actif)

  console.log(`Produit : ${produit.nomProduit} — Stock libre : ${produit.quantiteLibre} ${produit.unite}`)
  console.log(`Lancement de ${NB_UTILISATEURS} commandes simultanées de ${QUANTITE} ${produit.unite} chacune...\n`)

  const promesses = Array.from({ length: NB_UTILISATEURS }, (_, i) =>
    fetch(`${BASE_URL}/api/commandes`, {
      method: 'POST', headers,
      body: JSON.stringify({ pointId: point.id, produitId: produit.produitId, quantite: QUANTITE, forceHoraire: true }),
    }).then(async r => ({ status: r.status, data: await r.json() }))
  )

  const resultats = await Promise.all(promesses)
  const succes = resultats.filter(r => r.status === 201)
  const qteAccordee = succes.length * QUANTITE

  console.log(`Commandes acceptées : ${succes.length}/${NB_UTILISATEURS}`)
  console.log(`Quantité accordée   : ${qteAccordee} ${produit.unite}`)
  console.log(`Stock initial libre : ${produit.quantiteLibre} ${produit.unite}\n`)

  if (qteAccordee > produit.quantiteLibre) {
    console.log(err('DÉPASSEMENT DÉTECTÉ ! Le verrou a échoué.'))
    process.exit(1)
  }
  console.log(ok('Aucun dépassement détecté. Verrouillage optimiste validé.'))
}

main().catch(e => { console.error(err(e.message)); process.exit(1) })
