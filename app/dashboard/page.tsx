import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ดึง profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/profile/edit')

  // ดึง artworks ทั้งหมด (รวม draft)
  const { data: artworks } = await supabase
    .from('artworks')
    .select('*')
    .eq('artist_id', profile.id)
    .order('created_at', { ascending: false })

  // ดึง commissions
  const { data: commissions } = await supabase
    .from('commissions')
    .select('*')
    .eq('artist_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // คำนวณ stats
  const totalArtworks = artworks?.length ?? 0
  const publishedArtworks = artworks?.filter(a => a.status === 'published').length ?? 0
  const draftArtworks = artworks?.filter(a => a.status === 'draft').length ?? 0
  const openCommissions = commissions?.filter(c => c.status === 'open').length ?? 0
  const inProgressCommissions = commissions?.filter(c => c.status === 'in_progress').length ?? 0
  const totalRevenue = commissions
    ?.filter(c => c.status === 'completed')
    .reduce((sum, c) => sum + (c.price ?? 0), 0) ?? 0

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium">
              สวัสดี, {profile.display_name || profile.username} 👋
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              นี่คือภาพรวมทั้งหมดของคุณ
            </p>
          </div>
          <Link
            href="/dashboard/upload"
            className="bg-purple-600 text-white text-sm px-5 py-2 rounded-full hover:bg-purple-700 transition-colors"
          >
            + Upload ผลงาน
          </Link>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="ผลงานทั้งหมด" value={totalArtworks} sub={`${publishedArtworks} published`} color="purple" />
          <StatCard label="Draft" value={draftArtworks} sub="รอเผยแพร่" color="gray" />
          <StatCard label="Commission เปิดรับ" value={openCommissions} sub={`${inProgressCommissions} กำลังทำ`} color="blue" />
          <StatCard label="รายได้รวม" value={`$${totalRevenue.toFixed(2)}`} sub="จาก commission" color="green" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Artworks section */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-medium">ผลงานล่าสุด</h2>
              <Link
                href={`/profile/${profile.username}`}
                className="text-xs text-purple-600 hover:underline"
              >
                ดูทั้งหมด →
              </Link>
            </div>

            {artworks && artworks.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {artworks.slice(0, 6).map(artwork => (
                  <Link
                    key={artwork.id}
                    href={`/artwork/${artwork.id}`}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                  >
                    <Image
                      src={artwork.image_url}
                      alt={artwork.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 768px) 33vw, 20vw"
                    />
                    {/* Status badge */}
                    {artwork.status !== 'published' && (
                      <div className="absolute top-1.5 left-1.5">
                        <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
                          {artwork.status === 'draft' ? 'Draft' : 'Archived'}
                        </span>
                      </div>
                    )}
                    {/* Hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end p-2 opacity-0 group-hover:opacity-100">
                      <p className="text-white text-xs truncate">{artwork.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl py-12 flex flex-col items-center gap-3">
                <p className="text-gray-400 text-sm">ยังไม่มีผลงาน</p>
                <Link
                  href="/dashboard/upload"
                  className="text-sm text-purple-600 hover:underline"
                >
                  Upload ผลงานแรกของคุณ →
                </Link>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Profile card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-400 text-lg font-medium">
                    {profile.display_name?.[0] ?? profile.username[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {profile.display_name || profile.username}
                  </p>
                  <p className="text-xs text-gray-400">@{profile.username}</p>
                </div>
              </div>

              {profile.bio ? (
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-4">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-xs text-gray-300 mb-4">ยังไม่มี bio</p>
              )}

              <div className="flex gap-2">
                <Link
                  href="/profile/edit"
                  className="flex-1 text-center text-xs border rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
                >
                  แก้ไขโปรไฟล์
                </Link>
                <Link
                  href={`/profile/${profile.username}`}
                  className="flex-1 text-center text-xs bg-purple-50 text-purple-600 rounded-lg py-1.5 hover:bg-purple-100 transition-colors"
                >
                  ดูโปรไฟล์
                </Link>
              </div>
            </div>

            {/* Commissions */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-sm">Commissions</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  openCommissions > 0
                    ? 'bg-green-50 text-green-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {openCommissions > 0 ? 'เปิดรับ' : 'ปิดรับ'}
                </span>
              </div>

              {commissions && commissions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {commissions.slice(0, 4).map(c => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{c.title}</p>
                        <p className="text-xs text-gray-400">{statusLabel(c.status)}</p>
                      </div>
                      {c.price && (
                        <span className="text-xs text-gray-500 shrink-0 ml-2">
                          ${c.price}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-300 text-center py-4">
                  ยังไม่มี commission
                </p>
              )}
            </div>

          </div>
        </div>

      </div>
    </main>
  )
}

// Stat card component
function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string | number
  sub: string
  color: 'purple' | 'gray' | 'blue' | 'green'
}) {
  const colors = {
    purple: 'bg-purple-50 text-purple-600',
    gray:   'bg-gray-50 text-gray-500',
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
  }

  return (
    <div className={`rounded-2xl p-5 ${colors[color]}`}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm font-medium mt-0.5">{label}</p>
      <p className="text-xs opacity-60 mt-1">{sub}</p>
    </div>
  )
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    open:        'เปิดรับ',
    in_progress: 'กำลังทำ',
    completed:   'เสร็จแล้ว',
    cancelled:   'ยกเลิก',
  }
  return map[status] ?? status
}