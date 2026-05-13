import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import OrderForm from './OrderForm'

export default async function PublicCommissionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // ดึง listing พร้อม profile ของ artist
  const { data: listing } = await supabase
    .from('commissions')
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url,
        bio
      )
    `)
    .eq('id', id)
    .single()

  if (!listing) notFound()

  const artist = listing.profiles as {
    id: string
    username: string
    display_name: string
    avatar_url: string
    bio: string
  }

  // ดึง characters ของ artist เพื่อให้ลูกค้าเลือก
  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, ref_sheet_url')
    .eq('owner_id', artist.id)
    .eq('is_public', true)
    .order('name')

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

          {/* Left — Listing Info */}
          <div className="flex flex-col gap-6">

            {/* Artist */}
            <Link
              href={`/profile/${artist.username}`}
              className="flex items-center gap-3 group w-fit"
            >
              {artist.avatar_url ? (
                <img
                  src={artist.avatar_url}
                  alt={artist.display_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-400 font-medium">
                  {artist.display_name?.[0] ?? artist.username[0]}
                </div>
              )}
              <div>
                <p className="text-sm font-medium group-hover:text-purple-600 transition-colors">
                  {artist.display_name || artist.username}
                </p>
                <p className="text-xs text-gray-400">@{artist.username}</p>
              </div>
            </Link>

            {/* Title + Status */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-medium">{listing.title}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${
                  listing.is_open
                    ? 'bg-green-50 text-green-600'
                    : 'bg-red-50 text-red-400'
                }`}>
                  {listing.is_open ? 'Open' : 'Closed'}
                </span>
              </div>

              {listing.description && (
                <p className="text-gray-600 text-sm leading-relaxed">
                  {listing.description}
                </p>
              )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">ราคาเริ่มต้น</p>
                <p className="font-medium">
                  {listing.price
                    ? `${listing.currency ?? 'USD'} ${listing.price}`
                    : 'ติดต่อสอบถาม'
                  }
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">ระยะเวลา</p>
                <p className="font-medium">
                  {listing.turnaround_days
                    ? `${listing.turnaround_days} วัน`
                    : '—'
                  }
                </p>
              </div>
              {listing.slots > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Slots ที่เปิด</p>
                  <p className="font-medium">{listing.slots} slots</p>
                </div>
              )}
            </div>

            {/* TOS */}
            {listing.tos && (
              <div className="border rounded-xl p-4">
                <h2 className="text-sm font-medium mb-2">Terms of Service</h2>
                <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">
                  {listing.tos}
                </p>
              </div>
            )}

            {/* Characters ที่ artist มี */}
            {characters && characters.length > 0 && (
              <div>
                <h2 className="text-sm font-medium mb-3">
                  Characters ของ {artist.display_name || artist.username}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {characters.map(c => (
                    <Link
                      key={c.id}
                      href={`/character/${c.id}`}
                      target="_blank"
                      className="flex items-center gap-2 border rounded-xl px-3 py-2 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      {c.ref_sheet_url ? (
                        <img
                          src={c.ref_sheet_url}
                          alt={c.name}
                          className="w-6 h-6 rounded-md object-cover"
                        />
                      ) : (
                        <span className="text-sm">🎨</span>
                      )}
                      <span className="text-xs font-medium">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right — Order Form */}
          <div>
            {listing.is_open ? (
              <div className="bg-white border rounded-2xl p-6 sticky top-6">
                <h2 className="font-medium mb-5">สั่ง Commission นี้</h2>
                <OrderForm
                  commissionId={listing.id}
                  artistId={artist.id}
                  basePrice={listing.price}
                  currency={listing.currency ?? 'USD'}
                />
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed rounded-2xl p-8 text-center">
                <p className="text-2xl mb-3">🔴</p>
                <p className="font-medium text-gray-600 mb-1">ปิดรับ Commission</p>
                <p className="text-sm text-gray-400">
                  artist ยังไม่เปิดรับงานในขณะนี้
                </p>
                <Link
                  href={`/profile/${artist.username}`}
                  className="inline-block mt-4 text-sm text-purple-600 hover:underline"
                >
                  ดูโปรไฟล์ {artist.display_name || artist.username}
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  )
}