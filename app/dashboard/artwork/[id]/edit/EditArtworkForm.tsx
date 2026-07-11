// arin/app/dashboard/artwork/[id]/edit/EditArtworkForm.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updateArtwork, deleteArtwork } from '@/lib/actions'

type Character = {
  id: string
  name: string
  ref_sheet_url: string | null
}

type Artwork = {
  title: string
  description: string | null
  tags: string[] | null
  status: string
  is_nsfw: boolean
  image_url: string
}

export default function EditArtworkForm({
  artworkId,
  initialArtwork,
  characters,
  initialSelectedCharacterIds,
}: {
  artworkId: string
  initialArtwork: Artwork
  characters: Character[]
  initialSelectedCharacterIds: string[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(initialSelectedCharacterIds)

  const [form, setForm] = useState({
    title:       initialArtwork.title ?? '',
    description: initialArtwork.description ?? '',
    tags:        initialArtwork.tags?.join(', ') ?? '',
    status:      initialArtwork.status ?? 'published',
    is_nsfw:     initialArtwork.is_nsfw ?? false,
  })

  function toggleCharacter(charId: string) {
    setSelectedCharacters(prev =>
      prev.includes(charId) ? prev.filter(c => c !== charId) : [...prev, charId]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const result = await updateArtwork(artworkId, {
      ...form,
      character_ids: selectedCharacters,
    })

    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      router.push(`/artwork/${artworkId}`)
    }
  }

  async function handleDelete() {
    if (!confirm('ลบ artwork นี้? ไม่สามารถกู้คืนได้')) return
    const result = await deleteArtwork(artworkId)
    if (result.error) {
      setError(result.error)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-lg mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-medium">Edit Artwork</h1>
          <p className="text-sm text-gray-400 mt-1">Edit details and characters</p>
        </div>

        <div className="mb-6 rounded-xl overflow-hidden bg-gray-100 aspect-video relative">
          <img
            src={initialArtwork.image_url}
            alt="artwork"
            className="w-full h-full object-contain"
          />
          <span className="absolute top-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded-full">
            รูปปัจจุบัน (ไม่สามารถเปลี่ยนรูปได้)
          </span>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">

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

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">คำอธิบาย</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

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