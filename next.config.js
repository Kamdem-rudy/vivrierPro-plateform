/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },

  // ── En-têtes de sécurité HTTP ──────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Empêche l'embarquement dans une iframe (clickjacking)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Empêche le navigateur de deviner le type MIME
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer minimal pour la confidentialité
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions minimales (caméra, micro, géoloc désactivés)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Force HTTPS pendant 1 an (activer seulement en prod)
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",   // unsafe-eval requis par Next.js dev
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
