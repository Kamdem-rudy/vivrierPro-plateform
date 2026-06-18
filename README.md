# 🌾 VivriérPro — Plateforme de Distribution de Produits Vivriers

Plateforme logistique avec optimisation d'itinéraires (Dijkstra), gestion de stock anti-concurrence, et authentification par rôles.

## 🔐 Audit de sécurité — Ce qui a été corrigé

| Faille avant | Correction appliquée |
|---|---|
| API routes sans vérification d'auth | `src/lib/api-guard.ts` vérifie la session sur **chaque** route |
| `/api/admin/*` accessible à tous | `requireAdmin()` bloque sauf rôle ADMIN |
| Pas de protection brute-force sur login | `src/lib/rate-limit.ts` — 5 tentatives / 15 min par IP |
| Logs Prisma en production (fuite de données) | `log` désactivé sauf en dev dans `src/lib/prisma.ts` |
| Pas de headers de sécurité HTTP | CSP, X-Frame-Options, HSTS dans `next.config.js` |
| `authOptions` exporté depuis `route.ts` (erreur build) | Déplacé dans `src/lib/auth.ts` |
| Mots de passe en clair | Hashés avec bcrypt (12 rounds) |
| Timing attack sur login | Délai constant + hash fallback même si user inexistant |

## 🎭 Matrice des rôles

| Route / Action | ADMIN | OPERATEUR | CHAUFFEUR |
|---|---|---|---|
| Voir dashboard | ✅ | ✅ | ✅ |
| Créer/gérer commandes | ✅ | ✅ | ❌ |
| Voir/gérer livraisons | ✅ | ✅ | ✅ (lecture) |
| Forcer commande hors-fenêtre | ✅ | ❌ | ❌ |
| Page Administration | ✅ | ❌ | ❌ |
| Gérer points/chemins/véhicules | ✅ | ❌ | ❌ |
| Approvisionner le stock | ✅ | ❌ | ❌ |

## 🚀 Installation

```bash
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

## 🌐 Déploiement Supabase + Vercel

### 1. Supabase — récupérer les 2 URLs

```
Project Settings → Database → Connection pooling   → DATABASE_URL (port 6543)
Project Settings → Database → Connection string    → DIRECT_URL   (port 5432)
```

### 2. Variables d'environnement Vercel

```
DATABASE_URL    = postgresql://postgres.xxx:pwd@xxx.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL      = postgresql://postgres.xxx:pwd@xxx.supabase.com:5432/postgres
NEXTAUTH_SECRET = (généré avec: openssl rand -base64 32)
NEXTAUTH_URL    = https://votre-app.vercel.app
```

### 3. Déployer

```bash
git push
# Vercel build automatiquement avec : prisma generate && next build
```

## 👤 Comptes créés par défaut (à changer en prod !)

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@vivrierpro.ci | Admin@2025! |
| Opérateur | operateur@vivrierpro.ci | Oper@2025! |
| Chauffeur | chauffeur@vivrierpro.ci | Chauf@2025! |

> ⚠️ **Changez ces mots de passe immédiatement après le premier déploiement en production.**

## ✅ Checklist avant mise en ligne publique

- [ ] Mots de passe par défaut changés
- [ ] `NEXTAUTH_SECRET` régénéré (pas celui de l'exemple)
- [ ] `NEXTAUTH_URL` pointant vers le vrai domaine HTTPS
- [ ] Variables Supabase configurées sur Vercel (pas dans le code)
- [ ] `.env` n'est PAS commité sur Git (vérifier `.gitignore`)
- [ ] Test de concurrence exécuté avec succès
- [ ] HTTPS actif (automatique sur Vercel)

## 🧪 Tester la protection anti-concurrence

```bash
# 1. Se connecter dans le navigateur, copier le cookie de session
# 2. Lancer :
SESSION_COOKIE="next-auth.session-token=xxx" node tests/test-concurrence.js --utilisateurs=10 --quantite=100
```

## 📁 Architecture sécurité

```
middleware.ts                    ← Protège les PAGES par rôle
src/lib/auth.ts                  ← Configuration NextAuth (bcrypt, JWT)
src/lib/api-guard.ts             ← Protège les API ROUTES (requireAuth, requireAdmin...)
src/lib/rate-limit.ts            ← Anti brute-force sur /api/auth
src/lib/stock.ts                 ← Verrouillage optimiste (anti race-condition)
next.config.js                   ← Headers HTTP sécurisés (CSP, HSTS...)
```
