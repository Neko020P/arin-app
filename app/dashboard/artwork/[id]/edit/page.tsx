'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Character = {
  id: string
  name: string
  ref_sheet_url: string | null
}

export default function EditArtworkPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState('')

  const [form, setForm] = useState({
    title:       '',
    description: '',
    tags:        '',
    status:      'published',
    is_nsfw:     false,
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

      if (!profile) return router.push('/profile/edit')

      // ดึง artwork
      const { data: artwork } = await supabase
        .from('artworks')
        .select('*')
        .eq('id', id)
        .eq('artist_id', profile.id)
        .single()

      if (!artwork) return router.push('/dashboard')

      setImageUrl(artwork.image_url)
      setForm({
        title:       artwork.title ?? '',
        description: artwork.description ?? '',
        tags:        artwork.tags?.join(', ') ?? '',
        status:      artwork.status ?? 'published',
        is_nsfw:     artwork.is_nsfw ?? false,
      })

      // ดึง characters ทั้งหมด
      const { data: allChars } = await supabase
        .from('characters')
        .select('id, name, ref_sheet_url')
        .eq('owner_id', profile.id)
        .order('name')

      setCharacters(allChars ?? [])

      // ดึง characters ที่ link กับ artwork นี้อยู่แล้ว
      const { data: linked } = await supabase
        .from('artwork_characters')
        .select('character_id')
        .eq('artwork_id', id)

      setSelectedCharacters(linked?.map(l => l.character_id) ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  function toggleCharacter(charId: string) {
    setSelectedCharacters(prev =>
      prev.includes(charId) ? prev.filter(c => c !== charId) : [...prev, charId]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)

    // 1. update artwork
    const { error: artErr } = await supabase
      .from('artworks')
      .update({
        title:       form.title.trim(),
        description: form.description.trim() || null,
        tags,
        status:      form.status,
        is_nsfw:     form.is_nsfw,
      })
      .eq('id', id)

    if (artErr) { setError(artErr.message); setSaving(false); return }

    // 2. ลบ links เก่าทิ้งก่อน แล้วใส่ใหม่
    await supabase.from('artwork_characters').delete().eq('artwork_id', id)

    if (selectedCharacters.length > 0) {
      await supabase.from('artwork_characters').insert(
        selectedCharacters.map(character_id => ({ artwork_id: id, character_id }))
      )
    }

    router.push(`/artwork/${id}`)
  }

  async function handleDelete() {
    if (!confirm('ลบ artwork นี้? ไม่สามารถกู้คืนได้')) return
    await supabase.from('artworks').delete().eq('id', id)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-lg mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-medium">Edit Artwork</h1>
          <p className="text-sm text-gray-400 mt-1">Edit details and characters</p>
        </div>

        {/* Preview รูปปัจจุบัน */}
        <div className="mb-6 rounded-xl overflow-hidden bg-gray-100 aspect-video relative">
          <img
            src={imageUrl}
            alt="artwork"
            className="w-full h-full object-contain"
          />
          <span className="absolute top-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded-full">
            รูปปัจจุบัน (ไม่สามารถเปลี่ยนรูปได้)
          </span>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">ชื่อผลงาน <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">คำอธิบาย</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="fanart, oc — คั่นด้วยจุลภาค"
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

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">สถานะ</label>
            <select
              value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Characters */}
          {characters.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                Characters
                {selectedCharacters.length > 0 && (
                  <span className="ml-2 text-xs text-purple-600">
                    เลือกแล้ว {selectedCharacters.length} ตัว
                  </span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {characters.map(c => {
                  const selected = selectedCharacters.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCharacter(c.id)}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl border text-left transition-colors
                        ${selected
                          ? 'border-purple-400 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      {c.ref_sheet_url ? (
                        <img src={c.ref_sheet_url} alt={c.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-lg shrink-0">🎨</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        {selected && <p className="text-xs text-purple-500">✓ เลือกแล้ว</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* NSFW */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(p => ({ ...p, is_nsfw: !p.is_nsfw }))}
              className={`w-10 h-6 rounded-full transition-colors relative ${form.is_nsfw ? 'bg-red-400' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_nsfw ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm">เนื้อหาสำหรับผู้ใหญ่ (NSFW)</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              ยกเลิก
            </button>
          </div>

          {/* Delete */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="w-full border border-red-200 text-red-400 rounded-lg py-2.5 text-sm hover:bg-red-50 transition-colors"
            >
              Delete Artwork
            </button>
          </div>

        </form>
      </div>
    </main>
  )
}