'use client'

type Props = {
  cols: number
  rows: number
  tileW: number
  tileH: number
  originX: number
  originY: number
  highlightCell?: { col: number; row: number } | null  // ← เพิ่ม
}

export function isoToScreen(
  col: number, row: number,
  tileW: number, tileH: number,
  originX: number, originY: number
) {
  return {
    x: originX + (col - row) * (tileW / 2),
    y: originY + (col + row) * (tileH / 2),
  }
}

export function screenToGrid(
  screenX: number, screenY: number,
  tileW: number, tileH: number,
  originX: number, originY: number
) {
  const dx = screenX - originX
  const dy = screenY - originY
  const col = Math.floor((dx / (tileW / 2) + dy / (tileH / 2)) / 2)  // ← round → floor
  const row = Math.floor((dy / (tileH / 2) - dx / (tileW / 2)) / 2)  // ← round → floor
  return { col, row }
}

export default function IsoFloor({
  cols, rows, tileW, tileH, originX, originY, highlightCell
}: Props) {
  const tiles = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { x, y } = isoToScreen(col, row, tileW, tileH, originX, originY)

      const points = [
        `${x},${y - tileH / 2}`,
        `${x + tileW / 2},${y}`,
        `${x},${y + tileH / 2}`,
        `${x - tileW / 2},${y}`,
      ].join(' ')

      const isHighlight = highlightCell?.col === col && highlightCell?.row === row
      const isEven = (col + row) % 2 === 0

      tiles.push(
        <polygon
          key={`${col}-${row}`}
          points={points}
          fill={
            isHighlight
              ? 'rgba(120,180,255,0.35)'
              : isEven
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.04)'
          }
          stroke={isHighlight ? 'rgba(120,180,255,0.6)' : 'rgba(255,255,255,0.12)'}
          strokeWidth={isHighlight ? 1.5 : 0.5}
        />
      )
    }
  }

  const svgW = (cols + rows) * (tileW / 2)
  const svgH = (cols + rows) * (tileH / 2)

  return (
    <svg
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
      viewBox={`${originX - svgW / 2} ${originY - tileH / 2} ${svgW} ${svgH}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {tiles}
    </svg>
  )
}