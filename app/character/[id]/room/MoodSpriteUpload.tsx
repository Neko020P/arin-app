'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MOODS = [
  { id: 'happy',     label: 'Happy',     emoji: '😊' },
  { id: 'sad',       label: 'Sad',       emoji: '😢' },
  { id: 'angry',     label: 'Angry',     emoji: '😠' },
  { id: 'surprised', label: 'Surprised', emoji: '😲' },
  { id: 'tired',     label: 'Tired',     emoji: '😴' },
]

type Props = {
  characterId: string
  currentSprites: Record<string, string>
  onUpdate: (sprites: Record<string, string>) => void
}

export default function MoodSpriteUpload({ characterId, currentSprites, onUpdate }: Props) {
  const supabase = createClient()
  const [uploading, setUploading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function uploadMoodSprite(mood: string, file: File) {
    setUploading(mood)

    const ext  = file.name.split('.').pop()
    const path = `mood-sprites/${characterId}/${mood}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('character-parts')
      .upload(path, file, { upsert: true })

    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage
        .from('character-parts')
        .getPublicUrl(path)

      const nextSprites = { ...currentSprites, [mood]: publicUrl }

      await supabase
        .from('characters')
        .update({ mood_sprites: nextSprites })
        .eq('id', characterId)

      onUpdate(nextSprites)
    }

    setUploading(null)
  }

  async function removeMoodSprite(mood: string) {
    const nextSprites = { ...currentSprites }
    delete nextSprites[mood]

    await supabase
      .from('characters')
      .update({ mood_sprites: nextSprites })
      .eq('id', characterId)

    onUpdate(nextSprites)
  }

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2
                   rounded-xl border border-white/10 text-white/50 text-sm
                   hover:bg-white/5 transition-colors"
      >
        <span>😊 สีหน้าตามอารมณ์</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-2">
          {MOODS.map(({ id, label, emoji }) => {
            const hasSprite = !!currentSprites[id]

            return (
              <div key={id}
                className="border border-white/10 rounded-xl px-3 py-2
                           flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <span className="text-lg">{emoji}</span>
                  <span>{label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* preview */}
                  {hasSprite && (
                    <img
                      src={currentSprites[id]}
                      alt={label}
                      className="h-8 w-8 object-contain rounded"
                    />
                  )}

                  {/* upload */}
                  <input
                    type="file"
                    accept="image/png,image/webp"
                    className="hidden"
                    ref={el => { fileRefs.current[id] = el }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) uploadMoodSprite(id, file)
                    }}
                  />
                  <button
                    onClick={() => fileRefs.current[id]?.click()}
                    disabled={uploading === id}
                    className="text-xs px-2 py-1 rounded-lg border border-white/20
                               text-white/50 hover:bg-white/10 transition-colors
                               disabled:opacity-40"
                  >
                    {uploading === id ? '...' : hasSprite ? '🔄' : '📁'}
                  </button>

                  {/* ลบ */}
                  {hasSprite && (
                    <button
                      onClick={() => removeMoodSprite(id)}
                      className="text-xs px-2 py-1 rounded-lg border border-red-500/20
                                 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}