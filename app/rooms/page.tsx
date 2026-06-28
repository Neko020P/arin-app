// app/rooms/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = {
  title: 'Rooms · ARIN',
  description: 'Browse character rooms from the ARIN community',
}

export default async function RoomsPage() {
  const supabase = await createClient()

  // Fetch all public characters that have a room sprite or bg set
  const { data: characters } = await supabase
    .from('characters')
    .select(`
      id,
      name,
      room_sprite_url,
      room_bg_url,
      room_bg_color,
      personality,
      profiles!characters_owner_id_fkey (
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold dark:text-white">Rooms</h1>
          <p className="text-sm text-gray-400 mt-1">
            Browse character rooms from the community
          </p>
        </div>

        {/* Grid */}
        {!characters || characters.length === 0 ? (
          <div className="border-2 border-dashed border-gray-100 dark:border-white/10 rounded-2xl py-24 text-center">
            <p className="text-gray-400 text-sm">No rooms yet — be the first to create a character!</p>
            <Link
              href="/dashboard/characters"
              className="mt-4 inline-block text-sm text-purple-500 hover:underline"
            >
              Create a character →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {characters.map((c) => {
              const owner = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles as any
              return (
                <Link
                  key={c.id}
                  href={`/character/${c.id}/room`}
                  className="group rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500/40 transition-colors shadow-sm hover:shadow-md"
                >
                  {/* Room preview */}
                  <div
                    className="relative h-36 flex items-end justify-center overflow-hidden"
                    style={{ backgroundColor: c.room_bg_color ?? '#302b63' }}
                  >
                    {c.room_bg_url && (
                      <img
                        src={c.room_bg_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                      />
                    )}
                    {c.room_sprite_url ? (
                      <img
                        src={c.room_sprite_url}
                        alt={c.name}
                        className="relative z-10 h-24 object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="relative z-10 w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl mb-2">
                        🐾
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 bg-white dark:bg-gray-900">
                    <p className="text-sm font-semibold truncate dark:text-white">{c.name}</p>
                    {owner && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {owner.avatar_url ? (
                          <img
                            src={owner.avatar_url}
                            alt={owner.display_name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-[10px] text-purple-500">
                            {(owner.display_name ?? owner.username)?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-gray-400 truncate">
                          {owner.display_name || owner.username}
                        </span>
                      </div>
                    )}
                    {c.personality && (
                      <span className="mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-400 capitalize">
                        {c.personality}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}