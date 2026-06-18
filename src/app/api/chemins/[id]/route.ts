// src/app/api/chemins/[id]/route.ts
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-guard'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    await prisma.chemin.update({ where: { id: params.id }, data: { actif: false } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
}
