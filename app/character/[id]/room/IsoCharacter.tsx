'use client'
import { useEffect, useRef, useState } from 'react'
import { isoToScreen } from './IsoFloor'
import type { Stats } from '@/lib/stats'
import type { Personality } from '@/lib/personality'
import { PERSONALITY_CONFIG } from '@/lib/personality'

export type GridPos = { col: number; row: number }

type CharacterMode =
  | { type: 'wander' }
  | { type: 'walking_to'; path: GridPos[]; onArrive: () => void }
  | { type: 'acting'; action: string }

type Props = {
  spriteUrl: string
  moodSpriteUrl: string | null
  stats: Stats
  personality: Personality
  gridCols: number
  gridRows: number
  tileW: number
  tileH: number
  originX: number
  originY: number
  pendingAction: { action: string; ts: number } | null
  zones: { zone_type: string; col: number; row: number }[]
  containerRef: React.RefObject<HTMLDivElement | null>
  onArrive: (action: string) => void
  onActionComplete: () => void
  onPosChange: (pos: GridPos) => void
  // mode: 'wander' | 'walking' | 'acting'
  // actingAction: string | null
}

// BFS หา path หลีกเลี่ยง occupied cells
function bfsPath(
  start: GridPos,
  goal: GridPos,
  cols: number,
  rows: number,
  occupied: Set<string>,
): GridPos[] {
  const key = (p: GridPos) => `${p.col},${p.row}`
  const isWalkable = (p: GridPos) =>
    p.col >= 0 && p.col < cols && p.row >= 0 && p.row < rows && !occupied.has(key(p))

  if (!isWalkable(goal)) {
    // หา cell ที่เดินได้ใกล้ goal ที่สุดแทน
    const candidates: GridPos[] = []
    for (let dc = -1; dc <= 1; dc++)
      for (let dr = -1; dr <= 1; dr++) {
        const p = { col: goal.col + dc, row: goal.row + dr }
        if (isWalkable(p)) candidates.push(p)
      }
    if (candidates.length === 0) return []
    candidates.sort((a, b) =>
      Math.abs(a.col - start.col) + Math.abs(a.row - start.row) -
      (Math.abs(b.col - start.col) + Math.abs(b.row - start.row))
    )
    goal = candidates[0]
  }

  const visited = new Set<string>([key(start)])
  const queue: Array<{ pos: GridPos; path: GridPos[] }> = [{ pos: start, path: [] }]

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!
    const next = path.concat(pos)

    if (pos.col === goal.col && pos.row === goal.row) return next.slice(1)

    for (const [dc, dr] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nb = { col: pos.col + dc, row: pos.row + dr }
      const k = key(nb)
      if (!visited.has(k) && isWalkable(nb)) {
        visited.add(k)
        queue.push({ pos: nb, path: next })
      }
    }
  }
  return [] // ไม่มีทาง
}

function randomWalkableCell(cols: number, rows: number, occupied: Set<string>): GridPos {
  const candidates: GridPos[] = []
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++)
      if (!occupied.has(`${c},${r}`)) candidates.push({ col: c, row: r })
  if (candidates.length === 0) return { col: 0, row: 0 }
  return candidates[Math.floor(Math.random() * candidates.length)]
}

type Mood = 'happy' | 'normal' | 'sad'
function getMood(stats: Stats): Mood {
  const avg = (stats.hunger + stats.happiness + stats.energy) / 3
  if (avg >= 60) return 'happy'
  if (avg >= 30) return 'normal'
  return 'sad'
}

function getFilter(mood: Mood, energy: number): string {
  const filters = ['drop-shadow(0 4px 12px rgba(0,0,0,0.5))']
  if (mood === 'happy') filters.push('brightness(1.15) saturate(1.3)')
  else if (mood === 'sad') filters.push('brightness(0.65) saturate(0.4) hue-rotate(200deg)')
  else if (energy < 30) filters.push('brightness(0.8) saturate(0.6)')
  return filters.join(' ')
}

export default function IsoCharacter({
  spriteUrl, moodSpriteUrl, stats, personality,
  gridCols, gridRows, tileW, tileH, originX, originY,
  pendingAction, zones, onArrive, onActionComplete, onPosChange,
  containerRef,
}: Props) {
  const [pos, setPos] = useState<GridPos>({ col: Math.floor(gridCols / 2), row: Math.floor(gridRows / 2) })
  const [facing, setFacing] = useState<'left' | 'right'>('right')
  const [spriteLoaded, setSpriteLoaded] = useState(false)

  const [currentMode, setCurrentMode] = useState<'idle' | 'walking' | 'acting'>('idle')
  const [currentAction, setCurrentAction] = useState<string | null>(null)

  const posRef = useRef<GridPos>({ col: Math.floor(gridCols / 2), row: Math.floor(gridRows / 2) })
  const modeRef = useRef<CharacterMode>({ type: 'wander' })
  const waitRef = useRef(false)
  const targetRef = useRef<GridPos | null>(null)
  const wanderPathRef = useRef<GridPos[]>([])

  const mood = getMood(stats)
  const config = PERSONALITY_CONFIG[personality] ?? PERSONALITY_CONFIG['friendly']

  useEffect(() => {
    if (!pendingAction) return

    const ACTION_ZONE: Record<string, string> = {
      feed: 'table', sleep: 'bed', bath: 'bath', play: 'play',
      custom_1: 'custom_1', custom_2: 'custom_2', custom_3: 'custom_3',
      custom_4: 'custom_4', custom_5: 'custom_5',
    }

    const zoneType = ACTION_ZONE[pendingAction.action]
    const zone = zones.find(z => z.zone_type === zoneType)
    const target: GridPos = zone
      ? { col: zone.col, row: zone.row }
      : { col: Math.floor(gridCols / 2), row: Math.floor(gridRows / 2) }

    const occupied = new Set(zones.map(z => `${z.col},${z.row}`))
    const path = bfsPath(posRef.current, target, gridCols, gridRows, occupied)

    modeRef.current = {
      type: 'walking_to',
      path: path.length > 0 ? path : [target],
      onArrive: () => {
        modeRef.current = { type: 'acting', action: pendingAction.action }
        onArrive(pendingAction.action)
        setTimeout(() => {
          modeRef.current = { type: 'wander' }
          onActionComplete()
        }, 1500)
      },
    }
  }, [pendingAction?.ts])

  // movement loop — ทุก N ms เดิน 1 step
  useEffect(() => {
    const baseInterval = 300  // ms ต่อ 1 step
    const MIN_WAIT = 1500
    const MAX_WAIT = 4000

    const interval = setInterval(() => {
      const mode = modeRef.current

      if (mode.type === 'acting') {
        setCurrentMode('acting')
        setCurrentAction(mode.action)
        return
      }

      if (mode.type === 'walking_to') {
        const current = posRef.current

        // ถึงปลายทางแล้ว
        if (mode.path.length === 0) {
          mode.onArrive()
          return
        }

        setCurrentMode('walking')
        const next = mode.path.shift()!
        setFacing(next.col > current.col ? 'right' : next.col < current.col ? 'left' : facing)
        posRef.current = next
        setPos(next)
        onPosChange(next)
        return
      }

      // wander mode
      if (waitRef.current) return

      const occupied = new Set(zones.map(z => `${z.col},${z.row}`))
      const current = posRef.current
      if (targetRef.current === null) targetRef.current = randomWalkableCell(gridCols, gridRows, occupied)
      const target = targetRef.current

      if (current.col === target.col && current.row === target.row) {
        setCurrentMode('idle')
        setCurrentAction(null)
        waitRef.current = true
        const wait = (MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT)) * config.waitMultiplier
        setTimeout(() => {
          targetRef.current = randomWalkableCell(gridCols, gridRows, occupied)
          wanderPathRef.current = []
          waitRef.current = false
        }, wait)
        return
      }

      // หา path ผ่าน BFS ถ้ายังไม่มี
      if (!wanderPathRef.current || wanderPathRef.current.length === 0) {
        wanderPathRef.current = bfsPath(current, target, gridCols, gridRows, occupied)
        if (wanderPathRef.current.length === 0) {
          // ไม่มีทาง สุ่ม target ใหม่
          targetRef.current = randomWalkableCell(gridCols, gridRows, occupied)
          return
        }
      }

      const next = wanderPathRef.current.shift()!
      if (next.col > current.col) setFacing('right')
      else if (next.col < current.col) setFacing('left')
      setCurrentMode('walking')
      posRef.current = next
      setPos(next)
      onPosChange(next)

    }, baseInterval / config.speedMultiplier)

    return () => clearInterval(interval)
  }, [personality, gridCols, gridRows])

  const imgRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    if (imgRef.current?.complete) setSpriteLoaded(true)
  }, [])

  // แปลง grid pos → screen pos
  const screen = isoToScreen(pos.col, pos.row, tileW, tileH, originX, originY)
  const rect = containerRef.current?.getBoundingClientRect()
  const canvasW = (gridCols + gridRows) * (tileW / 2) + tileW
  const svgH = (gridCols + gridRows) * (tileH / 2)
  const scaleX = rect ? rect.width / canvasW : 1
  const scaleY = rect ? rect.height / (svgH + tileH) : 1
  const cssX = screen.x * scaleX
  const cssY = screen.y * scaleY
  const breatheSpeed = mood === 'happy' ? '2.5s' : mood === 'sad' ? '5s' : '3.5s'
  const isSitting = stats.energy < 15


  function getAnimation(): string {
    if (!spriteLoaded) return 'none'
    if (currentMode === 'walking') return `walk ${0.6 / config.speedMultiplier}s ease-in-out infinite`
    if (currentMode === 'acting') {
      if (currentAction === 'feed') return 'act_feed 0.5s ease-in-out infinite'
      if (currentAction === 'play') return 'act_play 0.4s ease-in-out infinite'
      if (currentAction === 'bath') return 'act_bath 0.4s ease-in-out infinite'
      if (currentAction === 'sleep') return 'act_sleep 3s ease-in-out infinite'
      if (currentAction === 'act_read') return 'act_read 2s ease-in-out infinite' //
      if (currentAction === 'act_dance') return 'act_dance 0.6s ease-in-out infinite' //
    }
    if (mood === 'happy') return 'happy_bounce 1.5s ease-in-out infinite'
    if (mood === 'sad') return 'sad_droop 3s ease-in-out infinite'
    if (stats.energy < 30) return 'breathe 5s ease-in-out infinite'
    return `breathe ${breatheSpeed} ease-in-out infinite`
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: cssX,
        top: cssY,
        transform: 'translate(-50%, -100%)',
        height: tileH * 3,
        zIndex: (pos.col + pos.row) * 10,
        pointerEvents: 'none',
        transition: `left 300ms linear, top 300ms linear`,
      }}
    >
      <div style={{
        height: '100%',
        position: 'relative',
        transform: [
          facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
          isSitting ? 'scaleY(0.6) translateY(30%)' : '',
        ].join(' '),
        transition: 'transform 0.3s ease',
      }}>
        {/* แสดง mood sprite ถ้ามี ไม่งั้นแสดง base sprite */}
        <img
          ref={imgRef}
          src={moodSpriteUrl ?? spriteUrl}
          alt="character"
          onLoad={() => setSpriteLoaded(true)}
          draggable={false}
          style={{
            height: '100%',
            width: 'auto',
            objectFit: 'contain',
            imageRendering: 'pixelated',
            animation: getAnimation(),
            transformOrigin: 'bottom center',
            filter: getFilter(mood, stats.energy),
          }}
        />
      </div>
    </div>
  )
}