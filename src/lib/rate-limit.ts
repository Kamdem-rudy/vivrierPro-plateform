// src/lib/rate-limit.ts
// Protection brute force sur les endpoints sensibles (login)
// Stockage en mémoire (suffisant pour 1 instance, Vercel serverless OK)

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

/**
 * Vérifie si l'IP a dépassé la limite de requêtes.
 * @param key      Identifiant (IP, email...)
 * @param limit    Nombre max de tentatives
 * @param windowMs Fenêtre de temps en ms
 */
export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000  // 15 minutes par défaut
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // Première tentative ou fenêtre expirée
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  entry.count++

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

// Nettoyage périodique pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000)
