'use client'
import { useState, useRef, useCallback } from 'react'
import { isoToScreen, screenToGrid } from './IsoFloor'
import type { RoomZone } from './RoomClient'

const DEFAULT_ZONE_EMOJI: Record<string, string> = {
    bed: '🛏️',
    table: '🍽️',
    bath: '🛁',
    play: '🎮',
}

type Props = {
    zones: RoomZone[]
    tileW: number
    tileH: number
    originX: number
    originY: number
    editMode: boolean                                           // ← เพิ่ม
    containerRef: React.RefObject<HTMLDivElement | null>        // ← เพิ่ม
    onZoneMove: (id: string, col: number, row: number) => void // ← เพิ่ม
    onHighlight: (cell: { col: number; row: number } | null) => void // ← เพิ่ม
    gridCols: number
    gridRows: number
    canvasW: number
}

export default function IsoFurniture({
    zones, tileW, tileH, originX, originY,
    editMode, containerRef, onZoneMove, onHighlight,
    gridCols, gridRows,
}: Props) {
    const draggingRef = useRef<string | null>(null)

    const canvasW = (gridCols + gridRows) * (tileW / 2) + tileW
    const svgW = (gridCols + gridRows) * (tileW / 2)
    const viewBoxX = originX - svgW / 2
    const viewBoxY = originY - tileH / 2

    function isoToCSS(col: number, row: number): { x: number; y: number } {
        const { x, y } = isoToScreen(col, row, tileW, tileH, originX, originY)
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return { x: 0, y: 0 }
        const svgH = (gridCols + gridRows) * (tileH / 2)
        const scaleX = rect.width / canvasW
        const scaleY = rect.height / (svgH + tileH)
        // x, y จาก isoToScreen คือ canvas coordinate ตรงๆ
        const cssX = x * scaleX
        const cssY = y * scaleY
        return { x: cssX, y: cssY }
    }

    const getContainerRect = useCallback(() => {
        if (!containerRef || !containerRef.current) return null
        return containerRef.current.getBoundingClientRect()
    }, [containerRef])

    function toSVGCoord(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
        const scaleX = rect.width / canvasW
        const svgH = (gridCols + gridRows) * (tileH / 2)
        const scaleY = rect.height / (svgH + tileH)

        // แปลงเป็น canvas coordinate ตรงๆ ไม่บวก viewBox offset
        const x = (clientX - rect.left) / scaleX
        const y = (clientY - rect.top) / scaleY

        return { x, y }
    }

    function handleMouseDown(e: React.MouseEvent, zoneId: string) {
        if (!editMode) return
        e.preventDefault()
        draggingRef.current = zoneId

        function handleMouseMove(e: MouseEvent) {
            const rect = getContainerRect()
            if (!rect) return
            const { x, y } = toSVGCoord(e.clientX, e.clientY, rect)
            const { col, row } = screenToGrid(x, y, tileW, tileH, originX, originY)
            const clampedCol = Math.max(0, Math.min(gridCols - 1, col))
            const clampedRow = Math.max(0, Math.min(gridRows - 1, row))
            onHighlight({ col: clampedCol, row: clampedRow })
        }

        function handleMouseUp(e: MouseEvent) {
            const rect = getContainerRect()
            if (rect && draggingRef.current) {
                const { x, y } = toSVGCoord(e.clientX, e.clientY, rect)
                const { col, row } = screenToGrid(x, y, tileW, tileH, originX, originY)
                const clampedCol = Math.max(0, Math.min(gridCols - 1, col))
                const clampedRow = Math.max(0, Math.min(gridRows - 1, row))
                console.log('mouseup col/row:', { col, row, clampedCol, clampedRow })
                onZoneMove(draggingRef.current, clampedCol, clampedRow)
            }
            draggingRef.current = null
            onHighlight(null)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
    }

    function handleTouchStart(e: React.TouchEvent, zoneId: string) {
        if (!editMode) return
        draggingRef.current = zoneId

        function handleTouchMove(e: TouchEvent) {
            const touch = e.touches[0]
            const rect = getContainerRect()
            if (!rect) return
            const { x, y } = toSVGCoord(touch.clientX, touch.clientY, rect)
            const { col, row } = screenToGrid(x, y, tileW, tileH, originX, originY)
            const clampedCol = Math.max(0, Math.min(gridCols - 1, col))
            const clampedRow = Math.max(0, Math.min(gridRows - 1, row))
            onHighlight({ col: clampedCol, row: clampedRow })
        }

        function handleTouchEnd(e: TouchEvent) {
            const touch = e.changedTouches[0]
            const rect = getContainerRect()
            if (rect && draggingRef.current) {
                const { x, y } = toSVGCoord(touch.clientX, touch.clientY, rect)
                const { col, row } = screenToGrid(x, y, tileW, tileH, originX, originY)
                const clampedCol = Math.max(0, Math.min(gridCols - 1, col))
                const clampedRow = Math.max(0, Math.min(gridRows - 1, row))
                onZoneMove(draggingRef.current, clampedCol, clampedRow)
            }
            draggingRef.current = null
            onHighlight(null)
            window.removeEventListener('touchmove', handleTouchMove)
            window.removeEventListener('touchend', handleTouchEnd)
        }

        window.addEventListener('touchmove', handleTouchMove)
        window.addEventListener('touchend', handleTouchEnd)
    }

    return (
        <>
            {zones.map(zone => {
                const col = zone.col ?? 1
                const row = zone.row ?? 1
                const { x, y } = isoToCSS(col, row)

                return (
                    <div
                        key={zone.id}
                        onMouseDown={e => handleMouseDown(e, zone.id)}
                        onTouchStart={e => handleTouchStart(e, zone.id)}
                        style={{
                            position: 'absolute',
                            left: x,
                            top: y,
                            transform: 'translate(-50%, -100%)',
                            height: tileH * 2.5,
                            zIndex: col + row + 5,
                            cursor: editMode ? 'grab' : 'default',
                            userSelect: 'none',
                            // กระพริบเมื่อ edit mode
                            outline: editMode ? '2px dashed rgba(120,180,255,0.6)' : 'none',
                            outlineOffset: 4,
                            borderRadius: 4,
                            transition: 'outline 0.2s',
                        }}
                    >
                        {zone.image_url ? (
                            <img
                                src={zone.image_url}
                                alt={zone.zone_type}
                                draggable={false}
                                style={{
                                    height: '100%',
                                    width: 'auto',
                                    objectFit: 'contain',
                                    imageRendering: 'pixelated',
                                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
                                    pointerEvents: 'none',
                                }}
                            />
                        ) : (
                            <div style={{
                                fontSize: tileH * 1.5,
                                lineHeight: 1,
                                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
                                pointerEvents: 'none',
                            }}>
                                {DEFAULT_ZONE_EMOJI[zone.zone_type]}
                            </div>
                        )}

                        {/* Edit mode label */}
                        {editMode && (
                            <div style={{
                                position: 'absolute',
                                top: -20,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                fontSize: 10,
                                padding: '1px 6px',
                                borderRadius: 4,
                                whiteSpace: 'nowrap',
                            }}>
                                ✥ Drag to move {zone.zone_type}
                            </div>
                        )}
                    </div>
                )
            })}
        </>
    )
}