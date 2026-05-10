'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Profile = {
  username: string
  display_name: string
  bio: string
  avatar_url: string
  social_links: string[]
}

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState<Profile>({
    username: '',
    display_name: '',
    bio: '',
    avatar_url: '',
    social_links: [''],
  })

  // โหลด profile ปัจจุบัน
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setForm({
          username: data.username ?? '',
          display_name: data.display_name ?? '',
          bio: data.bio ?? '',
          avatar_url: data.avatar_url ?? '',
          social_links: data.social_links?.length ? data.social_links : [''],
        })
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  function updateField(field: keyof Profile, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function updateSocialLink(index: number, value: string) {
    const updated = [...form.social_links]
    updated[index] = value
    setForm(prev => ({ ...prev, social_links: updated }))
  }

  function addSocialLink() {
    if (form.social_links.length >= 5) return
    setForm(prev => ({ ...prev, social_links: [...prev.social_links, ''] }))
  }

  function removeSocialLink(index: number) {
    const updated = form.social_links.filter((_, i) => i !== index)
    setForm(prev => ({ ...prev, social_links: updated.length ? updated : [''] }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    // กรอง social_links ที่ว่างออก
    const cleanedLinks = form.social_links.filter(l => l.trim() !== '')

    const { error } = await supabase
      .from('profiles')
      .update({
        username: form.username.trim(),
        display_name: form.display_name.trim(),
        bio: form.bio.trim(),
        avatar_url: form.avatar_url.trim(),
        social_links: cleanedLinks,
      })
      .eq('user_id', user.id)

    if (error) {
      setError(error.message.includes('unique')
        ? 'Username นี้ถูกใช้ไปแล้ว'
        : error.message
      )
    } else {
      setSuccess(true)
      setTimeout(() => router.push(`/profile/${form.username}`), 1000)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">กำลังโหลด...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-medium mb-8">แก้ไขโปรไฟล์</h1>

        <form onSubmit={handleSave} className="flex flex-col gap-6">

          {/* Username */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Username</label>
            <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-purple-400">
              <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm border-r">
                arin.art/
              </span>
              <input
                type="text"
                required
                value={form.username}
                onChange={e => updateField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourname"
                className="flex-1 px-3 py-2 text-sm outline-none"
              />
            </div>
            <p className="text-xs text-gray-400">ตัวเล็ก, ตัวเลข, _ เท่านั้น</p>
          </div>

          {/* Display Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">ชื่อที่แสดง</label>
            <input
              type="text"
              value={form.display_name}
              onChange={e => updateField('display_name', e.target.value)}
              placeholder="ชื่อจริงหรือนามแฝง"
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Bio</label>
            <textarea
              value={form.bio}
              onChange={e => updateField('bio', e.target.value)}
              placeholder="แนะนำตัวเองสั้นๆ..."
              rows={4}
              maxLength={300}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">
              {form.bio.length}/300
            </p>
          </div>

          {/* Avatar URL */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Avatar URL</label>
            <input
              type="url"
              value={form.avatar_url}
              onChange={e => updateField('avatar_url', e.target.value)}
              placeholder="https://..."
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
            {form.avatar_url && (
              <img
                src={form.avatar_url}
                alt="avatar preview"
                className="w-16 h-16 rounded-full object-cover mt-2"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>

          {/* Social Links */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Social Links</label>
            {form.social_links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="url"
                  value={link}
                  onChange={e => updateSocialLink(index, e.target.value)}
                  placeholder="https://twitter.com/yourname"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  type="button"
                  onClick={() => removeSocialLink(index)}
                  className="px-3 py-2 text-gray-400 hover:text-red-400 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
            {form.social_links.length < 5 && (
              <button
                type="button"
                onClick={addSocialLink}
                className="text-sm text-purple-600 hover:underline text-left"
              >
                + เพิ่ม link
              </button>
            )}
          </div>

          {/* Error / Success */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-500">บันทึกสำเร็จแล้ว กำลังพาไปหน้าโปรไฟล์...</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              ยกเลิก
            </button>
          </div>

        </form>
      </div>
    </main>
  )
}