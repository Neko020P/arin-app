import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RoomCanvas from './RoomCanvas'
import RoomEditor from './RoomEditor'

export default async function CharacterRoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('*, profiles(id, username, display_name, user_id)')
    .eq('id', id)
    .single()

  if (!character) notFound()

  // เช็คว่าเป็นเจ้าของไหม
  const { data: { user } } = await supabase.auth.getUser()
  const owner = Array.isArray(character.profiles)
    ? character.profiles[0]
    : character.profiles
  const isOwner = user?.id === owner?.user_id

  // sprite ใช้ room_sprite_url ถ้ามี ไม่งั้น fallback ref_sheet_url
  const spriteUrl = character.room_sprite_url || character.ref_sheet_url

  if (!spriteUrl) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🎨</p>
          <h1 className="text-xl font-medium mb-2">{character.name} ยังไม่มีรูป</h1>
          <p className="text-sm text-gray-400 mb-4">
            ต้องใส่ ref sheet ก่อนถึงจะเปิด room ได้
          </p>
          {isOwner && (
            <Link
              href={`/dashboard/characters/${id}/edit`}
              className="text-sm text-purple-600 hover:underline"
            >
              ใส่ ref sheet →
            </Link>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <Link
          href={`/character/${id}`}
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          ← {character.name}
        </Link>
        <span className="text-sm text-white/70 font-medium">
          {character.name}'s Room
        </span>
        <div className="w-20" />
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-4">
        <RoomCanvas
          spriteUrl={spriteUrl}
          bgUrl={character.room_bg_url ?? null}
        />
      </div>

      {/* Editor — เฉพาะเจ้าของ */}
      {isOwner && (
        <div className="border-t border-white/10 p-4">
          <RoomEditor
            characterId={id}
            currentBgUrl={character.room_bg_url ?? null}
            currentSpriteUrl={character.room_sprite_url ?? null}
          />
        </div>
      )}

    </main>
  )
}