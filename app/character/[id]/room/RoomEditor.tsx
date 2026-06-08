'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import BgColorPicker from './Bgcolorpicker'

type Props = {
  characterId: string
  currentBgUrl: string | null
  currentSpriteUrl: string | null
  currentBgColor: string | null
  onBgColorChange: (color: string) => void
}

export default function RoomEditor({
  characterId,
  currentBgUrl,
  currentSpriteUrl,
  currentBgColor,
  onBgColorChange,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const bgRef = useRef<HTMLInputElement>(null)
  const spriteRef = useRef<HTMLInputElement>(null)

  const [uploadingBg, setUploadingBg] = useState(false)
  const [uploadingSprite, setUploadingSprite] = useState(false)
  const [error, setError] = useState('')
  const [bgColor, setBgColor] = useState(currentBgColor ?? '#302b63')

  async function uploadFile(
    file: File,
    field: 'room_bg_url' | 'room_sprite_url',
    setLoading: (v: boolean) => void
  ) {
    if (!file.type.startsWith('image/')) { setError('รองรับเฉพาะไฟล์รูปภาพเท่านั้น'); return }
    if (file.size > 10 * 1024 * 1024) { setError('ไฟล์ต้องไม่เกิน 10MB'); return }
    setLoading(true); setError('')
    const ext = file.name.split('.').pop()
    const fileName = `rooms/${characterId}/${field}-${Date.now()}.${ext}`
    const { data: storageData, error: storageErr } = await supabase.storage
      .from('artworks').upload(fileName, file, { cacheControl: '3600', upsert: true })
    if (storageErr) { setError(storageErr.message); setLoading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('artworks').getPublicUrl(storageData.path)
    const { error: dbErr } = await supabase.from('characters').update({ [field]: publicUrl }).eq('id', characterId)
    if (dbErr) setError(dbErr.message)
    else router.refresh()
    setLoading(false)
  }

  async function handleColorChange(color: string) {
    setBgColor(color)
    onBgColorChange(color)
    await supabase.from('characters').update({ room_bg_color: color }).eq('id', characterId)
  }

  function downloadTemplate() {
    const canvas = document.createElement('canvas')
    canvas.width = 1920; canvas.height = 1080
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, 1920, 1080)
    const GRID_COLS = 10, GRID_ROWS = 10
    const canvasW = (GRID_COLS + GRID_ROWS) * 50 + 100
    const canvasH = (GRID_COLS + GRID_ROWS) * 25 + 50
    const scaleX = 1920 / canvasW, scaleY = 1080 / canvasH
    const originX = (canvasW / 2) * scaleX, originY = 50 * scaleY
    const TW = 100 * scaleX, TH = 50 * scaleY
    ctx.strokeStyle = 'rgba(120,180,255,0.3)'; ctx.lineWidth = 1.5
    for (let c = 0; c < GRID_COLS; c++) {
      for (let r = 0; r < GRID_ROWS; r++) {
        const x = originX + (c - r) * (TW / 2), y = originY + (c + r) * (TH / 2)
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + TW / 2, y + TH / 2)
        ctx.lineTo(x, y + TH); ctx.lineTo(x - TW / 2, y + TH / 2); ctx.closePath()
        ctx.fillStyle = 'rgba(30,40,80,0.5)'; ctx.fill(); ctx.stroke()
      }
    }
    const a = document.createElement('a')
    a.download = 'arin-room-template.png'; a.href = canvas.toDataURL('image/png'); a.click()
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">

        <input ref={bgRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'room_bg_url', setUploadingBg) }} />
        <button onClick={() => bgRef.current?.click()} disabled={uploadingBg}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 text-sm transition-colors disabled:opacity-50">
          {uploadingBg
            ? <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
          {currentBgUrl ? 'Edit Background' : 'Upload Background'}
        </button>

        <input ref={spriteRef} type="file" accept="image/png" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'room_sprite_url', setUploadingSprite) }} />
        <button onClick={() => spriteRef.current?.click()} disabled={uploadingSprite}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 text-sm transition-colors disabled:opacity-50">
          {uploadingSprite
            ? <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>}
          {currentSpriteUrl ? 'Edit Sprite' : 'Upload Sprite (PNG)'}
        </button>

        {/* BG Color Picker */}
        <BgColorPicker
          characterId={characterId}
          current={currentBgColor}
          onChange={onBgColorChange}
        />

        {currentBgUrl && (
          <button onClick={async () => {
            await supabase.from('characters').update({ room_bg_url: null }).eq('id', characterId)
            router.refresh()
          }} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-400/70 hover:bg-red-500/10 text-sm transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Remove Background
          </button>
        )}

        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/50 hover:bg-white/10 text-sm transition-colors">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Template
        </button>

      </div>
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </div>
  )
}