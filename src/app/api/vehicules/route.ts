// src/app/api/vehicules/route.ts
import { prisma } from '@/lib/prisma'
import { requireAdmin, requireAny } from '@/lib/api-guard'
import { NextRequest, NextResponse } from 'next/server'
import { TypeVehicule } from '@prisma/client'

const VITESSES: Record<TypeVehicule, number> = { MOTO: 40, CAMIONNETTE: 30, CAMION: 25 }
const CAPACITES: Record<TypeVehicule, number> = { MOTO: 1, CAMIONNETTE: 3, CAMION: 6 }

export async function GET() {
  const auth = await requireAny()
  if (auth instanceof NextResponse) return auth
  try {
    const vehicules = await prisma.vehicule.findMany({
      orderBy: [{ type: 'asc' }, { immatriculation: 'asc' }],
      include: { _count: { select: { livraisons: true } } },
    })
    return NextResponse.json(vehicules)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const { type, immatriculation } = await req.json()
    if (!type || !immatriculation?.trim()) {
      return NextResponse.json({ error: 'Type et immatriculation requis' }, { status: 400 })
    }
    const vehicule = await prisma.vehicule.create({
      data: {
        type: type as TypeVehicule,
        immatriculation: immatriculation.toUpperCase().trim(),
        vitesse: VITESSES[type as TypeVehicule],
        capacite: CAPACITES[type as TypeVehicule],
      },
    })
    return NextResponse.json(vehicule, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Immatriculation déjà utilisée' }, { status: 409 })
    return NextResponse.json({ error: 'Erreur création' }, { status: 500 })
  }
}
