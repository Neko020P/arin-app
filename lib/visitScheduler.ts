import { createClient } from '@/lib/supabase/server'

const VISIT_CHANCE: Record<string, number> = {
  stranger: 0.99,
  friend: 0.99,
  rival: 0.99,
}

const VISIT_DURATION = 30 * 1000 // 30 วิ (เทส)

export async function runVisitScheduler(characterId: string) {
  const supabase = await createClient()

  // เช็คว่าตัวละครนี้กำลัง visit อยู่ที่อื่นไหม — ถ้าใช่ ไม่รับแขก
  const { data: outgoing } = await supabase
    .from('character_visits')
    .select('id')
    .eq('visitor_id', characterId)
    .gt('ends_at', new Date().toISOString())
    .maybeSingle()

  if (outgoing) return [] // กำลังออกไปเยี่ยมอยู่ ไม่รับแขก

  // ลบ visit ที่หมดเวลาแล้ว
  await supabase
    .from('character_visits')
    .delete()
    .lt('ends_at', new Date().toISOString())

  // ดึง relationships
  const { data: relationships } = await supabase
    .from('character_relationships')
    .select('*, target:target_id(id, name, room_sprite_url, ref_sheet_url, personality)')
    .eq('character_id', characterId)

  if (!relationships) return []

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

    // เช็คว่า target กำลัง visit อยู่ที่อื่นไหม
    const { data: targetOut } = await supabase
      .from('character_visits')
      .select('id')
      .eq('visitor_id', target.id)
      .gt('ends_at', new Date().toISOString())
      .maybeSingle()

    if (targetOut) continue // target ไม่อยู่บ้าน

    // เช็คว่า target กำลังมาเยี่ยม characterId อยู่ไหม (ป้องกัน cross-visit พร้อมกัน)
    const { data: targetIncoming } = await supabase
      .from('character_visits')
      .select('id')
      .eq('visitor_id', target.id)
      .eq('host_id', characterId)
      .gt('ends_at', new Date().toISOString())
      .maybeSingle()

    if (targetIncoming) continue // target กำลังมาหาเราอยู่ รอก่อน

    // cooldown
    if (rel.last_visit) {
      const diff = Date.now() - new Date(rel.last_visit).getTime()
      if (diff < 15 * 1000) continue
    }

    // สร้าง visit record
    const endsAt = new Date(Date.now() + VISIT_DURATION).toISOString()
    const { error } = await supabase
      .from('character_visits')
      .upsert({
        visitor_id: target.id,
        host_id: characterId,
        ends_at: endsAt,
      }, { onConflict: 'visitor_id' })

    if (error) continue

    // update relationship
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