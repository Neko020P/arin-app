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
}

// ---- BFS ---------------------------------------------------------------
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

  // ถ้า goal ถูก block หา cell ติดกันที่เดินได้ใกล้ start ที่สุด
  let actualGoal = goal
  if (!isWalkable(goal)) {
    let best: GridPos | null = null
    let bestDist = Infinity
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue
        const p = { col: goal.col + dc, row: goal.row + dr }
        if (!isWalkable(p)) continue
        const d = Math.abs(p.col - start.col) + Math.abs(p.row - start.row)
        if (d < bestDist) { bestDist = d; best = p }
      }
    }
    if (!best) return []
    actualGoal = best
  }

  // start === goal ไม่ต้องเดิน
  if (start.col === actualGoal.col && start.row === actualGoal.row) return []

  const visited = new Set<string>([key(start)])
  const queue: Array<{ pos: GridPos; path: GridPos[] }> = [{ pos: start, path: [] }]

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!
    for (const [dc, dr] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as [number, number][]) {
      const nb: GridPos = { col: pos.col + dc, row: pos.row + dr }
      const k = key(nb)
      if (visited.has(k) || !isWalkable(nb)) continue
      visited.add(k)
      const newPath = [...path, nb]
      if (nb.col === actualGoal.col && nb.row === actualGoal.row) return newPath
      queue.push({ pos: nb, path: newPath })
    }
  }
  return []
}

function buildOccupied(zones: { col: number; row: number }[]): Set<string> {
  return new Set(zones.map(z => `${z.col},${z.row}`))
}

function randomWalkableCell(cols: number, rows: number, occupied: Set<string>): GridPos {
  const candidates: GridPos[] = []
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++)
      if (!occupied.has(`${c},${r}`)) candidates.push({ col: c, row: r })
  if (candidates.length === 0) return { col: 0, row: 0 }
  return candidates[Math.floor(Math.random() * candidates.length)]
}
// ---- helpers -----------------------------------------------------------

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

// ---- component ---------------------------------------------------------
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
  const facingRef = useRef<'left' | 'right'>('right')        // fix: stale closure
  const zonesRef = useRef(zones)                              // fix: always-fresh zones
  useEffect(() => { zonesRef.current = zones }, [zones])

  const mood = getMood(stats)
  const config = PERSONALITY_CONFIG[personality] ?? PERSONALITY_CONFIG['friendly']

  // ---- pendingAction → walk to zone -----------------------------------
  useEffect(() => {
    if (!pendingAction) return

    const ACTION_ZONE: Record<string, string> = {
      feed: 'table', sleep: 'bed', bath: 'bath', play: 'play',
      custom_1: 'custom_1', custom_2: 'custom_2', custom_3: 'custom_3',
      custom_4: 'custom_4', custom_5: 'custom_5',
    }

    const zoneType = ACTION_ZONE[pendingAction.action]
    const zone = zonesRef.current.find(z => z.zone_type === zoneType)

    // หา cell ติดกับ zone ที่เดินได้ใกล้ character ที่สุด
    const occupied = buildOccupied(zonesRef.current)
    let target: GridPos
    if (zone) {
      const adjacent = [
        { col: zone.col - 1, row: zone.row },
        { col: zone.col + 1, row: zone.row },
        { col: zone.col, row: zone.row - 1 },
        { col: zone.col, row: zone.row + 1 },
      ].filter(p =>
        p.col >= 0 && p.col < gridCols &&
        p.row >= 0 && p.row < gridRows &&
        !occupied.has(`${p.col},${p.row}`)
      )
      adjacent.sort((a, b) =>
        (Math.abs(a.col - posRef.current.col) + Math.abs(a.row - posRef.current.row)) -
        (Math.abs(b.col - posRef.current.col) + Math.abs(b.row - posRef.current.row))
      )
      target = adjacent[0] ?? { col: zone.col, row: zone.row }
    } else {
      target = { col: Math.floor(gridCols / 2), row: Math.floor(gridRows / 2) }
    }

    const path = bfsPath(posRef.current, target, gridCols, gridRows, occupied)

    modeRef.current = {
      type: 'walking_to',
      path,
      onArrive: () => {
        modeRef.current = { type: 'acting', action: pendingAction.action }
        onArrive(pendingAction.action)
        setTimeout(() => {
          modeRef.current = { type: 'wander' }
          wanderPathRef.current = []
          targetRef.current = null
          onActionComplete()
        }, 1500)
      },
    }
  }, [pendingAction?.ts]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- movement loop --------------------------------------------------
  useEffect(() => {
    const baseInterval = 300
    const MIN_WAIT = 1500
    const MAX_WAIT = 4000

    const interval = setInterval(() => {
      const mode = modeRef.current

      // acting
      if (mode.type === 'acting') {
        setCurrentMode('acting')
        setCurrentAction(mode.action)
        return
      }

      // walking to target zone
      if (mode.type === 'walking_to') {
        if (mode.path.length === 0) {
          mode.onArrive()
          return
        }
        const current = posRef.current
        const next = mode.path.shift()!
        const newFacing = next.col > current.col ? 'right' : next.col < current.col ? 'left' : facingRef.current
        facingRef.current = newFacing
        setFacing(newFacing)
        setCurrentMode('walking')
        posRef.current = next
        setPos(next)
        onPosChange(next)
        return
      }

      // wander
      if (waitRef.current) return

      const occupied = buildOccupied(zonesRef.current)  // fresh every tick (cheap set build)
      const current = posRef.current

      if (targetRef.current === null) {
        targetRef.current = randomWalkableCell(gridCols, gridRows, occupied)
        wanderPathRef.current = []
      }
      const target = targetRef.current

      // ถึง target แล้ว — หยุดรอ
      if (current.col === target.col && current.row === target.row) {
        setCurrentMode('idle')
        setCurrentAction(null)
        waitRef.current = true
        const wait = (MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT)) * config.waitMultiplier
        setTimeout(() => {
          // สร้าง occupied ใหม่ตอน pick target ใหม่ (fresh)
          const freshOccupied = buildOccupied(zonesRef.current)
          targetRef.current = randomWalkableCell(gridCols, gridRows, freshOccupied)
          wanderPathRef.current = []
          waitRef.current = false
        }, wait)
        return
      }

      // คำนวณ path ใหม่ถ้ายังไม่มี
      if (wanderPathRef.current.length === 0) {
        const path = bfsPath(current, target, gridCols, gridRows, occupied)
        if (path.length === 0) {
          // ไม่มีทาง → สุ่ม target ใหม่
          targetRef.current = randomWalkableCell(gridCols, gridRows, occupied)
          wanderPathRef.current = []
          return
        }
        wanderPathRef.current = path
      }

      const next = wanderPathRef.current.shift()!
      const newFacing = next.col > current.col ? 'right' : next.col < current.col ? 'left' : facingRef.current
      facingRef.current = newFacing
      setFacing(newFacing)
      setCurrentMode('walking')
      posRef.current = next
      setPos(next)
      onPosChange(next)

    }, baseInterval / config.speedMultiplier)

    return () => clearInterval(interval)
  }, [personality, gridCols, gridRows]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- render ---------------------------------------------------------
  const imgRef = useRef<HTMLImageElement>(null)
  useEffect(() => { if (imgRef.current?.complete) setSpriteLoaded(true) }, [])

  const screen = isoToScreen(pos.col, pos.row, tileW, tileH, originX, originY)
  const rect = containerRef.current?.getBoundingClientRect()
  const svgW = (gridCols + gridRows) * (tileW / 2)
  const svgH = (gridCols + gridRows) * (tileH / 2)
  const rW = rect?.width ?? svgW
  const rH = rect?.height ?? svgH
  const scale = Math.min(rW / svgW, rH / svgH)
  const offsetX = (rW - svgW * scale) / 2
  const offsetY = (rH - svgH * scale) / 2
  const vbX = originX - svgW / 2
  const vbY = originY - tileH / 2
  const cssX = (screen.x - vbX) * scale + offsetX
  const cssY = (screen.y - vbY) * scale + offsetY
  const breatheSpeed = mood === 'happy' ? '2.5s' : mood === 'sad' ? '5s' : '3.5s'
  function getAnimation(): string {
    if (!spriteLoaded) return 'none'
    if (currentMode === 'walking') return `walk ${0.6 / config.speedMultiplier}s ease-in-out infinite`
    if (currentMode === 'acting') {
      if (currentAction === 'feed') return 'act_feed 0.5s ease-in-out infinite'
      if (currentAction === 'play') return 'act_play 0.4s ease-in-out infinite'
      if (currentAction === 'bath') return 'act_bath 0.4s ease-in-out infinite'
      if (currentAction === 'act_read') return 'act_read 2s ease-in-out infinite'
      if (currentAction === 'act_dance') return 'act_dance 0.6s ease-in-out infinite'
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
].join(' '),
        transition: 'transform 0.3s ease',
      }}>
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