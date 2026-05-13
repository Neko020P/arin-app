'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

type Character = {
  id: string
  name: string
  ref_sheet_url: string | null
}

type Props = {
  commissionId: string
  artistId: string
  basePrice: number | null
  currency: string
}

export default function OrderForm({
  commissionId,
  artistId,
  basePrice,
  currency,
}: Props) {
  const supabase = createClient()

  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    client_name:     '',
    client_email:    '',
    description:     '',
    character_notes: '',
  })

  // ดึง characters ของลูกค้าที่ login อยู่ (ถ้ามี)
  useEffect(() => {
    async function loadMyCharacters() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .eq('user_id', user.id)
        .single()

      if (!profile) return

      // auto-fill ชื่อและ email
      setForm(prev => ({
        ...prev,
        client_name:  profile.display_name || profile.username,
        client_email: user.email ?? '',
      }))

      // ดึง characters ของตัวเอง
      const { data: chars } = await supabase
        .from('characters')
        .select('id, name, ref_sheet_url')
        .eq('owner_id', profile.id)
        .order('name')

      setCharacters(chars ?? [])
    }
    loadMyCharacters()
  }, [])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleCharacter(id: string) {
    setSelectedCharacters(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { error } = await supabase
      .from('commission_requests')
      .insert({
        commission_id:   commissionId,
        artist_id:       artistId,
        client_name:     form.client_name.trim(),
        client_email:    form.client_email.trim(),
        description:     form.description.trim(),
        character_ids:   selectedCharacters,
        character_notes: form.character_notes.trim() || null,
        price:           basePrice,
        currency,
        status:          'pending',
      })

    if (error) {
      setError(error.message)
      setSubmitting(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <p className="text-3xl mb-3">✅</p>
        <h3 className="font-medium mb-2">ส่ง Order สำเร็จแล้ว</h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          artist จะติดต่อกลับผ่าน email ที่คุณให้ไว้ครับ
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* ชื่อ + Email */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">ชื่อของคุณ <span className="text-red-400">*</span></label>
        <input
          type="text"
          required
          value={form.client_name}
          onChange={e => set('client_name', e.target.value)}
          placeholder="ชื่อหรือนามแฝง"
          className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Email <span className="text-red-400">*</span></label>
        <input
          type="email"
          required
          value={form.client_email}
          onChange={e => set('client_email', e.target.value)}
          placeholder="email@example.com"
          className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      {/* รายละเอียดที่ต้องการ */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">รายละเอียดที่ต้องการ <span className="text-red-400">*</span></label>
        <textarea
          required
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="อธิบายสิ่งที่อยากให้วาด pose, expression, background..."
          rows={4}
          className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
        />
      </div>

      {/* Character ของลูกค้า */}
      {characters.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            เลือก Character ที่อยากให้วาด
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
                    flex items-center gap-2 p-2.5 rounded-xl border text-left transition-colors
                    ${selected
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {c.ref_sheet_url ? (
                    <img
                      src={c.ref_sheet_url}
                      alt={c.name}
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      🎨
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{c.name}</p>
                    {selected && <p className="text-xs text-purple-500">✓</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ถ้าไม่ได้ login ให้บอก URL ref sheet */}
      {characters.length === 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Ref Sheet / Character Reference</label>
          <input
            type="text"
            value={form.character_notes}
            onChange={e => set('character_notes', e.target.value)}
            placeholder="ลิงก์ ref sheet หรืออธิบาย character ที่ต้องการ"
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      )}

      {/* Character notes เพิ่มเติม */}
      {characters.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">หมายเหตุเพิ่มเติมเกี่ยวกับ Character</label>
          <input
            type="text"
            value={form.character_notes}
            onChange={e => set('character_notes', e.target.value)}
            placeholder="เช่น ใส่ชุดฤดูหนาว, expression สุขสบาย..."
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      )}

      {/* Price preview */}
      {basePrice && (
        <div className="bg-purple-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">ราคาเริ่มต้น</span>
          <span className="font-medium text-purple-600">
            {currency} {basePrice}
          </span>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'กำลังส่ง...' : 'ส่ง Order'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        ถ้า login อยู่ characters ของคุณจะขึ้นให้เลือกอัตโนมัติ
      </p>

    </form>
  )
}