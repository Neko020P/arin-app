//RoomEditor.tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

type Props = {
  characterId: string
  currentBgUrl: string | null
  currentSpriteUrl: string | null
}

export default function RoomEditor({
  characterId,
  currentBgUrl,
  currentSpriteUrl,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const bgRef = useRef<HTMLInputElement>(null)
  const spriteRef = useRef<HTMLInputElement>(null)

  const [uploadingBg, setUploadingBg] = useState(false)
  const [uploadingSprite, setUploadingSprite] = useState(false)
  const [error, setError] = useState('')
  const [showBgTooltip, setShowBgTooltip] = useState(false)
  const [showSpriteTooltip, setShowSpriteTooltip] = useState(false)

  async function uploadFile(
    file: File,
    field: 'room_bg_url' | 'room_sprite_url',
    setLoading: (v: boolean) => void
  ) {
    if (!file.type.startsWith('image/')) {
      setError('รองรับเฉพาะไฟล์รูปภาพเท่านั้น')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('ไฟล์ต้องไม่เกิน 10MB')
      return
    }

    setLoading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const fileName = `rooms/${characterId}/${field}-${Date.now()}.${ext}`

    const { data: storageData, error: storageErr } = await supabase.storage
      .from('artworks')
      .upload(fileName, file, { cacheControl: '3600', upsert: true })

    if (storageErr) {
      setError(storageErr.message)
      setLoading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('artworks')
      .getPublicUrl(storageData.path)

    const { error: dbErr } = await supabase
      .from('characters')
      .update({ [field]: publicUrl })
      .eq('id', characterId)

    if (dbErr) { setError(dbErr.message) }
    else { router.refresh() }

    setLoading(false)
  }
  function downloadTemplate() {
    const canvas = document.createElement('canvas')
    canvas.width = 1920
    canvas.height = 1080
    const ctx = canvas.getContext('2d')!

    // background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, 1920, 1080)

    const GRID_COLS = 10
    const GRID_ROWS = 10

    // คำนวณ scale จาก canvas จริง (tileW=100, tileH=50) → 1920x1080
    // canvasW = (10+10) * (100/2) + 100 = 1100
    // canvasH = svgH + tileH = (10+10)*(50/2) + 50 = 550
    const canvasW = (GRID_COLS + GRID_ROWS) * 50 + 100  // 1100
    const canvasH = (GRID_COLS + GRID_ROWS) * 25 + 50   // 550

    const scaleX = 1920 / canvasW
    const scaleY = 1080 / canvasH

    const originX = (canvasW / 2) * scaleX   // = 960
    const originY = 50 * scaleY              // = tileH * scaleY

    const TW = 100 * scaleX  // tileW scaled
    const TH = 50 * scaleY   // tileH scaled

    // วาด grid
    ctx.strokeStyle = 'rgba(120,180,255,0.3)'
    ctx.lineWidth = 1.5

    for (let c = 0; c < GRID_COLS; c++) {
      for (let r = 0; r < GRID_ROWS; r++) {
        const x = originX + (c - r) * (TW / 2)
        const y = originY + (c + r) * (TH / 2)

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + TW / 2, y + TH / 2)
        ctx.lineTo(x, y + TH)
        ctx.lineTo(x - TW / 2, y + TH / 2)
        ctx.closePath()
        ctx.fillStyle = 'rgba(30,40,80,0.5)'
        ctx.fill()
        ctx.stroke()
      }
    }

    // label
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('ARIN Room Background Template — 1920×1080px', 960, 40)
    ctx.font = '18px sans-serif'
    ctx.fillStyle = 'rgba(120,180,255,0.6)'
    ctx.fillText('Draw your background to fit this grid, then upload', 960, 70)

    const a = document.createElement('a')
    a.download = 'arin-room-template.png'
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">

        {/* Upload background */}
        <input
          ref={bgRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) uploadFile(f, 'room_bg_url', setUploadingBg)
          }}
        />

        {/* BG Button + Tooltip */}
        <div className="relative"
          onMouseEnter={() => setShowBgTooltip(true)}
          onMouseLeave={() => setShowBgTooltip(false)}>
          <button
            onClick={() => bgRef.current?.click()}
            disabled={uploadingBg}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 text-sm transition-colors disabled:opacity-50"
          >
            {uploadingBg ? <span className="animate-spin">⏳</span> : <span>🏠</span>}
            {currentBgUrl ? 'Edit Background' : 'Upload Background'}
          </button>

          {/* Tooltip */}
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            width: 260,
            background: 'rgba(15,20,40,0.97)',
            border: '1px solid rgba(120,180,255,0.2)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 12,
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.6,
            zIndex: 100,
            pointerEvents: 'none',
            opacity: 0,
            transition: 'opacity 0.15s',
          }}
            className="group-hover:opacity-100"
          >
            <div style={{ fontWeight: 600, color: 'white', marginBottom: 6 }}>📐 แนะนำสำหรับ Background</div>
            <div>• ขนาด: <b>1920×1080px</b> (16:9)</div>
            <div>• ฟอร์แมต: JPG หรือ PNG</div>
            <div>• ภาพควรเป็นมุมมอง <b>isometric</b> (เอียง 30°)</div>
            <div>• พื้นห้องอยู่กลางภาพ เว้นขอบไว้เป็น wall</div>
            <div style={{ marginTop: 8, color: 'rgba(120,180,255,0.8)' }}>
              💡 ดาวน์โหลด template ด้านล่างเพื่อใช้เป็นแนวทาง
            </div>
          </div>
        </div>

        {/* Upload sprite */}
        <input
          ref={spriteRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) uploadFile(f, 'room_sprite_url', setUploadingSprite)
          }}
        />
        <button
          onClick={() => spriteRef.current?.click()}
          disabled={uploadingSprite}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 text-sm transition-colors disabled:opacity-50"
        >
          {uploadingSprite ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <span>🎨</span>
          )}
          {currentSpriteUrl ? 'Edit Sprite' : 'Upload Sprite (PNG)'}
        </button>

        {/* Reset bg */}
        {currentBgUrl && (
          <button
            onClick={async () => {
              await supabase
                .from('characters')
                .update({ room_bg_url: null })
                .eq('id', characterId)
              router.refresh()
            }}
            className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400/70 hover:bg-red-500/10 text-sm transition-colors"
          >
            Remove Background
          </button>
        )}

        {/* Download template */}
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/50 hover:bg-white/10 text-sm transition-colors"
        >
          📥 Download Template
        </button>

      </div>

      {error && (
        <p className="text-sm text-red-400 mt-3">{error}</p>
      )}

      <p className="text-xs text-white/30 mt-3">
        Tip: Transparent PNG for character/item sprites — JPG or PNG for background assets.
      </p>
    </div>
  )
}