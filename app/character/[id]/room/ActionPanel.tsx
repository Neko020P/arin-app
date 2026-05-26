'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { applyAction, applyCustomAction } from '@/lib/stats'
import type { Stats } from '@/lib/stats'
import type { RoomZone } from './RoomClient'

const ACTIONS = [
  { id: 'feed', label: 'feed', icon: '🍖', cooldown: 30, zone: 'table' },
  { id: 'play', label: 'play', icon: '🎾', cooldown: 60, zone: 'play' },
  { id: 'bath', label: 'bath', icon: '🛁', cooldown: 120, zone: 'bath' },
  { id: 'sleep', label: 'sleep', icon: '💤', cooldown: 180, zone: 'bed' },
]

type CustomData = {
  label: string
  stat_effects: Partial<Stats>
  bubble_message: string
  animation: string
}

type Props = {
  characterId: string
  characterName: string
  liveStats: Stats
  zones: RoomZone[]
  onUpdate: (next: Stats) => void
  onTriggerAction: (action: string) => void
  onChatTrigger?: (text: string) => void
}

export default function ActionPanel({
  characterId, characterName, liveStats, zones, onUpdate, onTriggerAction, onChatTrigger,
}: Props) {
  const supabase = createClient()
  const [lastUsed, setLastUsed] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const customZones = zones.filter(z => z.zone_type.startsWith('custom') && (z as any).custom_data)

  async function handleAction(actionId: string, customData?: CustomData) {
    setLoading(actionId)
    onTriggerAction(actionId)

    setTimeout(async () => {
      const next = customData
        ? applyCustomAction(liveStats, customData.stat_effects)
        : applyAction(liveStats, actionId)

      const { error } = await supabase
        .from('character_stats')
        .update({
          hunger: Math.round(next.hunger),
          happiness: Math.round(next.happiness),
          energy: Math.round(next.energy),
          social: Math.round(next.social),
          last_updated: new Date().toISOString(),
        })
        .eq('character_id', characterId)

      if (!error) {
        onUpdate(next)
        setLastUsed(prev => ({ ...prev, [actionId]: Date.now() }))
        if (customData?.bubble_message) onChatTrigger?.(customData.bubble_message)
        fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, action: actionId, characterName }),
        }).catch(() => {})
      }
      setLoading(null)
    }, 1500)
  }

  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {ACTIONS.map(({ id, label, icon, cooldown, zone }) => {
        const elapsed = (Date.now() - (lastUsed[id] ?? 0)) / 1000
        const onCooldown = elapsed < cooldown
        const remaining = Math.ceil(cooldown - elapsed)
        const hasZone = zones.some(z => z.zone_type === zone)
        return (
          <button key={id} disabled={onCooldown || loading === id} onClick={() => handleAction(id)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl border border-white/20 text-white/70 text-sm hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={!hasZone ? `No ${zone} zone in the room` : undefined}>
            <span className="text-xl">{icon}</span>
            <span className="text-xs">{label}</span>
            {!hasZone && <span className="text-[10px] text-white/30">No zone</span>}
            {onCooldown && <span className="text-[10px] text-white/30">{remaining}s</span>}
          </button>
        )
      })}

      {customZones.map(zone => {
        const custom = (zone as any).custom_data as CustomData
        const elapsed = (Date.now() - (lastUsed[zone.zone_type] ?? 0)) / 1000
        const onCooldown = elapsed < 60
        const remaining = Math.ceil(60 - elapsed)
        return (
          <button key={zone.id} disabled={onCooldown || loading === zone.zone_type}
            onClick={() => handleAction(zone.zone_type, custom)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl border border-purple-500/30 text-white/70 text-sm hover:bg-purple-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {zone.image_url
              ? <img src={zone.image_url} className="w-6 h-6 object-contain" />
              : <span className="text-xl">🪑</span>}
            <span className="text-xs truncate max-w-[60px]">{custom.label || zone.zone_type}</span>
            {onCooldown && <span className="text-[10px] text-white/30">{remaining}s</span>}
          </button>
        )
      })}
    </div>
  )
}