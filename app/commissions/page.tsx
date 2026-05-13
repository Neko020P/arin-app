import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ExploreCommissionsPage() {
  const supabase = await createClient()

  const { data: listings } = await supabase
    .from('commissions')
    .select(`
      id,
      title,
      description,
      price,
      currency,
      turnaround_days,
      slots,
      is_open,
      profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('is_open', true)
    .order('created_at', { ascending: false })

  // ดึง artwork ล่าสุดของแต่ละ artist มาแสดงเป็น thumbnail
  const artistIds = [...new Set(listings?.map((l: any) => l.profiles?.id).filter(Boolean))]

  const { data: artworks } = artistIds.length
    ? await supabase
        .from('artworks')
        .select('id, image_url, artist_id')
        .in('artist_id', artistIds)
        .eq('status', 'published')
        .eq('is_nsfw', false)
        .order('created_at', { ascending: false })
    : { data: [] }

  // map artist_id → artwork ล่าสุด
  const latestArtwork: Record<string, string> = {}
  artworks?.forEach(a => {
    if (!latestArtwork[a.artist_id]) {
      latestArtwork[a.artist_id] = a.image_url
    }
  })

  const openCount = listings?.length ?? 0

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-medium mb-2">Explore Commissions</h1>
          <p className="text-gray-500 text-sm">
            {openCount > 0
              ? `${openCount} listing เปิดรับอยู่ตอนนี้`
              : 'ยังไม่มี listing ที่เปิดรับ'
            }
          </p>
        </div>

        {/* Grid */}
        {listings && listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((l: any) => {
              const artist = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles
              const thumb = artist ? latestArtwork[artist.id] : null

              return (
                <Link
                  key={l.id}
                  href={`/commission/${l.id}`}
                  className="group bg-white border rounded-2xl overflow-hidden hover:border-purple-300 hover:shadow-md transition-all"
                >
                  {/* Artwork thumbnail */}
                  <div className="relative h-40 bg-gray-100 overflow-hidden">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={l.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🎨
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="text-xs bg-green-500 text-white px-2.5 py-1 rounded-full">
                        Open
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">

                    {/* Artist */}
                    {artist && (
                      <div className="flex items-center gap-2 mb-3">
                        {artist.avatar_url ? (
                          <img
                            src={artist.avatar_url}
                            alt={artist.display_name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs text-purple-400 font-medium">
                            {artist.display_name?.[0] ?? artist.username[0]}
                          </div>
                        )}
                        <span className="text-xs text-gray-500">
                          {artist.display_name || artist.username}
                        </span>
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="font-medium mb-1 group-hover:text-purple-600 transition-colors line-clamp-1">
                      {l.title}
                    </h2>

                    {/* Description */}
                    {l.description && (
                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">
                        {l.description}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-sm font-medium text-purple-600">
                        {l.price
                          ? `${l.currency ?? 'USD'} ${l.price}`
                          : 'ติดต่อสอบถาม'
                        }
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {l.turnaround_days && (
                          <span>{l.turnaround_days} วัน</span>
                        )}
                        {l.slots > 0 && (
                          <span>{l.slots} slots</span>
                        )}
                      </div>
                    </div>

                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="py-24 text-center">
            <p className="text-4xl mb-4">🎨</p>
            <p className="text-gray-400">ยังไม่มี commission listing ที่เปิดรับอยู่</p>
          </div>
        )}

      </div>
    </main>
  )
}