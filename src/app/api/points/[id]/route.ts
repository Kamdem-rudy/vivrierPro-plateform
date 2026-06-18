// src/app/api/points/[id]/route.ts
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-guard'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const data = await req.json()
    const point = await prisma.pointDistribution.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(point)
  } catch {
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    await prisma.$transaction([
      prisma.pointDistribution.update({ where: { id: params.id }, data: { actif: false } }),
      prisma.chemin.updateMany({
        where: { OR: [{ departPointId: params.id }, { arriveePointId: params.id }] },
        data: { actif: false },
      }),
    ])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
}
