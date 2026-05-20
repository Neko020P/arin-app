'use client'
import { useState } from 'react'
import { calcCurrentStats } from '@/lib/stats'
import type { Stats } from '@/lib/stats'
import RoomCanvas from './RoomCanvas'
import RoomEditor from './RoomEditor'
import StatsBar from './StatsBar'
import ActionPanel from './ActionPanel'
import ZoneEditor from './ZoneEditor'
import MoodSpriteUpload from './MoodSpriteUpload'
import { Personality } from '@/lib/personality'
import PersonalitySelector from './PersonalitySelector'

export type RoomZone = {
  id: string
  character_id: string
  zone_type: 'bed' | 'table' | 'bath' | 'play'
  image_url: string | null
  x: number
  y: number
  width: number
}

type Props = {
  characterId: string
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
        />
      </div>

      <div className="px-4 py-3 flex justify-center">
        <StatsBar stats={liveStats} />
      </div>

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
          <ZoneEditor
            characterId={characterId}
            zones={zones}
            onZonesChange={setZones}
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
        </div>
      )}
    </div>
  )
}
// 'use client'
// import { useState } from 'react'
// import { calcCurrentStats } from '@/lib/stats'
// import type { Stats } from '@/lib/stats'
// import RoomCanvas from './RoomCanvas'
// import RoomEditor from './RoomEditor'
// import StatsBar from './StatsBar'
// import ActionPanel from './ActionPanel'

// type Props = {
//   characterId: string
//   spriteUrl: string | null
//   bgUrl: string | null
//   initialStats: Stats & { last_updated: string }
//   isOwner: boolean
//   currentBgUrl: string | null
//   currentSpriteUrl: string | null
// }

// export default function RoomClient({
//   characterId,
//   spriteUrl,
//   bgUrl,
//   initialStats,
//   isOwner,
//   currentBgUrl,
//   currentSpriteUrl,
// }: Props) {
//   // คำนวณ decay ตั้งแต่แรก load
//   const [liveStats, setLiveStats] = useState<Stats>(() =>
//     calcCurrentStats(initialStats, initialStats.last_updated)
//   )

//   if (!spriteUrl) {
//     return (
//       <div className="flex-1 flex items-center justify-center text-white/40">
//         ยังไม่มีรูป character — ใส่ ref sheet ก่อนนะครับ
//       </div>
//     )
//   }

//   return (
//     <div className="flex-1 flex flex-col">
//       {/* Canvas */}
//       <div className="flex-1 flex items-center justify-center p-4">
//         <RoomCanvas
//           spriteUrl={spriteUrl}
//           bgUrl={bgUrl}
//           stats={liveStats}
//         />
//       </div>

//       {/* Stats bar */}
//       <div className="px-4 py-3 flex justify-center">
//         <StatsBar stats={liveStats} />
//       </div>

//       {/* Actions + Editor — เฉพาะเจ้าของ */}
//       {isOwner && (
//         <div className="border-t border-white/10 p-4 flex flex-col items-center gap-4">
//           <ActionPanel
//             characterId={characterId}
//             liveStats={liveStats}
//             onUpdate={setLiveStats}
//           />
//           <RoomEditor
//             characterId={characterId}
//             currentBgUrl={currentBgUrl}
//             currentSpriteUrl={currentSpriteUrl}
//           />
//         </div>
//       )}
//     </div>
//   )
// }