'use client'
// src/components/Navbar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ShoppingCart, Truck, Settings, Wheat, Menu, X, LogOut, User, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  OPERATEUR: 'bg-blue-100 text-blue-700',
  CHAUFFEUR: 'bg-green-100 text-green-700',
}
const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', OPERATEUR: 'Opérateur', CHAUFFEUR: 'Chauffeur' }

export default function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const role = (session?.user as any)?.role as string | undefined

  // Ne pas afficher la navbar sur la page de login
  if (pathname === '/login') return null

  const navItems = [
    { href: '/', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['ADMIN', 'OPERATEUR', 'CHAUFFEUR'] },
    { href: '/commandes', label: 'Commandes', icon: ShoppingCart, roles: ['ADMIN', 'OPERATEUR'] },
    { href: '/livraisons', label: 'Livraisons', icon: Truck, roles: ['ADMIN', 'OPERATEUR', 'CHAUFFEUR'] },
    { href: '/admin', label: 'Administration', icon: Settings, roles: ['ADMIN'] },
  ].filter(item => !role || item.roles.includes(role))

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-slate-900">
            <div className="p-1.5 bg-green-600 rounded-lg"><Wheat className="h-5 w-5 text-white" /></div>
            <span className="text-lg">Vivrier<span className="text-green-600">Pro</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === href ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-100')}>
                <Icon className="h-4 w-4" />{label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center">
            {session?.user && (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-green-700" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-none">{session.user.name}</p>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium mt-0.5 inline-block', ROLE_BADGE[role ?? ''] ?? 'bg-slate-100 text-slate-600')}>
                      {ROLE_LABEL[role ?? ''] ?? role}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-400">Connecté en tant que</p>
                      <p className="text-sm font-medium text-slate-800 truncate">{session.user.email}</p>
                    </div>
                    <button onClick={() => signOut({ callbackUrl: '/login' })}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="h-4 w-4" />Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1',
                pathname === href ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-100')}>
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
          {session?.user && (
            <button onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 mt-1 border-t border-slate-100 pt-3">
              <LogOut className="h-4 w-4" />Se déconnecter
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
