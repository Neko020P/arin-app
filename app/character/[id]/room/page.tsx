//page.tsx 
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RoomClient from './RoomClient'
import CopyRoomLink from './CopyRoomLink'

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
// import { createClient } from '@/lib/supabase/server'
// import { notFound } from 'next/navigation'
// import Link from 'next/link'
// import RoomClient from './RoomClient'

// export default async function CharacterRoomPage({
//   params,
// }: {
//   params: Promise<{ id: string }>
// }) {
//   const { id } = await params
//   const supabase = await createClient()

//   const { data: character } = await supabase
//     .from('characters')
//     .select('*, profiles(id, username, user_id)')
//     .eq('id', id)
//     .single()

//   if (!character) notFound()

//   const { data: { user } } = await supabase.auth.getUser()
//   const owner = Array.isArray(character.profiles)
//     ? character.profiles[0]
//     : character.profiles
//   const isOwner = user?.id === owner?.user_id

//   const spriteUrl = character.room_sprite_url || character.ref_sheet_url

//   // fetch stats หรือสร้างใหม่ถ้ายังไม่มี
//   let { data: stats } = await supabase
//     .from('character_stats')
//     .select('*')
//     .eq('character_id', id)
//     .single()

//   if (!stats) {
//     const { data: newStats } = await supabase
//       .from('character_stats')
//       .insert({ character_id: id })
//       .select()
//       .single()
//     stats = newStats
//   }

//   return (
//     <main className="min-h-screen bg-gray-950 flex flex-col">
//       <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
//         <Link href={`/character/${id}`}
//           className="text-sm text-white/50 hover:text-white transition-colors">
//           ← {character.name}
//         </Link>
//         <span className="text-sm text-white/70 font-medium">
//           {character.name}'s Room
//         </span>
//         <div className="w-20" />
//       </div>

//       {/* โยนทุกอย่างลง RoomClient */}
//       <RoomClient
//         characterId={id}
//         spriteUrl={spriteUrl}
//         bgUrl={character.room_bg_url ?? null}
//         initialStats={stats}
//         isOwner={isOwner}
//         currentBgUrl={character.room_bg_url ?? null}
//         currentSpriteUrl={character.room_sprite_url ?? null}
//       />
//     </main>
//   )
// }
