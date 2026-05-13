import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import RequestActions from './RequestActions'
import InvoiceButton from '../../[id]/InvoiceButton'

export default async function RequestDetailPage({
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
    .select('id, username, display_name')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/profile/edit')

  // ดึง request พร้อม listing
  const { data: request } = await supabase
    .from('commission_requests')
    .select('*, commissions(id, title, currency)')
    .eq('id', id)
    .eq('artist_id', profile.id)
    .single()

  if (!request) notFound()

  const listing = request.commissions as {
    id: string
    title: string
    currency: string
  }

  // ดึง characters ที่ลูกค้าแนบมา
  const { data: characters } = request.character_ids?.length
    ? await supabase
        .from('characters')
        .select('id, name, ref_sheet_url, profiles(username)')
        .in('id', request.character_ids)
    : { data: [] }

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

  // สร้าง commission object สำหรับ InvoiceButton
  const commissionForInvoice = {
    id:          request.id,
    title:       listing?.title ?? 'Commission',
    description: request.description,
    price:       request.price,
    currency:    request.currency ?? listing?.currency ?? 'USD',
    status:      request.status,
    deadline:    request.deadline,
    created_at:  request.created_at,
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        <Link
          href="/dashboard/commissions"
          className="text-sm text-gray-400 hover:text-gray-600 w-fit"
        >
          ← กลับ
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs text-gray-400 mb-1">
                Order จาก listing:{' '}
                <Link
                  href={`/dashboard/commissions/${listing?.id}`}
                  className="text-purple-600 hover:underline"
                >
                  {listing?.title}
                </Link>
              </p>
              <h1 className="text-xl font-medium">{request.client_name}</h1>
              <p className="text-sm text-gray-400">{request.client_email}</p>
            </div>
            <span className={`text-xs px-3 py-1.5 rounded-full shrink-0 ${STATUS_COLOR[request.status]}`}>
              {STATUS_LABEL[request.status]}
            </span>
          </div>

          {/* รายละเอียดที่ลูกค้ากรอก */}
          <div className="mb-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">รายละเอียดที่ต้องการ</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {request.description}
            </p>
          </div>

          {/* Character notes */}
          {request.character_notes && (
            <div className="mb-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">หมายเหตุ Character</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {request.character_notes}
              </p>
            </div>
          )}

          {/* Characters ที่แนบมา */}
          {characters && characters.length > 0 && (
            <div className="mb-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                Characters ที่ต้องการให้วาด
              </p>
              <div className="flex flex-col gap-2">
                {characters.map((c: any) => {
                  const owner = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
                  return (
                    <Link
                      key={c.id}
                      href={`/character/${c.id}`}
                      target="_blank"
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-colors"
                    >
                      {c.ref_sheet_url ? (
                        <img
                          src={c.ref_sheet_url}
                          alt={c.name}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-lg shrink-0">
                          🎨
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        {owner?.username && (
                          <p className="text-xs text-gray-400">@{owner.username}</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Price + Date */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-gray-400 mb-1">ราคา</p>
              <p className="text-sm font-medium">
                {request.price
                  ? `${request.currency ?? 'USD'} ${request.price}`
                  : '—'
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">วันที่สั่ง</p>
              <p className="text-sm font-medium">
                {new Date(request.created_at).toLocaleDateString('th-TH', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
            </div>
            {request.deadline && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Deadline</p>
                <p className="text-sm font-medium">
                  {new Date(request.deadline).toLocaleDateString('th-TH', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <RequestActions
          requestId={request.id}
          currentStatus={request.status}
          currentPrice={request.price}
          currentCurrency={request.currency ?? listing?.currency ?? 'USD'}
        />

        {/* Invoice */}
        {request.status === 'completed' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-medium mb-4">Invoice</h2>
            <InvoiceButton
              commission={commissionForInvoice}
              artist={profile}
            />
          </div>
        )}

      </div>
    </main>
  )
}