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

  const bgRef     = useRef<HTMLInputElement>(null)
  const spriteRef = useRef<HTMLInputElement>(null)

  const [uploadingBg,     setUploadingBg]     = useState(false)
  const [uploadingSprite, setUploadingSprite] = useState(false)
  const [error,           setError]           = useState('')

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

    const ext      = file.name.split('.').pop()
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
        <button
          onClick={() => bgRef.current?.click()}
          disabled={uploadingBg}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 text-sm transition-colors disabled:opacity-50"
        >
          {uploadingBg ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <span>🏠</span>
          )}
          {currentBgUrl ? 'เปลี่ยน Background' : 'Upload Background'}
        </button>

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
          {currentSpriteUrl ? 'เปลี่ยน Sprite' : 'Upload Sprite (PNG)'}
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
            ลบ Background
          </button>
        )}

      </div>

      {error && (
        <p className="text-sm text-red-400 mt-3">{error}</p>
      )}

      <p className="text-xs text-white/30 mt-3">
        แนะนำ: PNG โปร่งใสสำหรับ sprite — JPG หรือ PNG สำหรับ background
      </p>
    </div>
  )
}