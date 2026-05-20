'use client'
import { useEffect, useRef, useState } from 'react'
import type { Stats } from '@/lib/stats'
import type { RoomZone } from './RoomClient'
import SpeechBubble from './SpeechBubble'
import ParticleEffect from './ParticleEffect'
import { PERSONALITY_CONFIG, type Personality } from '@/lib/personality'

const SPEED_WANDER = 0.06
const SPEED_WALK = 0.12   // เดินไป zone เร็วกว่าปกติ

type CharacterMode =
  | { type: 'wander' }
  | { type: 'walking_to'; targetX: number; onArrive: () => void }
  | { type: 'acting'; action: string }

type Mood = 'happy' | 'normal' | 'sad'

function getMood(stats: Stats): Mood {
  const avg = (stats.hunger + stats.happiness + stats.energy) / 3
  if (avg >= 60) return 'happy'
  if (avg >= 30) return 'normal'
  return 'sad'
}

function getCurrentMoodSprite(
  stats: Stats,
  sprites: Record<string, string>
): string | null {
  if (stats.energy < 20) return sprites.tired ?? null
  if (stats.happiness < 20) return sprites.sad ?? null
  if (stats.hunger < 20) return sprites.angry ?? null
  const avg = (stats.hunger + stats.happiness + stats.energy) / 3
  if (avg > 75) return sprites.happy ?? null
  return null
}

const DEFAULT_ZONE_EMOJI: Record<string, string> = {
  bed: '🛏️',
  table: '🍽️',
  bath: '🛁',
  play: '🎮',
}

type Props = {
  spriteUrl: string
  bgUrl: string | null
  stats: Stats
  zones: RoomZone[]
  pendingAction: { action: string; ts: number } | null
  onActionComplete: () => void
  moodSprites: Record<string, string>
  personality: Personality
}

export default function RoomCanvas({
  spriteUrl,
  bgUrl,
  stats,
  zones,
  pendingAction,
  onActionComplete,
  moodSprites,
  personality,
}: Props) {
  const [spriteLoaded, setSpriteLoaded] = useState(false)
  const [posX, setPosX] = useState(50)
  const [facing, setFacing] = useState<'left' | 'right'>('right')
  const [actingAction, setActingAction] = useState<string | null>(null)

  const posXRef = useRef(50)
  const targetRef = useRef(5 + Math.random() * 90)
  const waitRef = useRef(false)
  const modeRef = useRef<CharacterMode>({ type: 'wander' })
  const [lastAction, setLastAction] = useState<string | null>(null)

  const mood = getMood(stats)
  const moodSpriteUrl = getCurrentMoodSprite(stats, moodSprites)

  // รับ pendingAction จาก ActionPanel → เปลี่ยน mode เป็น walking_to
  useEffect(() => {
    if (!pendingAction) return

    const ACTION_ZONE: Record<string, string> = {
      feed: 'table',
      sleep: 'bed',
      bath: 'bath',
      play: 'play',
    }

    const zoneType = ACTION_ZONE[pendingAction.action]
    const zone = zones.find(z => z.zone_type === zoneType)
    const targetX = zone ? zone.x + zone.width / 2 : 50

    modeRef.current = {
      type: 'walking_to',
      targetX,
      onArrive: () => {
        modeRef.current = { type: 'acting', action: pendingAction.action }
        setActingAction(pendingAction.action)
        setLastAction(pendingAction.action)

        // animate 1.5 วิ แล้วกลับ wander
        setTimeout(() => {
          setActingAction(null)
          setLastAction(null)
          modeRef.current = { type: 'wander' }
          onActionComplete()
        }, 1500)
      },
    }
  }, [pendingAction?.ts])

  useEffect(() => {
    const MIN_WAIT = 800
    const MAX_WAIT = 2500

    const interval = setInterval(() => {
      const mode = modeRef.current

      if (mode.type === 'acting') return

      if (mode.type === 'walking_to') {
        const diff = mode.targetX - posXRef.current

        if (Math.abs(diff) < SPEED_WALK) {
          // ถึงแล้ว
          posXRef.current = mode.targetX
          setPosX(mode.targetX)
          mode.onArrive()
        } else {
          // เดินตรงไป targetX เลย — ไม่ผ่าน waypoint
          const next = posXRef.current + (diff > 0 ? SPEED_WALK : -SPEED_WALK)
          posXRef.current = next
          setPosX(next)
          setFacing(diff > 0 ? 'right' : 'left')
        }
        return  // ← return ตรงนี้สำคัญมาก ต้องไม่ตกลง wander
      }

      // wander mode — ทำงานเฉพาะเมื่อ mode === 'wander'
      if (mode.type !== 'wander') return  // ← เพิ่มบรรทัดนี้
      if (waitRef.current) return

      const target = targetRef.current
      const current = posXRef.current
      const diff = target - current

      if (Math.abs(diff) < SPEED_WANDER) {
        posXRef.current = target
        setPosX(target)
        waitRef.current = true

        const config = PERSONALITY_CONFIG[personality]
        const baseWait = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT)
        const waitTime = baseWait * config.waitMultiplier
        setTimeout(() => {
          const config = PERSONALITY_CONFIG[personality]
          const min = config.stayNearCenter ? 25 : 5
          const max = config.stayNearCenter ? 75 : 95
          targetRef.current = min + Math.random() * (max - min)
          waitRef.current = false
        }, waitTime)
      } else {
        const config = PERSONALITY_CONFIG[personality]
        const baseSpeed = stats.energy < 30 ? SPEED_WANDER * 0.4 : SPEED_WANDER
        const currentSpeed = baseSpeed * config.speedMultiplier
        const next = current + (diff > 0 ? currentSpeed : -currentSpeed)
        posXRef.current = next
        setPosX(next)
        setFacing(diff > 0 ? 'right' : 'left')
      }
    }, 16)

    return () => clearInterval(interval)
  }, [])

  const isSitting = stats.energy < 15

  const breatheSpeed = mood === 'happy' ? '2.5s' : mood === 'sad' ? '5s' : '3.5s'

  const getFilter = () => {
    const filters = ['drop-shadow(0 8px 24px rgba(0,0,0,0.4))']

    if (mood === 'happy') {
      filters.push('brightness(1.15) saturate(1.3)')
      filters.push('drop-shadow(0 0 12px rgba(255,215,0,0.6))')
    } else if (mood === 'sad') {
      filters.push('brightness(0.65) saturate(0.4) hue-rotate(200deg)')
    } else if (stats.energy < 30) {
      filters.push('brightness(0.8) saturate(0.6)')
    }

    return filters.join(' ')
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        //maxWidth: 960,       
        aspectRatio: '16/9',
        width: '80%',
        background: bgUrl
          ? undefined
          : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      {bgUrl && (
        <img src={bgUrl} alt="room background"
          className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Zones */}
      {zones.map(zone => (
        <div
          key={zone.id}
          className="absolute flex items-end justify-center"
          style={{
            left: `${zone.x}%`,
            bottom: `${zone.y}%`,
            width: `${zone.width}%`,
            height: `${zone.width * 0.75}%`,
          }}
        >
          {zone.image_url ? (
            <img
              src={zone.image_url}
              alt={zone.zone_type}
              className="w-full h-full object-contain"
            //style={{ maxHeight: '30%' }}
            />
          ) : (
            <span style={{ fontSize: `${zone.width * 0.6}px` }}>
              {DEFAULT_ZONE_EMOJI[zone.zone_type]}
            </span>
          )}
        </div>
      ))}

      {/* Action animation overlay */}
      {actingAction && (
        <div
          className="absolute text-4xl animate-bounce"
          style={{ left: `${posXRef.current}%`, bottom: '55%', transform: 'translateX(-50%)' }}
        >
          {{ feed: '🍖', sleep: '💤', bath: '🚿', play: '🎾' }[actingAction]}
        </div>
      )}

      {/* Speech Bubble */}
      <SpeechBubble
        stats={stats}
        posX={posX}
        lastAction={lastAction}
      />

      {/* Particles */}
      <ParticleEffect
        trigger={lastAction}
        posX={posX}
        happiness={stats.happiness}
      />

      {/* Character */}
      <div
        className="absolute"
        style={{
          bottom: '15%',
          left: `${posX}%`,
          height: '55%',
          transform: 'translateX(-50%)',
        }}
      >
        <div style={{
          transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
          transition: 'transform 0.15s ease',
          height: '100%',
          position: 'relative',
        }}>
          {/* Base sprite */}
          <img
            src={spriteUrl}
            alt="character"
            onLoad={() => setSpriteLoaded(true)}
            draggable={false}
            className="h-full w-auto object-contain select-none"
            style={{
              animation: spriteLoaded
                ? `breathe ${breatheSpeed} ease-in-out infinite`
                : 'none',
              transformOrigin: 'bottom center',
              imageRendering: 'pixelated',
              filter: getFilter(),
            }}
          />

          {/* Mood sprite overlay — ซ้อนทับ base */}
          {moodSpriteUrl && (
            <img
              src={moodSpriteUrl}
              alt="mood"
              draggable={false}
              className="absolute inset-0 h-full w-auto object-contain select-none"
              style={{
                imageRendering: 'pixelated',
                animation: `breathe ${breatheSpeed} ease-in-out infinite`,
                transformOrigin: 'bottom center',
                transition: 'opacity 0.5s ease',
              }}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0%   { transform: scaleY(1); }
          30%  { transform: scaleX(1.02) scaleY(0.98); }
          50%  { transform: scaleX(0.98) scaleY(1.02); }
          70%  { transform: scaleX(1.01) scaleY(0.99); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}
