import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import CharacterActions from './CharacterActions'

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/profile/edit')

  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .eq('owner_id', profile.id)
    .single()

  if (!character) notFound()

  // ดึง artworks ที่ feature character นี้
  const { data: artworks } = await supabase
    .from('artwork_characters')
    .select('artworks(id, title, image_url)')
    .eq('character_id', id)

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        <Link
          href="/dashboard/characters"
          className="text-sm text-gray-400 hover:text-gray-600 w-fit"
        >
          ← Back to Characters
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-5">
            {character.ref_sheet_url ? (
              <img
                src={character.ref_sheet_url}
                alt={character.name}
                className="w-24 h-24 rounded-2xl object-cover shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-purple-50 flex items-center justify-center text-4xl shrink-0">
                🎨
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-medium">{character.name}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full ${
                  character.is_public
                    ? 'bg-green-50 text-green-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {character.is_public ? 'Public' : 'Private'}
                </span>
              </div>

              {character.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {character.tags.map((tag: string) => (
                    <span key={tag} className="text-xs bg-purple-50 text-purple-400 px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400">
                Created on {new Date(character.created_at).toLocaleDateString('en-EN', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Lore */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-medium mb-4">Lore</h2>
          {character.lore ? (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {character.lore}
            </p>
          ) : (
            <p className="text-sm text-gray-300">No lore available - Edit to add lore</p>
          )}
        </div>

        {/* Artworks ที่มี character นี้ */}
        {artworks && artworks.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-medium mb-4">Appears in {artworks.length} artworks</h2>
            <div className="grid grid-cols-4 gap-2">
              {artworks.map((row: any) => {
                const artwork = row.artworks
                if (!artwork) return null
                return (
                  <Link
                    key={artwork.id}
                    href={`/artwork/${artwork.id}`}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                  >
                    <img
                      src={artwork.image_url}
                      alt={artwork.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <CharacterActions characterId={character.id} isPublic={character.is_public} />

      </div>
    </main>
  )
}