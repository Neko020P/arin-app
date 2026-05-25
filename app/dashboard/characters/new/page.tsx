'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NewCharacterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name:          '',
    lore:          '',
    ref_sheet_url: '',
    tags:          '',
    is_public:     true,
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (profile) setOwnerId(profile.id)
    }
    load()
  }, [])

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ownerId) return
    setSaving(true)
    setError('')

    const tags = form.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    const { error } = await supabase
      .from('characters')
      .insert({
        owner_id:      ownerId,
        name:          form.name.trim(),
        lore:          form.lore.trim() || null,
        ref_sheet_url: form.ref_sheet_url.trim() || null,
        tags,
        is_public:     form.is_public,
      })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push('/dashboard/characters')
    }
  }

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-lg mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-medium">สร้าง Character ใหม่</h1>
          <p className="text-sm text-gray-400 mt-1">กรอกข้อมูลและ lore ของตัวละคร</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">ชื่อตัวละคร <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="เช่น Aria Moonwhisper"
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Lore */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Lore / ประวัติตัวละคร</label>
            <textarea
              value={form.lore}
              onChange={e => set('lore', e.target.value)}
              placeholder="เล่าเรื่องราว บุคลิก ความเป็นมา หรือ world ของตัวละคร..."
              rows={6}
              maxLength={5000}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{form.lore.length}/5000</p>
          </div>

          {/* Ref Sheet URL */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Ref Sheet URL</label>
            <input
              type="url"
              value={form.ref_sheet_url}
              onChange={e => set('ref_sheet_url', e.target.value)}
              placeholder="https://..."
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
            {form.ref_sheet_url && (
              <img
                src={form.ref_sheet_url}
                alt="ref preview"
                className="w-24 h-24 rounded-xl object-cover mt-2"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            )}
            <p className="text-xs text-gray-400">ใส่ URL รูป ref sheet ของตัวละคร</p>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="oc, fantasy, demon — คั่นด้วยจุลภาค"
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
            {form.tags && (
              <div className="flex flex-wrap gap-1 mt-1">
                {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                  <span key={tag} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">การมองเห็น</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => set('is_public', true)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  form.is_public
                    ? 'bg-green-50 border-green-200 text-green-600'
                    : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                }`}
              >
                🌐 Public
              </button>
              <button
                type="button"
                onClick={() => set('is_public', false)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  !form.is_public
                    ? 'bg-gray-100 border-gray-300 text-gray-600'
                    : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                }`}
              >
                🔒 Private
              </button>
            </div>
            <p className="text-xs text-gray-400">
              {form.is_public
                ? 'ทุกคนเห็น character นี้ได้'
                : 'เฉพาะคุณเท่านั้นที่เห็น'
              }
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Character'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </main>
  )
}