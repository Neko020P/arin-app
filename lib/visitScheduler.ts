import { createClient } from '@/lib/supabase/server'
import { createVisitMemory } from '@/lib/memory'
import { applySocialBoost } from '@/lib/stats'

const VISIT_CHANCE: Record<string, number> = {
  stranger: 0.99,
  friend: 0.99,
  rival: 0.99,
}

const VISIT_DURATION = 30 * 1000

export async function runVisitScheduler(characterId: string) {
  const supabase = await createClient()

  const { data: outgoing } = await supabase
    .from('character_visits')
    .select('id')
    .eq('visitor_id', characterId)
    .gt('ends_at', new Date().toISOString())
    .maybeSingle()

  if (outgoing) return []

  await supabase
    .from('character_visits')
    .delete()
    .lt('ends_at', new Date().toISOString())

  const { data: relationships } = await supabase
    .from('character_relationships')
    .select('*, target:target_id(id, name, room_sprite_url, ref_sheet_url, personality)')
    .eq('character_id', characterId)

  if (!relationships) return []

  const { data: hostCharacter } = await supabase
    .from('characters')
    .select('id, name')
    .eq('id', characterId)
    .single()

  if (!hostCharacter) return []

  const visitors: {
    characterId: string
    name: string
    spriteUrl: string
    personality: string
    tier: string
  }[] = []

  for (const rel of relationships) {
    const chance = VISIT_CHANCE[rel.tier] ?? 0.10
    if (Math.random() > chance) continue

    const target = rel.target as any
    if (!target) continue

    const { data: targetOut } = await supabase
      .from('character_visits')
      .select('id')
      .eq('visitor_id', target.id)
      .gt('ends_at', new Date().toISOString())
      .maybeSingle()

    if (targetOut) continue

    const { data: targetIncoming } = await supabase
      .from('character_visits')
      .select('id')
      .eq('visitor_id', target.id)
      .eq('host_id', characterId)
      .gt('ends_at', new Date().toISOString())
      .maybeSingle()

    if (targetIncoming) continue

    if (rel.last_visit) {
      const diff = Date.now() - new Date(rel.last_visit).getTime()
      if (diff < 15 * 1000) continue
    }

    const endsAt = new Date(Date.now() + VISIT_DURATION).toISOString()

    // insert แทน upsert — ถ้ามี visit อยู่แล้วจะ error → ข้ามไป
    const { error: insertError } = await supabase
      .from('character_visits')
      .insert({
        visitor_id: target.id,
        host_id: characterId,
        ends_at: endsAt,
      })

    if (insertError) continue

    // boost social ของ host เมื่อมี visitor
    const { data: hostStats } = await supabase
      .from('character_stats')
      .select('*')
      .eq('character_id', characterId)
      .single()

    if (hostStats) {
      const boosted = applySocialBoost({
        hunger: hostStats.hunger,
        happiness: hostStats.happiness,
        energy: hostStats.energy,
        social: hostStats.social ?? 80,
      }, rel.tier)

      await supabase
        .from('character_stats')
        .update({
          social: Math.round(boosted.social),
          happiness: Math.round(boosted.happiness),
          last_updated: new Date().toISOString(),
        })
        .eq('character_id', characterId)
    }

    // insert สำเร็จ = visit ใหม่ → สร้าง memory
    await createVisitMemory(
      characterId,
      hostCharacter.name,
      target.id,
      target.name,
      rel.tier,
    )

    const newCount = rel.visit_count + 1
    let newTier = rel.tier
    if (rel.tier === 'stranger' && newCount >= 3) newTier = 'friend'
    else if (rel.tier === 'friend' && newCount >= 10) {
      newTier = Math.random() < 0.5 ? 'friend' : 'rival'
    }

    await supabase
      .from('character_relationships')
      .update({
        visit_count: newCount,
        last_visit: new Date().toISOString(),
        tier: newTier,
      })
      .eq('id', rel.id)

    visitors.push({
      characterId: target.id,
      name: target.name,
      spriteUrl: target.room_sprite_url ?? target.ref_sheet_url ?? '',
      personality: target.personality ?? 'friendly',
      tier: rel.tier,
    })
  }

  return visitors
}