'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { applyAction, applyCustomAction } from '@/lib/stats'
import type { Stats } from '@/lib/stats'
import type { RoomZone } from './RoomClient'

const ACTIONS = [
  {
    id: 'feed', label: 'Feed', zone: 'table', cooldown: 30,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    ),
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    activeBg: 'rgba(249,115,22,0.22)',
    border: 'rgba(249,115,22,0.25)',
  },
  {
    id: 'play', label: 'Play', zone: 'play', cooldown: 60,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
      </svg>
    ),
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    activeBg: 'rgba(167,139,250,0.22)',
    border: 'rgba(167,139,250,0.25)',
  },
  {
    id: 'bath', label: 'Bath', zone: 'bath', cooldown: 120,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6 C9 6 9 3 12 3 C15 3 15 6 15 6"/><path d="M2 12h20v4a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6v-4z"/><path d="M4 12V6a2 2 0 0 1 2-2h2"/>
      </svg>
    ),
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.12)',
    activeBg: 'rgba(56,189,248,0.22)',
    border: 'rgba(56,189,248,0.25)',
  },
  {
    id: 'sleep', label: 'Sleep', zone: 'bed', cooldown: 180,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>
      </svg>
    ),
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.12)',
    activeBg: 'rgba(129,140,248,0.22)',
    border: 'rgba(129,140,248,0.25)',
  },
]

type CustomData = {
  label: string
  stat_effects: Partial<Stats>
  bubble_message: string
  animation: string
}

type Props = {
  characterId: string
  characterName: string
  liveStats: Stats
  zones: RoomZone[]
  onUpdate: (next: Stats) => void
  onTriggerAction: (action: string) => void
  onChatTrigger?: (text: string) => void
}

export default function ActionPanel({
  characterId, characterName, liveStats, zones, onUpdate, onTriggerAction, onChatTrigger,
}: Props) {
  const supabase = createClient()
  const STORAGE_KEY = `action_cooldowns_${characterId}`

  const [lastUsed, setLastUsed] = useState<Record<string, number>>({})
  const [tick, setTick] = useState(0)  // force re-render ทุกวิเพื่ออัปเดต cooldown

  // โหลด cooldown จาก localStorage หลัง mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const coerced: Record<string, number> = {}
        for (const k of Object.keys(parsed)) {
          const v = parsed[k]
          coerced[k] = typeof v === 'number' ? v : Number(v) || 0
        }
        setLastUsed(coerced)
      }
    } catch {}
  }, [STORAGE_KEY])

  // tick ทุก 1 วิเพื่อให้ remaining นับถอยหลังได้
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const [loading, setLoading] = useState<string | null>(null)

  // เก็บ liveStats ปัจจุบันไว้ใน ref ป้องกัน stale closure ใน setTimeout
  const liveStatsRef = useRef(liveStats)
  useEffect(() => { liveStatsRef.current = liveStats }, [liveStats])

  // กันกด action ซ้อนกัน (ปุ่มอื่นกดไม่ได้ระหว่าง action ใดๆ กำลังทำงาน)
  const isBusyRef = useRef(false)

  const customZones = zones.filter(z => z.zone_type.startsWith('custom') && (z as any).custom_data)

  async function handleAction(actionId: string, customData?: CustomData) {
    if (isBusyRef.current) return
    isBusyRef.current = true
    setLoading(actionId)
    onTriggerAction(actionId)

    // optimistic: บันทึกเวลาใช้งานทันทีเพื่อป้องกัน UI ค้างถ้า network ช้า
    setLastUsed(prev => {
      const updated = { ...prev, [actionId]: Date.now() }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })

    // safety net: บังคับ reset ภายใน 8 วิ ไม่ว่า network จะ hang หรือ throw อะไรก็ตาม
    const safetyTimer = setTimeout(() => {
      setLoading(null)
      isBusyRef.current = false
    }, 8000)

    try {
      await new Promise(res => setTimeout(res, 1500))

      const baseStats = liveStatsRef.current
      const next = customData
        ? applyCustomAction(baseStats, customData.stat_effects)
        : applyAction(baseStats, actionId)

      const { error } = await supabase
        .from('character_stats')
        .update({
          hunger: Math.round(next.hunger),
          happiness: Math.round(next.happiness),
          energy: Math.round(next.energy),
          social: Math.round(next.social),
          last_updated: new Date().toISOString(),
        })
        .eq('character_id', characterId)

      if (!error) {
        onUpdate(next)
        setLastUsed(prev => {
          const updated = { ...prev, [actionId]: Date.now() }
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
          return updated
        })
        if (customData?.bubble_message) onChatTrigger?.(customData.bubble_message)
        fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, action: actionId, characterName }),
        }).catch(() => {})
      }
    } catch {
      // ไม่ทำอะไร — finally จัดการ reset
    } finally {
      clearTimeout(safetyTimer)
      setLoading(null)
      isBusyRef.current = false
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', zIndex: 210 }}>
      {/* Default actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {ACTIONS.map(({ id, label, icon, zone, cooldown, color, bg, activeBg, border }) => {
          const elapsed = (Date.now() - (lastUsed[id] ?? 0)) / 1000
          const onCooldown = elapsed < cooldown
          const remaining = Math.max(0, Math.ceil(cooldown - elapsed))
          const isLoading = loading === id
          const hasZone = zones.some(z => z.zone_type === zone)
          const disabled = onCooldown || !!loading || !hasZone
          const pct = onCooldown ? Math.min(100, Math.max(0, (elapsed / cooldown) * 100)) : 100

          return (
            <button
              key={id}
              disabled={disabled}
              onClick={() => handleAction(id)}
              title={!hasZone ? `ยังไม่มี ${zone} zone` : undefined}
              style={{
                position: 'relative',
                zIndex: 212,
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                padding: '12px 8px 10px',
                borderRadius: 14,
                border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : border}`,
                background: isLoading ? activeBg : disabled ? 'rgba(255,255,255,0.03)' : bg,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled && !isLoading ? 0.4 : 1,
                transition: 'all .15s',
                overflow: 'hidden',
              }}
              onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = activeBg }}
              onMouseLeave={e => { e.currentTarget.style.background = isLoading ? activeBg : disabled ? 'rgba(255,255,255,0.03)' : bg }}
            >
              {/* cooldown arc overlay */}
              {onCooldown && !isLoading && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(to top, rgba(0,0,0,0.35) ${100 - pct}%, transparent ${100 - pct}%)`,
                  pointerEvents: 'none',
                }} />
              )}

              {/* icon: zone image ถ้ามี, fallback SVG */}
              {zones.find(z => z.zone_type === zone)?.image_url
                ? <img
                    src={zones.find(z => z.zone_type === zone)!.image_url!}
                    style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 6, opacity: disabled ? 0.3 : 1, border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                : <span style={{ color: disabled ? 'rgba(255,255,255,0.25)' : color, lineHeight: 1 }}>
                    {icon}
                  </span>
              }

              <span style={{
                color: disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.3,
              }}>
                {isLoading ? '···' : label}
              </span>

              {onCooldown && !isLoading && (
                <span style={{
                  position: 'absolute', bottom: 5,
                  fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700,
                }}>
                  {remaining}s
                </span>
              )}

              {!hasZone && (
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', marginTop: -3 }}>
                  no zone
                </span>
              )}

              {isLoading && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                  animation: 'shimmer 1s infinite',
                  pointerEvents: 'none',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Custom furniture actions — image icon, full width row */}
      {customZones.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', paddingLeft: 2 }}>
            Furniture
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {customZones.map(z => {
            const c = (z as any).custom_data as CustomData
            const id = z.zone_type
            const elapsed = (Date.now() - (lastUsed[id] ?? 0)) / 1000
            const onCooldown = elapsed < 60
            const remaining = Math.max(0, Math.ceil(60 - elapsed))
            const isLoading = loading === id
            const disabled = onCooldown || !!loading
            const pct = onCooldown ? Math.min(100, Math.max(0, (elapsed / 60) * 100)) : 100

            return (
              <button
                key={id}
                disabled={disabled}
                onClick={() => handleAction(id, c)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  padding: '12px 8px 10px',
                  borderRadius: 14,
                  border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : 'rgba(167,139,250,0.25)'}`,
                  background: isLoading ? 'rgba(167,139,250,0.22)' : disabled ? 'rgba(255,255,255,0.03)' : 'rgba(167,139,250,0.12)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled && !isLoading ? 0.4 : 1,
                  transition: 'all .15s',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(167,139,250,0.22)' }}
                onMouseLeave={e => { e.currentTarget.style.background = isLoading ? 'rgba(167,139,250,0.22)' : disabled ? 'rgba(255,255,255,0.03)' : 'rgba(167,139,250,0.12)' }}
              >
                {onCooldown && !isLoading && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(to top, rgba(0,0,0,0.35) ${100 - pct}%, transparent ${100 - pct}%)`,
                    pointerEvents: 'none',
                  }} />
                )}

                {z.image_url ? (
                  <img src={z.image_url} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6, opacity: disabled ? 0.3 : 1 }} />
                ) : (
                  <span style={{ fontSize: 20, lineHeight: 1, opacity: disabled ? 0.3 : 1 }}>🪑</span>
                )}

                <span style={{
                  color: disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)',
                  fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
                }}>
                  {isLoading ? '···' : c.label || id}
                </span>

                {onCooldown && !isLoading && (
                  <span style={{ position: 'absolute', bottom: 5, fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
                    {remaining}s
                  </span>
                )}

                {isLoading && (
                  <div style={{
                    position: 'absolute', inset: 0,
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                      animation: 'shimmer 1s infinite',
                      pointerEvents: 'none',
                  }} />
                )}
              </button>
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}