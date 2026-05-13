'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const NEXT_STATUS: Record<string, { value: string; label: string; color: string }[]> = {
  pending:     [{ value: 'in_progress', label: 'Accept & Start Working', color: 'bg-blue-600' }],
  in_progress: [{ value: 'completed',   label: 'Mark as Completed',      color: 'bg-green-600' }],
  completed:   [],
  cancelled:   [],
}

const CANCEL_ALLOWED = ['pending', 'in_progress']

export default function RequestActions({
  requestId,
  currentStatus,
  currentPrice,
  currentCurrency,
}: {
  requestId: string
  currentStatus: string
  currentPrice: number | null
  currentCurrency: string
}) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingPrice, setEditingPrice] = useState(false)
  const [price, setPrice] = useState(currentPrice?.toString() ?? '')
  const [deadline, setDeadline] = useState('')

  async function updateStatus(newStatus: string) {
    setLoading(true)
    setError('')

    const { error } = await supabase
      .from('commission_requests')
      .update({ status: newStatus })
      .eq('id', requestId)

    if (error) { setError(error.message); setLoading(false) }
    else { router.refresh(); setLoading(false) }
  }

  async function savePrice() {
    setLoading(true)
    const { error } = await supabase
      .from('commission_requests')
      .update({
        price:    price ? parseFloat(price) : null,
        deadline: deadline || null,
      })
      .eq('id', requestId)

    if (error) { setError(error.message) }
    else { setEditingPrice(false); router.refresh() }
    setLoading(false)
  }

  const nextActions = NEXT_STATUS[currentStatus] ?? []
  const canCancel   = CANCEL_ALLOWED.includes(currentStatus)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4">
      <h2 className="text-sm font-medium">จัดการ Order</h2>

      {/* ปรับราคาและ deadline */}
      {currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
        <div>
          {!editingPrice ? (
            <button
              onClick={() => setEditingPrice(true)}
              className="text-xs text-purple-600 hover:underline"
            >
              ✏️ ปรับราคา / ตั้ง deadline
            </button>
          ) : (
            <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs font-medium text-gray-500">ราคา ({currentCurrency})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs font-medium text-gray-500">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={savePrice}
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  บันทึก
                </button>
                <button
                  onClick={() => setEditingPrice(false)}
                  className="px-4 border rounded-lg text-sm hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Next status buttons */}
      <div className="flex flex-col gap-3">
        {nextActions.map(action => (
          <button
            key={action.value}
            onClick={() => updateStatus(action.value)}
            disabled={loading}
            className={`${action.color} text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity`}
          >
            {loading ? 'กำลังอัปเดต...' : action.label}
          </button>
        ))}

        {canCancel && (
          <button
            onClick={() => updateStatus('cancelled')}
            disabled={loading}
            className="border border-red-200 text-red-400 rounded-lg py-2.5 text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Decline / Cancel Order
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Status guide */}
      {currentStatus === 'completed' && (
        <p className="text-xs text-gray-400 text-center">
          Order นี้เสร็จสิ้นแล้ว export invoice ได้ด้านล่าง
        </p>
      )}
      {currentStatus === 'cancelled' && (
        <p className="text-xs text-gray-400 text-center">
          Order นี้ถูกยกเลิกแล้ว
        </p>
      )}
    </div>
  )
}