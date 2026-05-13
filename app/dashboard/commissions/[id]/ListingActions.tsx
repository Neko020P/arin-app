'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ListingActions({
  listingId,
  isOpen,
}: {
  listingId: string
  isOpen: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function toggleOpen() {
    setLoading(true)
    await supabase
      .from('commissions')
      .update({ is_open: !isOpen })
      .eq('id', listingId)
    router.refresh()
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('ลบ listing นี้? orders ทั้งหมดจะถูกลบด้วย')) return
    setLoading(true)
    await supabase.from('commissions').delete().eq('id', listingId)
    router.push('/dashboard/commissions')
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <h2 className="text-sm font-medium">Actions</h2>
      <button
        onClick={toggleOpen}
        disabled={loading}
        className="border rounded-lg py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isOpen ? '🔴 ปิดรับ Commission' : '🟢 เปิดรับ Commission'}
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="border border-red-200 text-red-400 rounded-lg py-2.5 text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        Delete Listing
      </button>
    </div>
  )
}