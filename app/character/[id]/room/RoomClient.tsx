//RoomClient.tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { calcCurrentStats } from '@/lib/stats'
import type { Stats } from '@/lib/stats'
import RoomCanvas from './RoomCanvas'
import RoomEditor from './RoomEditor'
import StatsBar from './StatsBar'
import ActionPanel from './ActionPanel'
import MoodSpriteUpload from './MoodSpriteUpload'
import { Personality } from '@/lib/personality'
import PersonalitySelector from './PersonalitySelector'
import IsoVisitor, { type VisitorData } from './IsoVisitor'
import RelationshipPanel from './RelationshipPanel'
import { useRef } from 'react'
import TransferOwnershipPanel from './TransferOwnershipPanel'

export type RoomZone = {
  id: string
  character_id: string
  zone_type: 'bed' | 'table' | 'bath' | 'play'
  image_url: string | null
  x: number
  y: number
  width: number
  col: number
  row: number
}

type Props = {
  characterId: string
  characterName: string
  spriteUrl: string | null
  bgUrl: string | null
  initialStats: Stats & { last_updated: string }
  initialZones: RoomZone[]
  initialCharacter: {
    mood_sprites: Record<string, string> | null
    personality: string | null
  }
  isOwner: boolean
  currentBgUrl: string | null
  currentSpriteUrl: string | null
}

export default function RoomClient({
  characterId,
  characterName,
  spriteUrl,
  bgUrl,
  initialStats,
  initialZones,
  initialCharacter,
  isOwner,
  currentBgUrl,
  currentSpriteUrl,
}: Props) {
  const [liveStats, setLiveStats] = useState<Stats>(() =>
    calcCurrentStats(initialStats, initialStats.last_updated)
  )
  const [zones, setZones] = useState<RoomZone[]>(initialZones)
  const [pendingAction, setPendingAction] = useState<{ action: string; ts: number } | null>(null)

  if (!spriteUrl) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/40">
        ยังไม่มีรูป character — ใส่ ref sheet ก่อนนะครับ
      </div>
    )
  }
  const [moodSprites, setMoodSprites] = useState<Record<string, string>>(
    (initialCharacter.mood_sprites as Record<string, string>) ?? {}
  )
  const [personality, setPersonality] = useState<Personality>(
    (initialCharacter.personality as Personality) ?? 'friendly'
  )
  const supabase = createClient()
  const [visitors, setVisitors] = useState<VisitorData[]>([])
  const visitorTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!characterId) return

    async function checkVisit() {
      const res = await fetch('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      })
      const { visitors: newVisitors } = await res.json()
      console.log('raw newVisitors:', JSON.stringify(newVisitors, null, 2))

      if (newVisitors.length > 0) {
        setVisitors(prev => {
          const existing = new Set(prev.map(v => v.characterId))
          const fresh = newVisitors.filter((v: any) => !existing.has(v.characterId)).map((v: any) => ({
            ...v,
            personality: v.personality as Personality,
            tier: v.tier as 'stranger' | 'friend' | 'rival',
          }))

          fresh.forEach((v: any) => {
            if (visitorTimeoutsRef.current[v.characterId]) {
              clearTimeout(visitorTimeoutsRef.current[v.characterId])
            }
            visitorTimeoutsRef.current[v.characterId] = setTimeout(() => {
              setVisitors(p => p.filter(x => x.characterId !== v.characterId))
              delete visitorTimeoutsRef.current[v.characterId]
              createClient()
                .from('character_visits')
                .delete()
                .eq('visitor_id', v.characterId)
                .eq('host_id', characterId)
                .then(() => { })
            }, 30 * 1000)
          })

          return [...prev, ...fresh]
        })
      }
    }
    checkVisit()
    const interval = setInterval(checkVisit, 15 * 1000) // test const interval = setInterval(checkVisit, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [characterId])

  useEffect(() => {
    if (!characterId) return

    async function loadActiveVisits() {
      const supabase = createClient()
      const { data } = await supabase
        .from('character_visits')
        .select('*, visitor:visitor_id(id, name, room_sprite_url, personality)')
        .eq('host_id', characterId)
        .gt('ends_at', new Date().toISOString())

      if (!data) return

      const active = data.map((v: any) => ({
        characterId: v.visitor.id,
        name: v.visitor.name,
        spriteUrl: v.visitor.room_sprite_url ?? v.visitor.ref_sheet_url ?? '',
        personality: (v.visitor.personality ?? 'friendly') as Personality,
        tier: 'stranger' as const,
      }))

      setVisitors(prev => {
        const existing = new Set(prev.map(v => v.characterId))
        const fresh = active.filter(v => !existing.has(v.characterId))
        return [...prev, ...fresh]
      })
    }

    loadActiveVisits()
  }, [characterId])

  function handleVisitorLeave(characterId: string) {
    setVisitors(prev => prev.filter(v => v.characterId !== characterId))
  }


  async function handleZoneMove(id: string, col: number, row: number) {
    setZones(prev => prev.map(z => z.id === id ? { ...z, col, row } : z))
    await supabase
      .from('room_zones')
      .update({ col, row })
      .eq('id', id)
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <RoomCanvas
          spriteUrl={spriteUrl}
          bgUrl={bgUrl}
          stats={liveStats}
          zones={zones}
          pendingAction={pendingAction}
          onActionComplete={() => setPendingAction(null)}
          moodSprites={moodSprites}
          personality={personality}
          isOwner={isOwner}
          onZonesChange={handleZoneMove}
          visitors={visitors}
          onVisitorLeave={handleVisitorLeave}
        />
      </div>

      <div className="px-4 py-3 flex justify-center">
        <StatsBar stats={liveStats} />
      </div>
      <RelationshipPanel
        characterId={characterId}
        isOwner={isOwner}
      />

      {isOwner && (
        <div className="border-t border-white/10 p-4 flex flex-col items-center gap-4">
          <ActionPanel
            characterId={characterId}
            liveStats={liveStats}
            zones={zones}
            onUpdate={setLiveStats}
            onTriggerAction={(action) => setPendingAction({ action, ts: Date.now() })}
          />
          <PersonalitySelector
            characterId={characterId}
            current={personality}
            onUpdate={setPersonality}
          />
          <MoodSpriteUpload
            characterId={characterId}
            currentSprites={moodSprites}
            onUpdate={setMoodSprites}
          />
          <RoomEditor
            characterId={characterId}
            currentBgUrl={currentBgUrl}
            currentSpriteUrl={currentSpriteUrl}
          />
          <TransferOwnershipPanel
            characterId={characterId}
            characterName={characterName}
          />
        </div>

      )}
    </div>
  )
}
