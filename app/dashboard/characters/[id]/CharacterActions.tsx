'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CharacterActions({
  characterId,
  isPublic,
}: {
  characterId: string
  isPublic: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function toggleVisibility() {
    setLoading(true)
    const { error } = await supabase
      .from('characters')
      .update({ is_public: !isPublic })
      .eq('id', characterId)

    if (error) { setError(error.message); setLoading(false) }
    else { router.refresh(); setLoading(false) }
  }

  async function handleDelete() {
    if (!confirm('ลบ character นี้? ไม่สามารถกู้คืนได้')) return
    setLoading(true)
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterId)

    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard/characters') }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-3">
      <h2 className="text-sm font-medium">Actions</h2>

      <button
        onClick={toggleVisibility}
        disabled={loading}
        className="border rounded-lg py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isPublic ? '🔒 Make Private' : '🌐 Make Public'}
      </button>

      <a
        href={`/dashboard/characters/${characterId}/edit`}
        className="border rounded-lg py-2.5 text-sm text-center hover:bg-gray-50 transition-colors"
      >
         Edit Character
      </a>
      
      <Link
        href={`/character/${characterId}`}
        target="_blank"
        className="border rounded-lg py-2.5 text-sm text-center hover:bg-gray-50 transition-colors"
      >
        🌐 View Public Page
      </Link>

      <button
        onClick={handleDelete}
        disabled={loading}
        className="border border-red-200 text-red-400 rounded-lg py-2.5 text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        Delete Character
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}