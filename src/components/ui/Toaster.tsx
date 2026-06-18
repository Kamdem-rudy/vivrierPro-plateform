'use client'
// src/components/ui/Toaster.tsx
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error'
interface Toast { id: string; message: string; type: ToastType }

let addToastFn: ((msg: string, type: ToastType) => void) | null = null
export function toast(message: string, type: ToastType = 'success') { addToastFn?.(message, type) }

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = Math.random().toString(36).slice(2)
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
    }
    return () => { addToastFn = null }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={cn('flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-slide-up bg-white',
          t.type === 'success' ? 'border-green-200 text-green-800' : 'border-red-200 text-red-800')}>
          {t.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
          <span>{t.message}</span>
          <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="ml-2 opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
