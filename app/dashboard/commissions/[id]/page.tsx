import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ListingActions from './ListingActions'
import CopyLink from './CopyLink'

export default async function CommissionListingPage({
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
    .select('id, username')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/profile/edit')

  const { data: listing } = await supabase
    .from('commissions')
    .select('*')
    .eq('id', id)
    .eq('artist_id', profile.id)
    .single()

  if (!listing) notFound()

  // ดึง requests ของ listing นี้
  const { data: requests } = await supabase
    .from('commission_requests')
    .select('*')
    .eq('commission_id', id)
    .order('created_at', { ascending: false })

  const STATUS_LABEL: Record<string, string> = {
    pending:     'Pending',
    in_progress: 'In Progress',
    completed:   'Completed',
    cancelled:   'Cancelled',
  }

  const STATUS_COLOR: Record<string, string> = {
    pending:     'bg-yellow-50 text-yellow-600',
    in_progress: 'bg-blue-50 text-blue-600',
    completed:   'bg-gray-100 text-gray-500',
    cancelled:   'bg-red-50 text-red-400',
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        <Link
          href="/dashboard/commissions"
          className="text-sm text-gray-400 hover:text-gray-600 w-fit"
        >
          ← กลับ
        </Link>

        {/* Listing detail */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-xl font-medium">{listing.title}</h1>
            <span className={`text-xs px-3 py-1 rounded-full shrink-0 ${
              listing.is_open
                ? 'bg-green-50 text-green-600'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {listing.is_open ? 'Open' : 'Closed'}
            </span>
          </div>

          {listing.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {listing.description}
            </p>
          )}

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-gray-400 mb-1">ราคาเริ่มต้น</p>
              <p className="text-sm font-medium">
                {listing.price ? `${listing.currency} ${listing.price}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">ระยะเวลา</p>
              <p className="text-sm font-medium">
                {listing.turnaround_days ? `${listing.turnaround_days} วัน` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Slots</p>
              <p className="text-sm font-medium">
                {listing.slots > 0 ? listing.slots : 'ไม่จำกัด'}
              </p>
            </div>
          </div>

          {listing.tos && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-400 mb-2">Terms of Service</p>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                {listing.tos}
              </p>
            </div>
          )}

          {/* Public link */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-400 mb-1">ลิงก์สำหรับลูกค้า</p>
            {/* <code className="text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg block">
              /commission/{listing.id}
            </code> */}
            <CopyLink id={listing.id} />
          </div>
        </div>

        {/* Actions */}
        <ListingActions listingId={listing.id} isOpen={listing.is_open} />

        {/* Requests */}
        <div>
          <h2 className="font-medium mb-3">
            Orders
            {requests && requests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full">
                {requests.filter(r => r.status === 'pending').length} ใหม่
              </span>
            )}
          </h2>

          {requests && requests.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-5 py-3 text-xs font-medium text-gray-400">ลูกค้า</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400">สถานะ</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400">ราคา</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-medium">{r.client_name}</p>
                        <p className="text-xs text-gray-400">{r.client_email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLOR[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs">
                        {r.price ? `${r.currency} ${r.price}` : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/commissions/requests/${r.id}`}
                          className="text-xs text-purple-600 hover:underline"
                        >
                          ดูรายละเอียด →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-2xl py-12 text-center shadow-sm">
              <p className="text-gray-400 text-sm">ยังไม่มี order สำหรับ listing นี้</p>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}