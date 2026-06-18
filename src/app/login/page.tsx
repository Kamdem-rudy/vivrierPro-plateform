'use client'
// src/app/login/page.tsx
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Wheat, Eye, EyeOff, LogIn, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [showMdp, setShowMdp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !motDePasse) { setErreur('Veuillez remplir tous les champs'); return }
    setLoading(true)
    setErreur('')

    const result = await signIn('credentials', { email: email.toLowerCase().trim(), motDePasse, redirect: false })

    if (result?.error) {
      setErreur('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-500 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-green-600 rounded-2xl mb-3 shadow-lg"><Wheat className="h-8 w-8 text-white" /></div>
            <h1 className="text-2xl font-bold text-slate-900">Vivrier<span className="text-green-600">Pro</span></h1>
            <p className="text-slate-500 text-sm mt-1">Connectez-vous à votre espace</p>
          </div>

          {erreur && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{erreur}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Adresse email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" autoComplete="email" required
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input type={showMdp ? 'text' : 'password'} value={motDePasse} onChange={e => setMotDePasse(e.target.value)} placeholder="••••••••" autoComplete="current-password" required
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                <button type="button" onClick={() => setShowMdp(!showMdp)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showMdp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all',
                loading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-[0.98] shadow-lg shadow-green-600/25')}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Connexion...</> : <><LogIn className="h-4 w-4" />Se connecter</>}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center mb-3">Niveaux d&apos;accès</p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                { role: 'Admin', color: 'bg-red-100 text-red-700', desc: 'Accès total' },
                { role: 'Opérateur', color: 'bg-blue-100 text-blue-700', desc: 'Commandes & livraisons' },
                { role: 'Chauffeur', color: 'bg-green-100 text-green-700', desc: 'Livraisons' },
              ].map(r => (
                <div key={r.role} className="p-2 rounded-lg bg-slate-50">
                  <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1', r.color)}>{r.role}</span>
                  <p className="text-slate-400 leading-tight">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
