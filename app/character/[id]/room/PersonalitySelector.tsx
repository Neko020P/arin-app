'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PERSONALITY_CONFIG, type Personality } from '@/lib/personality'

type Props = {
  characterId: string
  current: Personality
  onUpdate: (p: Personality) => void
}

export default function PersonalitySelector({ characterId, current, onUpdate }: Props) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  async function handleSelect(p: Personality) {
    setSaving(true)
    await supabase
      .from('characters')
      .update({ personality: p })
      .eq('id', characterId)
    onUpdate(p)
    setSaving(false)
  }

  return (
    <div className="w-full max-w-sm">
      <p className="text-xs text-white/40 mb-2 text-center">บุคลิกตัวละคร</p>
      <div className="flex gap-2 flex-wrap justify-center">
        {(Object.entries(PERSONALITY_CONFIG) as [Personality, typeof PERSONALITY_CONFIG[Personality]][]).map(
          ([id, config]) => (
            <button
              key={id}
              disabled={saving}
              onClick={() => handleSelect(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl
                         border text-xs transition-colors
                         ${current === id
                           ? 'border-white/60 bg-white/15 text-white'
                           : 'border-white/15 text-white/50 hover:bg-white/10'
                         }`}
            >
              <span className="text-lg">{config.emoji}</span>
              <span>{config.label}</span>
            </button>
          )
        )}
      </div>
    </div>
  )
}