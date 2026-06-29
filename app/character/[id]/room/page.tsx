//page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RoomClient from './RoomClient'
import CopyRoomLink from './CopyRoomLink'
import { calcCurrentStats } from '@/lib/stats'

// บังคับให้หน้านี้ fetch ข้อมูลใหม่ทุกครั้ง ไม่ cache
// (ถ้าไม่มีบรรทัดนี้ Next.js อาจ cache zones/stats เก่าไว้แล้ว refresh ไม่เห็นค่าใหม่)
export const dynamic = 'force-dynamic'

export default async function CharacterRoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('*, profiles(id, username, user_id)')
    .eq('id', id)
    .single()

  if (!character) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const owner = Array.isArray(character.profiles)
    ? character.profiles[0]
    : character.profiles
  const isOwner = user?.id === owner?.user_id

  const spriteUrl = character.room_sprite_url || character.ref_sheet_url

  let { data: stats } = await supabase
    .from('character_stats')
    .select('*')
    .eq('character_id', id)
    .single()

  if (!stats) {
    const { data: newStats } = await supabase
      .from('character_stats')
      .insert({ character_id: id })
      .select()
      .single()
    stats = newStats
  }

  // Compute how much stats have decayed since last_updated, then immediately
  // write the result back to the DB. This ensures the DB is always in sync
  // with what the client sees — no drift possible on first load.
  if (stats) {
    const decayed = calcCurrentStats(stats, stats.last_updated)
    const now = new Date().toISOString()

    await supabase
      .from('character_stats')
      .update({
        hunger: Math.round(decayed.hunger),
        happiness: Math.round(decayed.happiness),
        energy: Math.round(decayed.energy),
        social: Math.round(decayed.social),
        last_updated: now,
      })
      .eq('character_id', id)

    // Pass the already-decayed values with last_updated = now to the client.
    // RoomClient receives stats that are current as of this moment, so
    // calcCurrentStats on the client will compute ~0 elapsed hours and show
    // the same values the DB just stored.
    stats = { ...stats, ...decayed, last_updated: now }
  }

  const { data: zones } = await supabase
    .from('room_zones')
    .select('*')
    .eq('character_id', id)

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <Link href={`/character/${id}`}
          className="text-sm text-white/50 hover:text-white transition-colors">
          ← {character.name}
        </Link>
        <span className="text-sm text-white/70 font-medium">
          {character.name}'s Room
        </span>
        <CopyRoomLink characterId={id} />
      </div>

      <RoomClient
        characterId={id}
        characterName={character.name}
        spriteUrl={spriteUrl}
        bgUrl={character.room_bg_url ?? null}
        initialStats={stats}
        initialZones={zones ?? []}
        initialCharacter={character}
        isOwner={isOwner}
        currentBgUrl={character.room_bg_url ?? null}
        currentSpriteUrl={character.room_sprite_url ?? null}
      />
    </main>
  )
}