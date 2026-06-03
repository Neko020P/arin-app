'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NewCommissionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [artistId, setArtistId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title:           '',
    description:     '',
    price:           '',
    currency:        'USD',
    turnaround_days: '',
    slots:           '',
    tos:             '',
    is_open:         true,
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

      if (profile) setArtistId(profile.id)
    }
    load()
  }, [])

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!artistId) return
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('commissions')
      .insert({
        artist_id:       artistId,
        title:           form.title.trim(),
        description:     form.description.trim() || null,
        price:           form.price ? parseFloat(form.price) : null,
        currency:        form.currency,
        turnaround_days: form.turnaround_days ? parseInt(form.turnaround_days) : null,
        slots:           form.slots ? parseInt(form.slots) : 0,
        tos:             form.tos.trim() || null,
        is_open:         form.is_open,
      })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push('/dashboard/commissions')
    }
  }

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-lg mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-medium">Create New Commission Listing</h1>
          <p className="text-sm text-gray-400 mt-1">Announce your commission availability for customers to see in your profile</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Listing Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g., Full Body Illustration, Chibi Character"
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe what type of work this listing accepts and its style..."
              rows={4}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          {/* Price + Currency */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium">Starting Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0.00"
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div className="flex flex-col gap-1 w-28">
              <label className="text-sm font-medium">Currency</label>
              <select
                value={form.currency}
                onChange={e => set('currency', e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 bg-white"
              >
                <option value="USD">USD</option>
                <option value="THB">THB</option>
                <option value="EUR">EUR</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>

          {/* Turnaround + Slots */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium">Turnaround Time (days)</label>
              <input
                type="number"
                min="1"
                value={form.turnaround_days}
                onChange={e => set('turnaround_days', e.target.value)}
                placeholder="e.g., 14"
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium">Number of Slots</label>
              <input
                type="number"
                min="0"
                value={form.slots}
                onChange={e => set('slots', e.target.value)}
                placeholder="0 = Unlimited"
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          {/* TOS */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Terms of Service</label>
            <textarea
              value={form.tos}
              onChange={e => set('tos', e.target.value)}
              placeholder="Terms and conditions for accepting commissions, usage rights, payment terms..."
              rows={4}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          {/* Open/Closed */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Status</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => set('is_open', true)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  form.is_open
                    ? 'bg-green-50 border-green-200 text-green-600'
                    : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                }`}
              >
                🟢 Open
              </button>
              <button
                type="button"
                onClick={() => set('is_open', false)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  !form.is_open
                    ? 'bg-gray-100 border-gray-300 text-gray-600'
                    : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                }`}
              >
                🔴 Closed
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Listing'}
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