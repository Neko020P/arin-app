import { createActionMemory } from '@/lib/memory'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { characterId, action, characterName } = await req.json()
  if (!characterId || !action) return NextResponse.json({ ok: false })
  await createActionMemory(characterId, action, characterName)
  return NextResponse.json({ ok: true })
}