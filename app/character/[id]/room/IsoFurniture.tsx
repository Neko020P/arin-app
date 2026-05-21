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
    const draggingRef = useRef<string | null>(null)  // zone id ที่กำลัง drag

    const getContainerRect = useCallback(() => {
        if (!containerRef || !containerRef.current) return null
        return containerRef.current.getBoundingClientRect()
    }, [containerRef])

    function handleMouseDown(e: React.MouseEvent, zoneId: string) {
        if (!editMode) return
        e.preventDefault()
        draggingRef.current = zoneId

        function handleMouseMove(e: MouseEvent) {
            const rect = getContainerRect()
            if (!rect) return

            // คำนวณ scale เพราะ SVG ถูก scale ให้พอดี container
            const canvasW = (gridCols + gridRows) * (tileW / 2) + tileW
            const scaleX = rect.width / canvasW

            // แปลง mouse → canvas coordinate
            const screenX = (e.clientX - rect.left) / scaleX
            const screenY = (e.clientY - rect.top) / scaleX  // ใช้ scaleX เดียวกันเพราะ aspect ratio fixed

            const { col, row } = screenToGrid(screenX, screenY, tileW, tileH, originX, originY)
            const clampedCol = Math.max(0, Math.min(gridCols - 1, col))
            const clampedRow = Math.max(0, Math.min(gridRows - 1, row))
            onHighlight({ col: clampedCol, row: clampedRow })
        }

        function handleMouseUp(e: MouseEvent) {
            const rect = getContainerRect()
            if (rect && draggingRef.current) {
                const screenX = e.clientX - rect.left
                const screenY = e.clientY - rect.top

                const { col, row } = screenToGrid(screenX, screenY, tileW, tileH, originX, originY)
                const clampedCol = Math.max(0, Math.min(gridCols - 1, col))
                const clampedRow = Math.max(0, Math.min(gridRows - 1, row))

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

    // Touch support
    function handleTouchStart(e: React.TouchEvent, zoneId: string) {
        if (!editMode) return
        draggingRef.current = zoneId

        function handleTouchMove(e: TouchEvent) {
            const touch = e.touches[0]
            const rect = getContainerRect()
            if (!rect) return

            const screenX = touch.clientX - rect.left
            const screenY = touch.clientY - rect.top
            const { col, row } = screenToGrid(screenX, screenY, tileW, tileH, originX, originY)
            const clampedCol = Math.max(0, Math.min(gridCols - 1, col))
            const clampedRow = Math.max(0, Math.min(gridRows - 1, row))
            onHighlight({ col: clampedCol, row: clampedRow })
        }

        function handleTouchEnd(e: TouchEvent) {
            const touch = e.changedTouches[0]
            const rect = getContainerRect()
            if (rect && draggingRef.current) {
                const screenX = touch.clientX - rect.left
                const screenY = touch.clientY - rect.top
                const { col, row } = screenToGrid(screenX, screenY, tileW, tileH, originX, originY)
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
                const { x, y } = isoToScreen(col, row, tileW, tileH, originX, originY)

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
                                ✥ ลาก
                            </div>
                        )}
                    </div>
                )
            })}
        </>
    )
}