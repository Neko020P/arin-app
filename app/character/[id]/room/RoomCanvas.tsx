'use client'
import { useRef, useState } from 'react'
import type { Stats } from '@/lib/stats'
import type { RoomZone } from './RoomClient'
import type { Personality } from '@/lib/personality'
import IsoFloor from './IsoFloor'
import IsoCharacter, { type GridPos } from './IsoCharacter'
import IsoFurniture from './IsoFurniture'
import SpeechBubble from './SpeechBubble'
import ParticleEffect from './ParticleEffect'
import { isoToScreen } from './IsoFloor'
import { screenToGrid } from './IsoFloor'

// ค่า grid คงที่ — ปรับได้
const GRID_COLS = 10
const GRID_ROWS = 10
const TILE_W = 100   // px
const TILE_H = 50   // px

function getCurrentMoodSprite(stats: Stats, sprites: Record<string, string>): string | null {
  if (stats.energy < 20) return sprites.tired ?? null
  if (stats.happiness < 20) return sprites.sad ?? null
  if (stats.hunger < 20) return sprites.angry ?? null
  const avg = (stats.hunger + stats.happiness + stats.energy) / 3
  if (avg > 75) return sprites.happy ?? null
  return null
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
  isOwner: boolean   // ← เพิ่ม
  onZonesChange: (id: string, col: number, row: number) => void
}

export default function RoomCanvas({
  spriteUrl, bgUrl, stats, zones,
  pendingAction, onActionComplete,
  moodSprites, personality, isOwner, onZonesChange
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [charPos, setCharPos] = useState<GridPos>({ col: 4, row: 3 })
  const [editMode, setEditMode] = useState(false)
  const [highlightCell, setHighlightCell] = useState<{ col: number; row: number } | null>(null)

  const moodSpriteUrl = getCurrentMoodSprite(stats, moodSprites)

  // origin = จุดบนสุดของ grid อยู่กลาง canvas แนวนอน
  // คำนวณเป็น % แล้วแปลงใน render
  const originX = (GRID_COLS + GRID_ROWS) * (TILE_W / 2) / 2
  const originY = TILE_H

  // screen pos ของ character สำหรับ bubble/particle
  const charScreen = isoToScreen(charPos.col, charPos.row, TILE_W, TILE_H, originX, originY)
  const canvasW = (GRID_COLS + GRID_ROWS) * (TILE_W / 2) + TILE_W
  console.log('charScreen:', charScreen, 'charPos:', charPos)

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        overflow: 'hidden',
        borderRadius: 16,
        background: bgUrl
          ? undefined
          : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      {/* Background */}
      {bgUrl && (
        <img src={bgUrl} alt="bg"
          className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Isometric scene */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}>
        {/* Floor grid */}
        <IsoFloor
          cols={GRID_COLS}
          rows={GRID_ROWS}
          tileW={TILE_W}
          tileH={TILE_H}
          originX={originX}
          originY={originY}
          highlightCell={highlightCell}
        />

        {/* Furniture */}
        <IsoFurniture
          zones={zones}
          tileW={TILE_W}
          tileH={TILE_H}
          originX={originX}
          originY={originY}
          editMode={editMode}             // ← เพิ่ม
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          gridCols={GRID_COLS}            // ← เพิ่ม
          gridRows={GRID_ROWS}            // ← เพิ่ม
          onHighlight={setHighlightCell}  // ← เพิ่ม
          onZoneMove={(id, col, row) => {
            onZonesChange(id, col, row)  // ← ส่ง 3 arguments ตรงๆ
          }}
          canvasW={canvasW} 
        />

        {/* Character */}
        <IsoCharacter
          spriteUrl={spriteUrl}
          moodSpriteUrl={moodSpriteUrl}
          stats={stats}
          personality={personality}
          gridCols={GRID_COLS}
          gridRows={GRID_ROWS}
          tileW={TILE_W}
          tileH={TILE_H}
          originX={originX}
          originY={originY}
          pendingAction={pendingAction}
          zones={zones.map(z => ({ zone_type: z.zone_type, col: z.col ?? 1, row: z.row ?? 1 }))}
          onArrive={(action) => setLastAction(action)}
          onActionComplete={() => { setLastAction(null); onActionComplete() }}
          onPosChange={setCharPos}
        />

        {/* Speech Bubble */}
        <SpeechBubble
          stats={stats}
          posX={charScreen.x}
          posY={charScreen.y}
          lastAction={lastAction}
          personality={personality}
        />

        {/* Particles */}
        <ParticleEffect
          trigger={lastAction}
          posX={charScreen.x}
          posY={charScreen.y}
          happiness={stats.happiness}
        />
      </div>

      {/* Edit Mode Button */}
      {isOwner && (
        <button
          onClick={() => setEditMode(e => !e)}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 50,
            background: editMode ? 'rgba(120,180,255,0.3)' : 'rgba(0,0,0,0.4)',
            border: editMode ? '1px solid rgba(120,180,255,0.6)' : '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: 8,
            fontSize: 12,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
          }}
        >
          {editMode ? '✅ บันทึก' : '✏️ จัดห้อง'}
        </button>
      )}

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