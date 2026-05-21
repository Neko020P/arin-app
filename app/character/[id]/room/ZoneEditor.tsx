'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RoomZone } from './RoomClient'

const ZONE_CONFIG = [
  { type: 'table', label: 'โต๊ะอาหาร', icon: '🍽️' },
  { type: 'bed', label: 'เตียง', icon: '🛏️' },
  { type: 'bath', label: 'ห้องน้ำ', icon: '🛁' },
  { type: 'play', label: 'มุมเล่น', icon: '🎮' },
] as const

type Props = {
  characterId: string
  zones: RoomZone[]
  onZonesChange: (zones: RoomZone[]) => void
}

export default function ZoneEditor({ characterId, zones = [], onZonesChange }: Props) {
  const supabase = createClient()
  const [uploading, setUploading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function getZone(type: string) {
    return zones.find(z => z.zone_type === type)
  }

  async function addZone(type: string) {
    const { data, error } = await supabase
      .from('room_zones')
      .upsert({
        character_id: characterId,
        zone_type: type,
        col: 1 + zones.length * 2,
        row: 1,
      })
      .select()
      .single()

    if (!error && data) {
      onZonesChange([...zones.filter(z => z.zone_type !== type), data as RoomZone])
    }
  }

  async function removeZone(type: string) {
    const zone = getZone(type)
    if (!zone) return

    await supabase.from('room_zones').delete().eq('id', zone.id)
    onZonesChange(zones.filter(z => z.zone_type !== type))
  }

  async function uploadZoneImage(type: string, file: File) {
    setUploading(type)
    const ext = file.name.split('.').pop()
    const path = `zones/${characterId}/${type}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('character-parts')
      .upload(path, file, { upsert: true })

    console.log('upload error:', JSON.stringify(upErr))

    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage
        .from('character-parts')
        .getPublicUrl(path)

      await supabase.from('room_zones')
        .update({ image_url: publicUrl })
        .eq('character_id', characterId)
        .eq('zone_type', type)

      onZonesChange(zones.map(z =>
        z.zone_type === type ? { ...z, image_url: publicUrl } : z
      ))
    }

    setUploading(null)
  }

  async function updatePosition(type: string, field: 'x' | 'y' | 'width', value: number) {
    const zone = getZone(type)
    if (!zone) return

    const updated = { ...zone, [field]: value }
    onZonesChange(zones.map(z => z.zone_type === type ? updated : z))

    await supabase.from('room_zones')
      .update({ [field]: value })
      .eq('id', zone.id)
  }

  async function updateGridPos(type: string, col: number, row: number) {
    const zone = getZone(type)
    if (!zone) return

    onZonesChange(zones.map(z => z.zone_type === type ? { ...z, col, row } : z))

    await supabase.from('room_zones')
      .update({ col, row })
      .eq('id', zone.id)
  }

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2
                   rounded-xl border border-white/10 text-white/50 text-sm
                   hover:bg-white/5 transition-colors"
      >
        <span>🏠 จัดห้อง</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3">
          {ZONE_CONFIG.map(({ type, label, icon }) => {
            const zone = getZone(type)
            const active = !!zone

            return (
              <div key={type}
                className="border border-white/10 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">{icon} {label}</span>
                  <button
                    onClick={() => active ? removeZone(type) : addZone(type)}
                    className={`text-xs px-3 py-1 rounded-lg border transition-colors ${active
                      ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                      : 'border-white/20 text-white/50 hover:bg-white/10'
                      }`}
                  >
                    {active ? 'ลบออก' : 'เพิ่มโซน'}
                  </button>
                </div>

                {active && (
                  <>
                    {/* Upload PNG */}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/png,image/webp"
                        className="hidden"
                        ref={el => { fileRefs.current[type] = el }}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) uploadZoneImage(type, file)
                        }}
                      />
                      <button
                        onClick={() => fileRefs.current[type]?.click()}
                        disabled={uploading === type}
                        className="text-xs px-3 py-1 rounded-lg border border-white/20
                                   text-white/50 hover:bg-white/10 transition-colors
                                   disabled:opacity-40"
                      >
                        {uploading === type ? 'กำลังอัปโหลด...' : '📁 อัปโหลด PNG'}
                      </button>
                      {zone.image_url && (
                        <img src={zone.image_url} alt={type}
                          className="h-8 w-8 object-contain rounded" />
                      )}
                    </div>

                    {/* Grid position */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
                      <label className="flex flex-col gap-1">
                        <span>← → (Col)</span>
                        <input
                          type="range" min={0} max={7} step={1}
                          value={zone.col ?? 1}
                          onChange={e => updateGridPos(type, Number(e.target.value), zone.row ?? 1)}
                          className="w-full"
                        />
                        <span className="text-center">Col {zone.col ?? 1}</span>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span>↑ ↓ (Row)</span>
                        <input
                          type="range" min={0} max={5} step={1}
                          value={zone.row ?? 1}
                          onChange={e => updateGridPos(type, zone.col ?? 1, Number(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-center">Row {zone.row ?? 1}</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}