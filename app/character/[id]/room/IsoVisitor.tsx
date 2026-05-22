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
}

type GridPos = { col: number; row: number }

const TIER_DURATION: Record<string, number> = {
  stranger: 8000,
  friend: 20000,
  rival: 12000,
}

const TIER_BUBBLE: Record<string, string[]> = {
  stranger: ['...', 'สวัสดี', 'แวะมาดูหน่อย'],
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

function getNextStep(current: GridPos, target: GridPos): GridPos {
  const dc = Math.sign(target.col - current.col)
  const dr = Math.sign(target.row - current.row)
  if (dc !== 0) return { col: current.col + dc, row: current.row }
  if (dr !== 0) return { col: current.col, row: current.row + dr }
  return current
}

export default function IsoVisitor({
  visitor, gridCols, gridRows, tileW, tileH, originX, originY,
  containerRef, canvasW, onLeave,
}: Props) {
  // entry จากขอบ grid (สุ่มขอบ)
  const entryPos: GridPos = (() => {
    const side = Math.floor(Math.random() * 4)
    if (side === 0) return { col: 0, row: Math.floor(Math.random() * gridRows) }
    if (side === 1) return { col: gridCols - 1, row: Math.floor(Math.random() * gridRows) }
    if (side === 2) return { col: Math.floor(Math.random() * gridCols), row: 0 }
    return { col: Math.floor(Math.random() * gridCols), row: gridRows - 1 }
  })()

  const [pos, setPos] = useState<GridPos>(entryPos)
  const [bubble, setBubble] = useState<string | null>(null)
  const [facing, setFacing] = useState<'left' | 'right'>('right')
  const posRef = useRef<GridPos>(entryPos)
  const targetRef = useRef<GridPos>({
    col: Math.floor(gridCols / 2) + Math.floor(Math.random() * 3) - 1,
    row: Math.floor(gridRows / 2) + Math.floor(Math.random() * 3) - 1,
  })
  const leavingRef = useRef(false)
  const config = PERSONALITY_CONFIG[visitor.personality] ?? PERSONALITY_CONFIG['friendly']

  // แสดง bubble ตาม tier
  useEffect(() => {
    const lines = TIER_BUBBLE[visitor.tier]
    const delay = setTimeout(() => {
      setBubble(lines[Math.floor(Math.random() * lines.length)])
      setTimeout(() => setBubble(null), 3000)
    }, 2000)
    return () => clearTimeout(delay)
  }, [])

  // ออกจาก room หลัง duration
  useEffect(() => {
    const timeout = setTimeout(() => {
      leavingRef.current = true
      // เดินออกไปขอบ
      targetRef.current = entryPos
    }, TIER_DURATION[visitor.tier])
    return () => clearTimeout(timeout)
  }, [])

  // movement loop
  useEffect(() => {
    const interval = setInterval(() => {
      const current = posRef.current
      const target = targetRef.current

      if (current.col === target.col && current.row === target.row) {
        if (leavingRef.current) {
          onLeave(visitor.characterId)
        }
        return
      }

      const next = getNextStep(current, target)
      if (next.col > current.col) setFacing('right')
      else if (next.col < current.col) setFacing('left')
      posRef.current = next
      setPos(next)
    }, 300 / config.speedMultiplier)

    return () => clearInterval(interval)
  }, [])

  // แปลง pos → CSS
  const screen = isoToScreen(pos.col, pos.row, tileW, tileH, originX, originY)
  const rect = containerRef.current?.getBoundingClientRect()
  const svgH = (gridCols + gridRows) * (tileH / 2)
  const scaleX = rect ? rect.width / canvasW : 1
  const scaleY = rect ? rect.height / (svgH + tileH) : 1
  const cssX = screen.x * scaleX
  const cssY = screen.y * scaleY

  return (
    <div style={{
      position: 'absolute',
      left: cssX,
      top: cssY,
      transform: 'translate(-50%, -100%)',
      height: tileH * 3,
      zIndex: pos.col + pos.row + 8,
      pointerEvents: 'none',
      transition: `left ${300 / config.speedMultiplier}ms linear, top ${300 / config.speedMultiplier}ms linear`,  // ← เพิ่ม
    }}>
      {/* bubble */}
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