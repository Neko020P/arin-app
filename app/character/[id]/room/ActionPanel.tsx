'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { applyAction } from '@/lib/stats'
import type { Stats } from '@/lib/stats'
import type { RoomZone } from './RoomClient'

const ACTIONS = [
  { id: 'feed',  label: 'ให้อาหาร', icon: '🍖', cooldown: 30,  zone: 'table' },
  { id: 'play',  label: 'เล่นด้วย', icon: '🎾', cooldown: 60,  zone: 'play'  },
  { id: 'bath',  label: 'อาบน้ำ',   icon: '🛁', cooldown: 120, zone: 'bath'  },
  { id: 'sleep', label: 'ให้นอน',   icon: '💤', cooldown: 180, zone: 'bed'   },
]

type Props = {
  characterId: string
  liveStats: Stats
  zones: RoomZone[]
  onUpdate: (next: Stats) => void
  onTriggerAction: (action: string) => void
}

export default function ActionPanel({
  characterId,
  liveStats,
  zones,
  onUpdate,
  onTriggerAction,
}: Props) {
  const supabase = createClient()
  const [lastUsed, setLastUsed] = useState<Record<string, number>>({})
  const [loading, setLoading]   = useState<string | null>(null)

  async function handleAction(actionId: string) {
    setLoading(actionId)

    // trigger เดินก่อน
    onTriggerAction(actionId)

    // รอ character เดินถึง (1.5s estimate) แล้วค่อย update stat
    setTimeout(async () => {
      const next = applyAction(liveStats, actionId)
      const { hunger, happiness, energy } = next

      const { error } = await supabase
        .from('character_stats')
        .update({
          hunger:    Math.round(hunger),
          happiness: Math.round(happiness),
          energy:    Math.round(energy),
          last_updated: new Date().toISOString(),
        })
        .eq('character_id', characterId)

      if (!error) {
        onUpdate(next)
        setLastUsed(prev => ({ ...prev, [actionId]: Date.now() }))
      }

      setLoading(null)
    }, 1500)
  }

  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {ACTIONS.map(({ id, label, icon, cooldown, zone }) => {
        const elapsed    = (Date.now() - (lastUsed[id] ?? 0)) / 1000
        const onCooldown = elapsed < cooldown
        const remaining  = Math.ceil(cooldown - elapsed)
        const hasZone    = zones.some(z => z.zone_type === zone)

        return (
          <button
            key={id}
            disabled={onCooldown || loading === id}
            onClick={() => handleAction(id)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl
                       border border-white/20 text-white/70 text-sm
                       hover:bg-white/10 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
            title={!hasZone ? `ยังไม่มีโซน ${zone} ในห้อง` : undefined}
          >
            <span className="text-xl">{icon}</span>
            <span className="text-xs">{label}</span>
            {!hasZone && <span className="text-[10px] text-white/30">ไม่มีโซน</span>}
            {onCooldown && <span className="text-[10px] text-white/30">{remaining}s</span>}
          </button>
        )
      })}
    </div>
  )
}
