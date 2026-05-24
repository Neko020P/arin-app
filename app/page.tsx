import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'

export default async function LandingPage() {
  const supabase = await createClient()

  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, title, image_url, profiles(username, display_name, avatar_url)')
    .eq('status', 'published')
    .eq('is_nsfw', false)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">

      {/* Hero — compact */}
      <section className="max-w-2xl mx-auto px-4 pt-16 pb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight mb-4 dark:text-white">
          Your Character<br />
          <span className="text-purple-500">Your World</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Portfolio · Commission · Character Lore — all in one place.
        </p>
        <div className="flex items-center justify-center gap-3">
          {!user && (
            <Link href="/signup"
              className="bg-purple-600 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-purple-700 transition-colors">
              Start for Free
            </Link>
          )}
          <Link href="/commissions"
            className="border dark:border-white/20 px-5 py-2.5 rounded-full text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            View Commissions
          </Link>
        </div>
      </section>

      {/* Masonry Gallery */}
      {artworks && artworks.length > 0 && (
        <section className="px-4 pb-20 max-w-7xl mx-auto">
          <div className="columns-2 sm:columns-2 md:columns-3 lg:columns-3 gap-4 space-y-4">
            {artworks.map(artwork => {
              const artist = artwork.profiles as unknown as {
                username: string
                display_name: string | null
                avatar_url: string | null
              } | null

              return (
                <Link
                  key={artwork.id}
                  href={`/artwork/${artwork.id}`}
                  className="group block break-inside-avoid rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 relative"
                >
                  <img
                    src={artwork.image_url}
                    alt={artwork.title}
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                    <p className="text-white text-xs font-semibold truncate">{artwork.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {artist?.avatar_url && (
                        <img src={artist.avatar_url}
                          className="w-4 h-4 rounded-full object-cover" />
                      )}
                      <p className="text-white/70 text-xs">@{artist?.username ?? ''}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* CTA */}
      {!user && (
        <section className="bg-purple-600 py-16 px-4 text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">Ready to jump in?</h2>
          <p className="text-purple-200 text-sm mb-6">Join free and start building your character's world.</p>
          <Link href="/signup"
            className="bg-white text-purple-600 px-7 py-2.5 rounded-full text-sm font-medium hover:bg-purple-50 transition-colors inline-block">
            Sign Up for Free
          </Link>
        </section>
      )}

    </main>
  )
}