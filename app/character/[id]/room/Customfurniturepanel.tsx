'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ANIMATION_PRESETS = [
  { id: 'act_feed', label: '🍖 Eating' },
  { id: 'act_play', label: '🎮 Playing' },
  { id: 'act_bath', label: '🛁 Bathing' },
  { id: 'act_sleep', label: '💤 Sleeping' },
  { id: 'act_read', label: '📖 Reading' },
  { id: 'act_dance', label: '💃 Dancing' },
  { id: 'happy_bounce', label: '✨ Happy bounce' },
  { id: 'breathe', label: '😌 Idle breathe' },
]

const STAT_KEYS = ['hunger', 'happiness', 'energy', 'social'] as const

type CustomData = {
  label: string
  stat_effects: Partial<Record<typeof STAT_KEYS[number], number>>
  bubble_message: string
  animation: string
}

type Zone = {
  id: string
  zone_type: string
  image_url: string | null
  col: number
  row: number
  size_level?: number
  custom_data: CustomData | null
}

type Props = {
  characterId: string
  zones: Zone[]
  onZonesChange: (zones: Zone[]) => void
}

const DEFAULT_CUSTOM: CustomData = {
  label: '',
  stat_effects: { happiness: 10 },
  bubble_message: '',
  animation: 'act_play',
}

export default function CustomFurniturePanel({ characterId, zones, onZonesChange }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState(false)

  const customZones = zones.filter(z => z.zone_type.startsWith('custom'))

  async function handleUpload(file: File) {
    if (customZones.length >= 5) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `rooms/${characterId}/custom-${Date.now()}.${ext}`
    const { data: storage, error } = await supabase.storage.from('artworks').upload(path, file, { upsert: true })
    if (error) { setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('artworks').getPublicUrl(storage.path)

    const usedSlots = customZones.map(z => z.zone_type)
    const zoneType = ['custom_1','custom_2','custom_3','custom_4','custom_5'].find(s => !usedSlots.includes(s))
    if (!zoneType) { setUploading(false); return }
    const customData: CustomData = { ...DEFAULT_CUSTOM, label: file.name.replace(/\.[^/.]+$/, '') }

    const { data: newZone } = await supabase.from('room_zones')
      .insert({ character_id: characterId, zone_type: zoneType, image_url: publicUrl, col: 5, row: 5, custom_data: customData })
      .select().single()

    if (newZone) onZonesChange([...zones, newZone as Zone])
    setUploading(false)
  }

  async function handleUpdateCustomData(zoneId: string, data: CustomData) {
    await supabase.from('room_zones').update({ custom_data: data }).eq('id', zoneId)
    onZonesChange(zones.map(z => z.id === zoneId ? { ...z, custom_data: data } : z))
  }

  async function handleUpdateSize(zoneId: string, size: number) {
    await supabase.from('room_zones').update({ size_level: size }).eq('id', zoneId)
    onZonesChange(zones.map(z => z.id === zoneId ? { ...z, size_level: size } : z))
  }

  async function handleDelete(zoneId: string) {
    await supabase.from('room_zones').delete().eq('id', zoneId)
    onZonesChange(zones.filter(z => z.id !== zoneId))
  }

  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 text-sm transition-colors">
        🪑 Custom Furniture ({customZones.length}/5)
        <span className="ml-auto">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-3">
          {customZones.map(zone => (
            <CustomZoneConfig
              key={zone.id}
              zone={zone}
              onUpdate={data => handleUpdateCustomData(zone.id, data)}
              onUpdateSize={size => handleUpdateSize(zone.id, size)}
              onDelete={() => handleDelete(zone.id)}
            />
          ))}

          {customZones.length < 5 && (
            <>
              <input ref={fileRef} type="file" accept="image/png,image/webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="text-xs border border-dashed border-white/20 text-white/40 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-40">
                {uploading ? '⏳ Uploading...' : '+ Add Custom Furniture (PNG/WebP)'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function CustomZoneConfig({ zone, onUpdate, onUpdateSize, onDelete }: {
  zone: Zone
  onUpdate: (data: CustomData) => void
  onUpdateSize: (size: number) => void
  onDelete: () => void
}) {
  const [data, setData] = useState<CustomData>(zone.custom_data ?? { ...DEFAULT_CUSTOM })
  const [expanded, setExpanded] = useState(false)
  const currentSize = zone.size_level ?? 1

  function update(partial: Partial<CustomData>) {
    const next = { ...data, ...partial }
    setData(next)
    onUpdate(next)
  }

  function updateStat(key: typeof STAT_KEYS[number], val: string) {
    const num = parseInt(val)
    const effects = { ...data.stat_effects }
    if (isNaN(num)) delete effects[key]
    else effects[key] = num
    update({ stat_effects: effects })
  }

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        {zone.image_url && <img src={zone.image_url} className="w-8 h-8 object-contain rounded" />}
        <span className="text-white/70 text-xs flex-1 truncate">{data.label || zone.zone_type}</span>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="text-red-400/60 hover:text-red-400 text-xs px-2">✕</button>
        <span className="text-white/30 text-xs">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="p-3 flex flex-col gap-2">
          {/* Label */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Name</label>
            <input value={data.label} onChange={e => update({ label: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-purple-400" />
          </div>

          {/* Size */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">ขนาด (Grid Size)</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3].map(level => (
                <button
                  key={level}
                  onClick={() => onUpdateSize(level)}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    currentSize === level
                      ? 'bg-purple-500/30 border-purple-400 text-white'
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {level}×{level}
                </button>
              ))}
            </div>
          </div>

          {/* Stat effects */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Stat Effects</label>
            <div className="grid grid-cols-2 gap-1.5">
              {STAT_KEYS.map(key => (
                <div key={key} className="flex items-center gap-1">
                  <span className="text-xs text-white/40 w-16">{key}</span>
                  <input
                    type="number" min="-100" max="100"
                    value={data.stat_effects[key] ?? ''}
                    onChange={e => updateStat(key, e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Animation */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Animation</label>
            <select value={data.animation} onChange={e => update({ animation: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-purple-400">
              {ANIMATION_PRESETS.map(a => (
                <option key={a.id} value={a.id} className="bg-gray-900">{a.label}</option>
              ))}
              <option value="custom" className="bg-gray-900">✏️ Custom keyframe name</option>
            </select>
            {data.animation === 'custom' && (
              <input value={data.animation} onChange={e => update({ animation: e.target.value })}
                placeholder="e.g. my_animation"
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-purple-400" />
            )}
          </div>

          {/* Bubble message */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">Bubble Message</label>
            <input value={data.bubble_message} onChange={e => update({ bubble_message: e.target.value })}
              placeholder="e.g. อ่านหนังสือเสร็จแล้ว~ ✨"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-purple-400" />
          </div>
        </div>
      )}
    </div>
  )
}