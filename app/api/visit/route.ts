import { createClient } from '@/lib/supabase/server'
import { runVisitScheduler } from '@/lib/visitScheduler'
import { NextRequest, NextResponse } from 'next/server'
import { createMemory } from '@/lib/memory'

export async function POST(req: NextRequest) {
  const { characterId } = await req.json()
  if (!characterId) return NextResponse.json({ visitors: [] })

  const visitors = await runVisitScheduler(characterId)
  console.log('visitors from scheduler:', JSON.stringify(visitors))
  return NextResponse.json({ visitors })
}