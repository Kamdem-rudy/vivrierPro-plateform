// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import { Toaster } from '@/components/ui/Toaster'
import SessionProvider from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: 'VivriérPro - Gestion Logistique Alimentaire',
  description: 'Plateforme de gestion de la distribution de produits vivriers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50">
        <SessionProvider>
          <Navbar />
          <main className="pt-16 min-h-screen">{children}</main>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}
