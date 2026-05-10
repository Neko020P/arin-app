'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

type Props = {
  artistId: string // profiles.id (ไม่ใช่ user_id)
}

export default function ArtworkUpload({ artistId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    tags: '',
    is_nsfw: false,
  })

  // drag & drop handlers
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, [])

  function handleFile(f: File) {
    // เช็ค type
    if (!f.type.startsWith('image/')) {
      setError('รองรับเฉพาะไฟล์รูปภาพเท่านั้น')
      return
    }
    // เช็ค size (20MB)
    if (f.size > 20 * 1024 * 1024) {
      setError('ไฟล์ต้องไม่เกิน 20MB')
      return
    }
    setError('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError('')
    setProgress(0)

    try {
      // 1. upload ไฟล์ไปยัง Supabase Storage
      // เก็บแยก folder ตาม artistId เพื่อให้ RLS delete ทำงานได้
      const ext = file.name.split('.').pop()
      const fileName = `${artistId}/${Date.now()}.${ext}`

      const { data: storageData, error: storageError } = await supabase.storage
        .from('artworks')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (storageError) throw storageError
      setProgress(60)

      // 2. เอา public URL มา
      const { data: { publicUrl } } = supabase.storage
        .from('artworks')
        .getPublicUrl(storageData.path)

      setProgress(80)

      // 3. บันทึก metadata ลง artworks table
      const tags = form.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      const { error: dbError } = await supabase
        .from('artworks')
        .insert({
          artist_id: artistId,
          title: form.title,
          description: form.description,
          image_url: publicUrl,
          tags,
          is_nsfw: form.is_nsfw,
          status: 'published',
        })

      if (dbError) throw dbError
      setProgress(100)

      // 4. reset แล้ว refresh
      setTimeout(() => {
        setFile(null)
        setPreview(null)
        setForm({ title: '', description: '', tags: '', is_nsfw: false })
        setProgress(0)
        router.refresh()
      }, 500)

    } catch (err: any) {
      setError(err.message ?? 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <form onSubmit={handleUpload} className="flex flex-col gap-5">

        {/* Drop Zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => document.getElementById('file-input')?.click()}
          className={`
            relative border-2 border-dashed rounded-xl cursor-pointer
            flex flex-col items-center justify-center
            transition-colors min-h-48
            ${dragging
              ? 'border-purple-400 bg-purple-50'
              : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
            }
          `}
        >
          <input
            id="file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {preview ? (
            <img
              src={preview}
              alt="preview"
              className="max-h-64 max-w-full rounded-lg object-contain"
            />
          ) : (
            <div className="text-center p-8">
              <div className="text-3xl mb-2">🖼️</div>
              <p className="text-sm text-gray-500">
                ลากรูปมาวางที่นี่ หรือ <span className="text-purple-600">คลิกเพื่อเลือก</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — ไม่เกิน 20MB</p>
            </div>
          )}

          {/* เปลี่ยนรูป */}
          {preview && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setFile(null)
                setPreview(null)
              }}
              className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full hover:bg-black/70"
            >
              เปลี่ยนรูป
            </button>
          )}
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">ชื่อผลงาน <span className="text-red-400">*</span></label>
          <input
            type="text"
            required
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="ชื่อผลงานของคุณ"
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">คำอธิบาย</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="เล่าเรื่องราวเบื้องหลังผลงาน..."
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
            placeholder="fanart, oc, digital — คั่นด้วยจุลภาค"
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />
          {/* Tag preview */}
          {form.tags && (
            <div className="flex flex-wrap gap-1 mt-1">
              {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* NSFW toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setForm(p => ({ ...p, is_nsfw: !p.is_nsfw }))}
            className={`
              w-10 h-6 rounded-full transition-colors relative
              ${form.is_nsfw ? 'bg-red-400' : 'bg-gray-200'}
            `}
          >
            <div className={`
              absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
              ${form.is_nsfw ? 'translate-x-5' : 'translate-x-1'}
            `} />
          </div>
          <span className="text-sm">เนื้อหาสำหรับผู้ใหญ่ (NSFW)</span>
        </label>

        {/* Progress bar */}
        {uploading && (
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Error */}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={!file || !form.title || uploading}
          className="bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? `กำลัง upload... ${progress}%` : 'เผยแพร่ผลงาน'}
        </button>

      </form>
    </div>
  )
}