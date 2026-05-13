import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CommissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/profile/edit')

  // ดึง listings ทั้งหมด
  const { data: listings } = await supabase
    .from('commissions')
    .select('*')
    .eq('artist_id', profile.id)
    .order('created_at', { ascending: false })

  // ดึง requests ทั้งหมดที่เข้ามา
  const { data: requests } = await supabase
    .from('commission_requests')
    .select('*, commissions(title)')
    .eq('artist_id', profile.id)
    .order('created_at', { ascending: false })

  const pendingCount     = requests?.filter(r => r.status === 'pending').length ?? 0
  const inProgressCount  = requests?.filter(r => r.status === 'in_progress').length ?? 0
  const completedCount   = requests?.filter(r => r.status === 'completed').length ?? 0
  const totalRevenue     = requests
    ?.filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.price ?? 0), 0) ?? 0

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
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium">Commissions</h1>
            <p className="text-sm text-gray-400 mt-1">จัดการ listing และ orders</p>
          </div>
          <Link
            href="/dashboard/commissions/new"
            className="bg-purple-600 text-white text-sm px-5 py-2 rounded-full hover:bg-purple-700 transition-colors"
          >
            + สร้าง Listing
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-yellow-50 text-yellow-600 rounded-2xl p-4">
            <p className="text-2xl font-medium">{pendingCount}</p>
            <p className="text-xs mt-0.5 opacity-70">Pending</p>
          </div>
          <div className="bg-blue-50 text-blue-600 rounded-2xl p-4">
            <p className="text-2xl font-medium">{inProgressCount}</p>
            <p className="text-xs mt-0.5 opacity-70">In Progress</p>
          </div>
          <div className="bg-gray-100 text-gray-500 rounded-2xl p-4">
            <p className="text-2xl font-medium">{completedCount}</p>
            <p className="text-xs mt-0.5 opacity-70">Completed</p>
          </div>
          <div className="bg-purple-50 text-purple-600 rounded-2xl p-4">
            <p className="text-2xl font-medium">${totalRevenue.toFixed(2)}</p>
            <p className="text-xs mt-0.5 opacity-70">รายได้รวม</p>
          </div>
        </div>

        {/* Listings */}
        <div>
          <h2 className="font-medium mb-3">Commission Listings</h2>
          {listings && listings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {listings.map(l => (
                <div
                  key={l.id}
                  className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{l.title}</p>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full shrink-0 ${
                        l.is_open
                          ? 'bg-green-50 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {l.is_open ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {l.price && <span>{l.currency ?? 'USD'} {l.price}</span>}
                      {l.turnaround_days && <span>{l.turnaround_days} วัน</span>}
                      {l.slots > 0 && <span>{l.slots} slots</span>}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/commissions/${l.id}`}
                    className="text-xs text-purple-600 hover:underline shrink-0"
                  >
                    จัดการ →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl py-12 text-center shadow-sm">
              <p className="text-gray-400 text-sm mb-3">ยังไม่มี listing</p>
              <Link
                href="/dashboard/commissions/new"
                className="text-sm text-purple-600 hover:underline"
              >
                สร้าง listing แรก →
              </Link>
            </div>
          )}
        </div>

        {/* Requests / Orders */}
        <div>
          <h2 className="font-medium mb-3">
            Orders ที่เข้ามา
            {pendingCount > 0 && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full">
                {pendingCount} ใหม่
              </span>
            )}
          </h2>
          {requests && requests.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-5 py-3 text-xs font-medium text-gray-400">ลูกค้า</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400">Listing</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400">สถานะ</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400">ราคา</th>
                    <th className="px-5 py-3 text-xs font-medium text-gray-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium">{r.client_name}</p>
                        <p className="text-xs text-gray-400">{r.client_email}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs">
                        {(r.commissions as any)?.title ?? '—'}
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
              <p className="text-gray-400 text-sm">ยังไม่มี order เข้ามา</p>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}