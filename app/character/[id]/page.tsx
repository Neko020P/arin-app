import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default async function PublicCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // ดึง character เฉพาะที่ public
  const { data: character } = await supabase
    .from('characters')
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (!character) notFound()

  const owner = character.profiles as {
    id: string
    username: string
    display_name: string
    avatar_url: string
  }

  // ดึง artworks ที่มี character นี้
  const { data: artworkRows } = await supabase
    .from('artwork_characters')
    .select('artworks(id, title, image_url, is_nsfw)')
    .eq('character_id', id)

  const artworks = artworkRows
    ?.map((r: any) => r.artworks)
    .filter(Boolean) ?? []

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Character Header */}
        <div className="flex flex-col md:flex-row gap-6 items-start">

          {/* Ref Sheet */}
          {character.ref_sheet_url ? (
            <img
              src={character.ref_sheet_url}
              alt={character.name}
              className="w-40 h-40 rounded-2xl object-cover shrink-0"
            />
          ) : (
            <div className="w-40 h-40 rounded-2xl bg-purple-50 flex items-center justify-center text-6xl shrink-0">
              🎨
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-medium mb-2">{character.name}</h1>

            {/* Tags */}
            {character.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {character.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-xs bg-purple-50 text-purple-500 px-3 py-1 rounded-full border border-purple-100"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Owner */}
            <Link
              href={`/profile/${owner.username}`}
              className="inline-flex items-center gap-2.5 group mb-4"
            >
              {owner.avatar_url ? (
                <img
                  src={owner.avatar_url}
                  alt={owner.display_name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm text-purple-400 font-medium">
                  {owner.display_name?.[0] ?? owner.username[0]}
                </div>
              )}
              <div>
                <p className="text-sm font-medium group-hover:text-purple-600 transition-colors">
                  {owner.display_name || owner.username}
                </p>
                <p className="text-xs text-gray-400">Character owner</p>
              </div>
            </Link>

            {/* Room button */}
            <div>
              <Link
                href={`/character/${character.id}/room`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-full hover:bg-purple-700 transition-colors"
              >
                Room
              </Link>
            </div>
          </div>
        </div>

        {/* Lore */}
        {character.lore && (
          <div className="bg-gray-50 rounded-2xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
              Lore
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {character.lore}
            </p>
          </div>
        )}

        {/* Artworks */}
        {artworks.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
              ปรากฏใน {artworks.length} ผลงาน
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {artworks.map((artwork: any) => (
                <Link
                  key={artwork.id}
                  href={`/artwork/${artwork.id}`}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                >
                  <Image
                    src={artwork.image_url}
                    alt={artwork.title}
                    fill
                    className={`object-cover transition-transform group-hover:scale-105 ${artwork.is_nsfw ? 'blur-xl' : ''
                      }`}
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                  {artwork.is_nsfw && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs bg-black/60 text-white px-3 py-1 rounded-full">
                        NSFW
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end p-3 opacity-0 group-hover:opacity-100">
                    <p className="text-white text-xs truncate">{artwork.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ถ้ายังไม่มี artwork */}
        {artworks.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl py-12 text-center">
            <p className="text-gray-400 text-sm">ยังไม่มีผลงานที่มี character นี้</p>
          </div>
        )}

      </div>
    </main>
  )
}