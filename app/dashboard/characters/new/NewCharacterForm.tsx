// arin/app/dashboard/characters/new/NewCharacterForm.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createCharacter } from '@/lib/actions'

export default function NewCharacterForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name:          '',
    lore:          '',
    ref_sheet_url: '',
    tags:          '',
    is_public:     true,
  })

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const result = await createCharacter(form)

    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      router.push('/dashboard/characters')
    }
  }

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-lg mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-medium">Create New Character</h1>
          <p className="text-sm text-gray-400 mt-1">Fill in the details and lore of your character</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Character Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g., Aria Moonwhisper"
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Lore / Character Background</label>
            <textarea
              value={form.lore}
              onChange={e => set('lore', e.target.value)}
              placeholder="Tell the story, personality, background, or world of your character..."
              rows={6}
              maxLength={5000}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{form.lore.length}/5000</p>
          </div>

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
            <p className="text-xs text-gray-400">Enter the URL of your character's reference sheet</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="oc, fantasy, demon — separated by commas"
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

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Visibility</label>
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
                ? 'Everyone can see this character'
                : 'Only you can see this character'
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