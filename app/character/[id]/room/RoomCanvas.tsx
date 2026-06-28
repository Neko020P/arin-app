//RoomCanvas.tsx
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
import IsoVisitor, { type VisitorData } from './IsoVisitor'

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
  isOwner: boolean
  editMode: boolean
  onEditModeChange: (v: boolean) => void
  onZonesChange: (id: string, col: number, row: number) => void
  visitors: VisitorData[]
  onVisitorLeave: (characterId: string) => void
  bgColor: string
  customSpeechText?: string | null
}

export default function RoomCanvas({
  spriteUrl, bgUrl, stats, zones,
  pendingAction, onActionComplete,
  moodSprites, personality, isOwner, onZonesChange,
  visitors, customSpeechText, onVisitorLeave, bgColor,
  editMode, onEditModeChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [charPos, setCharPos] = useState<GridPos>({ col: 4, row: 3 })
  const [highlightCell, setHighlightCell] = useState<{ col: number; row: number } | null>(null)

  const moodSpriteUrl = getCurrentMoodSprite(stats, moodSprites)

  // origin = จุดบนสุดของ grid อยู่กลาง canvas แนวนอน
  // คำนวณเป็น % แล้วแปลงใน render
  //const originX = (GRID_COLS + GRID_ROWS) * (TILE_W / 2) / 2 + TILE_W / 2
  const canvasW = (GRID_COLS + GRID_ROWS) * (TILE_W / 2) + TILE_W
  const originX = canvasW / 2
  const originY = TILE_H
  //console.log('canvas:', { canvasW, originX, originY })

  // screen pos ของ character สำหรับ bubble/particle
  const charScreen = isoToScreen(charPos.col, charPos.row, TILE_W, TILE_H, originX, originY)
  const svgH = (GRID_COLS + GRID_ROWS) * (TILE_H / 2)
  const rect = containerRef.current?.getBoundingClientRect()
  const containerRect = containerRef.current?.getBoundingClientRect()
  const containerW = containerRef.current?.clientWidth ?? canvasW
  const containerH = containerRef.current?.clientHeight ?? (svgH + TILE_H)
  const scaleX = rect ? rect.width / canvasW : 1
  const scaleY = rect ? rect.height / (svgH + TILE_H) : 1
  const charScreenCSS = {
    x: charScreen.x * scaleX,
    y: charScreen.y * scaleY,
  }
  // console.log('bubble pos:', {
  //   charScreen,
  //   containerRect,
  //   scaleX: containerRect ? containerRect.width / canvasW : 1,
  //   scaleY: containerRect ? containerRect.height / (svgH + TILE_H) : 1,
  //   charScreenCSS
  // })

  //console.log('charScreen:', charScreen, 'charPos:', charPos)

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%', //aspectRatio: '16/9',
        overflow: 'hidden',
        borderRadius: 16,
        background: bgUrl ? undefined : (bgColor ?? 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'),
      }}
    >
      {/* Background */}
      {bgUrl && (
        <img src={bgUrl} alt="bg"
          style={{
            position: 'absolute',
            top: '8%',
            left: '0%',
            width: '100%',
            height: '85%',
            objectFit: 'fill',
          }}
        />
      )}
      {/* {bgUrl && (
        <img src={bgUrl} alt="bg"
          className="absolute inset-0 w-full h-full object-cover" />
      )} */}

      {/* Isometric scene */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}>
        {/* Floor grid */}
        {editMode && (
          <IsoFloor
            cols={GRID_COLS}
            rows={GRID_ROWS}
            tileW={TILE_W}
            tileH={TILE_H}
            originX={originX}
            originY={originY}
            highlightCell={highlightCell}
          />
        )}

        {/* Furniture */}
        <IsoFurniture
          zones={zones}
          tileW={TILE_W}
          tileH={TILE_H}
          originX={originX}
          originY={originY}
          editMode={editMode}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          gridCols={GRID_COLS}
          gridRows={GRID_ROWS}
          onHighlight={setHighlightCell}
          onZoneMove={(id, col, row) => { onZonesChange(id, col, row) }}
          canvasW={canvasW}
          charPos={charPos}
          isActing={!!pendingAction}
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
          containerRef={containerRef}
        />

        {/* Visitors */}
        {visitors.map((visitor, i) => (
          <IsoVisitor
            key={`visitor-${visitor.characterId ?? i}`}
            visitor={visitor}
            gridCols={GRID_COLS}
            gridRows={GRID_ROWS}
            tileW={TILE_W}
            tileH={TILE_H}
            originX={originX}
            originY={originY}
            containerRef={containerRef}
            canvasW={canvasW}
            onLeave={onVisitorLeave}
          />
        ))}

        {/* Speech Bubble */}
        <SpeechBubble
          stats={stats}
          posX={charScreen.x}
          posY={charScreen.y}
          lastAction={lastAction}
          personality={personality}
          customText={customSpeechText}
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


      <style>{`
  @keyframes breathe {
    0%   { transform: scaleY(1); }
    30%  { transform: scaleX(1.02) scaleY(0.98); }
    50%  { transform: scaleX(0.98) scaleY(1.02); }
    70%  { transform: scaleX(1.01) scaleY(0.99); }
    100% { transform: scaleY(1); }
  }
  @keyframes walk {
    0%   { transform: translateY(0px) rotate(-2deg); }
    25%  { transform: translateY(-6px) rotate(0deg); }
    50%  { transform: translateY(0px) rotate(2deg); }
    75%  { transform: translateY(-4px) rotate(0deg); }
    100% { transform: translateY(0px) rotate(-2deg); }
  }
  @keyframes sit {
    0%   { transform: scaleY(0.6) translateY(30%) rotate(-1deg); }
    50%  { transform: scaleY(0.62) translateY(29%) rotate(1deg); }
    100% { transform: scaleY(0.6) translateY(30%) rotate(-1deg); }
  }
  @keyframes act_feed {
    0%   { transform: translateY(0px) rotate(0deg); }
    20%  { transform: translateY(-8px) rotate(-5deg); }
    40%  { transform: translateY(0px) rotate(5deg); }
    60%  { transform: translateY(-4px) rotate(-3deg); }
    80%  { transform: translateY(0px) rotate(3deg); }
    100% { transform: translateY(0px) rotate(0deg); }
  }
  @keyframes act_play {
    0%   { transform: translateY(0px) scaleX(1); }
    25%  { transform: translateY(-12px) scaleX(1.05); }
    50%  { transform: translateY(0px) scaleX(0.95); }
    75%  { transform: translateY(-8px) scaleX(1.05); }
    100% { transform: translateY(0px) scaleX(1); }
  }
  @keyframes act_bath {
    0%   { transform: rotate(0deg); }
    15%  { transform: rotate(-8deg) translateX(-3px); }
    30%  { transform: rotate(8deg) translateX(3px); }
    45%  { transform: rotate(-6deg) translateX(-2px); }
    60%  { transform: rotate(6deg) translateX(2px); }
    100% { transform: rotate(0deg); }
  }
  @keyframes act_sleep {
    0%   { transform: scaleY(0.5) translateY(40%); }
    50%  { transform: scaleY(0.52) translateY(38%); }
    100% { transform: scaleY(0.5) translateY(40%); }
  }
  @keyframes happy_bounce {
    0%   { transform: translateY(0px); }
    50%  { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }
  @keyframes sad_droop {
    0%   { transform: translateY(0px) scaleX(1); }
    50%  { transform: translateY(2px) scaleX(0.97); }
    100% { transform: translateY(0px) scaleX(1); }
  }
  @keyframes act_read {
    0%   { transform: translateY(0px) rotate(0deg); }
    50%  { transform: translateY(-3px) rotate(-3deg); }
    100% { transform: translateY(0px) rotate(0deg); }
  }
  @keyframes act_dance {
    0%   { transform: translateY(0px) rotate(-5deg) scaleX(1); }
    25%  { transform: translateY(-8px) rotate(5deg) scaleX(1.05); }
    50%  { transform: translateY(0px) rotate(-3deg) scaleX(0.95); }
    75%  { transform: translateY(-6px) rotate(3deg) scaleX(1.05); }
    100% { transform: translateY(0px) rotate(-5deg) scaleX(1); }
}
`}</style>
    </div>
  )
}