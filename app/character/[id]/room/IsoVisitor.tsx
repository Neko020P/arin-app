'use client'
import { useEffect, useRef, useState } from 'react'
import { isoToScreen } from './IsoFloor'
import { PERSONALITY_CONFIG } from '@/lib/personality'
import type { Personality } from '@/lib/personality'

export type VisitorData = {
  characterId: string
  name: string
  spriteUrl: string
  personality: Personality
  tier: 'stranger' | 'friend' | 'rival'
  zones?: { col: number; row: number }[]   // host room zones passed in
}

type GridPos = { col: number; row: number }

const TIER_DURATION: Record<string, number> = {
  stranger: 8000,
  friend: 20000,
  rival: 12000,
}

const TIER_BUBBLE: Record<string, string[]> = {
  stranger: ['...', 'Hello!', 'แวะมาดูหน่อย'],
  friend: ['มาเยี่ยมแล้ว!', 'คิดถึงนะ', 'เป็นยังไงบ้าง?'],
  rival: ['แค่แวะมาดู', 'ไม่ได้แพ้นะ', 'เจอกันใหม่'],
}

type Props = {
  visitor: VisitorData
  gridCols: number
  gridRows: number
  tileW: number
  tileH: number
  originX: number
  originY: number
  containerRef: React.RefObject<HTMLDivElement | null>
  canvasW: number
  onLeave: (characterId: string) => void
}

// ---- BFS (same as IsoCharacter) ----------------------------------------
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

function buildOccupied(zones?: { col: number; row: number; size_level?: number }[]): Set<string> {
  const occupied = new Set<string>()
  for (const z of zones ?? []) {
    const size = Math.min(3, Math.max(1, z.size_level ?? 1))
    for (let dc = 0; dc < size; dc++) {
      for (let dr = 0; dr < size; dr++) {
        occupied.add(`${z.col + dc},${z.row + dr}`)
      }
    }
  }
  return occupied
}

// หา entry point ที่ไม่ occupied
function safeEntryPos(gridCols: number, gridRows: number, occupied: Set<string>): GridPos {
  const candidates: GridPos[] = []
  for (let c = 0; c < gridCols; c++) {
    if (!occupied.has(`${c},0`)) candidates.push({ col: c, row: 0 })
    if (!occupied.has(`${c},${gridRows - 1}`)) candidates.push({ col: c, row: gridRows - 1 })
  }
  for (let r = 1; r < gridRows - 1; r++) {
    if (!occupied.has(`0,${r}`)) candidates.push({ col: 0, row: r })
    if (!occupied.has(`${gridCols - 1},${r}`)) candidates.push({ col: gridCols - 1, row: r })
  }
  if (candidates.length === 0) return { col: 0, row: 0 }
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// ---- component ---------------------------------------------------------
export default function IsoVisitor({
  visitor, gridCols, gridRows, tileW, tileH, originX, originY,
  containerRef, canvasW, onLeave,
}: Props) {
  const occupied = buildOccupied(visitor.zones)
  const entryPos = safeEntryPos(gridCols, gridRows, occupied)

  const [pos, setPos] = useState<GridPos>(entryPos)
  const [bubble, setBubble] = useState<string | null>(null)
  const [facing, setFacing] = useState<'left' | 'right'>('right')

  const posRef = useRef<GridPos>(entryPos)
  const facingRef = useRef<'left' | 'right'>('right')
  const pathRef = useRef<GridPos[]>([])
  const leavingRef = useRef(false)
  const leftRef = useRef(false)

  // walk target: กลางห้อง ±1 และ walkable
  const meetTarget = useRef<GridPos>((() => {
    const cx = Math.floor(gridCols / 2)
    const cy = Math.floor(gridRows / 2)
    for (let dr = 0; dr <= 2; dr++) {
      for (let dc = 0; dc <= 2; dc++) {
        const p = { col: cx + dc, row: cy + dr }
        if (!occupied.has(`${p.col},${p.row}`) && p.col < gridCols && p.row < gridRows) return p
        const p2 = { col: cx - dc, row: cy - dr }
        if (!occupied.has(`${p2.col},${p2.row}`) && p2.col >= 0 && p2.row >= 0) return p2
      }
    }
    return { col: cx, row: cy }
  })())

  const config = PERSONALITY_CONFIG[visitor.personality] ?? PERSONALITY_CONFIG['friendly']

  // bubble
  useEffect(() => {
    const lines = TIER_BUBBLE[visitor.tier]
    const delay = setTimeout(() => {
      setBubble(lines[Math.floor(Math.random() * lines.length)])
      setTimeout(() => setBubble(null), 3000)
    }, 2000)
    return () => clearTimeout(delay)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // leave timer
  useEffect(() => {
    const timeout = setTimeout(() => {
      leavingRef.current = true
      // คำนวณ path กลับ entry
      pathRef.current = bfsPath(posRef.current, entryPos, gridCols, gridRows, occupied)
    }, TIER_DURATION[visitor.tier])
    return () => clearTimeout(timeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // movement loop
  useEffect(() => {
    // คำนวณ path ไป meetTarget ก่อน
    pathRef.current = bfsPath(entryPos, meetTarget.current, gridCols, gridRows, occupied)

    const interval = setInterval(() => {
      if (leftRef.current) return

      const current = posRef.current

      // มี path ให้เดิน
      if (pathRef.current.length > 0) {
        const next = pathRef.current.shift()!
        const newFacing = next.col > current.col ? 'right' : next.col < current.col ? 'left' : facingRef.current
        facingRef.current = newFacing
        setFacing(newFacing)
        posRef.current = next
        setPos(next)
        return
      }

      // path หมดแล้ว ถ้ากำลัง leaving และถึง entryPos → ออก
      if (leavingRef.current) {
        if (current.col === entryPos.col && current.row === entryPos.row) {
          leftRef.current = true
          onLeave(visitor.characterId)
        } else {
          // path กลับหมดแต่ยังไม่ถึง → คำนวณใหม่
          pathRef.current = bfsPath(current, entryPos, gridCols, gridRows, occupied)
        }
      }
      // ถ้าไม่ leaving ก็หยุดรอ (ยืนอยู่กลางห้อง)
    }, 300 / config.speedMultiplier)

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- render ---------------------------------------------------------
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
  const stepMs = 300 / config.speedMultiplier

  return (
    <div style={{
      position: 'absolute',
      left: cssX,
      top: cssY,
      transform: 'translate(-50%, -100%)',
      height: tileH * 3,
      zIndex: (pos.col + pos.row) * 10,
      pointerEvents: 'none',
      transition: `left ${stepMs}ms linear, top ${stepMs}ms linear`,
    }}>
      {/* speech bubble */}
      {bubble && (
        <div style={{
          position: 'absolute',
          bottom: '110%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'white',
          color: '#333',
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 12,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 9999,
        }}>
          {bubble}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: '6px 5px 0',
            borderStyle: 'solid',
            borderColor: 'white transparent transparent',
          }} />
        </div>
      )}

      {/* tier badge */}
      <div style={{
        position: 'absolute',
        top: -18,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 10,
        color: visitor.tier === 'rival' ? '#ff6b6b' : visitor.tier === 'friend' ? '#69db7c' : '#aaa',
        whiteSpace: 'nowrap',
        zIndex: 9999,
      }}>
        {visitor.tier === 'friend' ? '💚' : visitor.tier === 'rival' ? '⚔️' : '👤'} {visitor.name}
      </div>

      <div style={{
        height: '100%',
        transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
        transition: 'transform 0.3s ease',
      }}>
        {visitor.spriteUrl ? (
          <img
            src={visitor.spriteUrl}
            alt={visitor.name}
            draggable={false}
            style={{
              height: '100%',
              width: 'auto',
              objectFit: 'contain',
              imageRendering: 'pixelated',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
              opacity: visitor.tier === 'stranger' ? 0.75 : 1,
            }}
          />
        ) : (
          <div style={{ fontSize: tileH * 2, lineHeight: 1 }}>
            {visitor.tier === 'rival' ? '😤' : visitor.tier === 'friend' ? '😊' : '🙂'}
          </div>
        )}
      </div>
    </div>
  )
}