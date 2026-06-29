'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { calcCurrentStats, applyAction } from '@/lib/stats'
import type { Stats } from '@/lib/stats'
import RoomEditor from './RoomEditor'
import RoomCanvas from './RoomCanvas'
import ActionPanel from './ActionPanel'
import MoodSpriteUpload from './MoodSpriteUpload'
import { Personality } from '@/lib/personality'
import PersonalitySelector from './PersonalitySelector'
import { type VisitorData } from './IsoVisitor'
import RelationshipPanel from './RelationshipPanel'
import TransferOwnershipPanel from './TransferOwnershipPanel'
import MemoryJournal from './MemoryJournal'
import Link from 'next/link'
import ChatManager from './Chatmanager'
import ChatBubble from './Chatbubble'
import CustomFurniturePanel from './Customfurniturepanel'
import ZoneEditor from './ZoneEditor'

export type RoomZone = {
  id: string
  character_id: string
  zone_type: string
  image_url: string | null
  x: number
  y: number
  width: number
  col: number
  row: number
  size_level?: number  // 1 = 1x1, 2 = 2x2, 3 = 3x3
  custom_data?: any
}

type Props = {
  characterId: string
  characterName: string
  spriteUrl: string | null
  bgUrl: string | null
  initialStats: Stats & { last_updated: string; social?: number }
  initialZones: RoomZone[]
  initialCharacter: {
    mood_sprites: Record<string, string> | null
    personality: string | null
    ref_sheet_url?: string | null
    room_sprite_url?: string | null
    room_bg_color?: string | null
    chat_messages?: { id: string; text: string }[] | null
    auto_life?: boolean | null
  }
  isOwner: boolean
  currentBgUrl: string | null
  currentSpriteUrl: string | null
}

type Tab = 'room' | 'bonds' | 'diary'
type SettingsTab = 'personality' | 'appearance' | 'furniture' | 'chat'

export default function RoomClient({
  characterId, characterName, spriteUrl, bgUrl,
  initialStats, initialZones, initialCharacter,
  isOwner, currentBgUrl, currentSpriteUrl,
}: Props) {
  const initialStatsSnapshot = {
    ...initialStats,
    social: initialStats.social ?? 80,
    last_updated: initialStats.last_updated ?? new Date().toISOString(),
  }

  const savedStatsRef = useRef<Stats & { last_updated: string }>(initialStatsSnapshot)
  // Tracks the last values actually written to the DB (rounded integers),
  // so the sync timer can detect real drift without comparing floats.
  const lastPersistedRef = useRef<Stats>({
    hunger: Math.round(initialStatsSnapshot.hunger),
    happiness: Math.round(initialStatsSnapshot.happiness),
    energy: Math.round(initialStatsSnapshot.energy),
    social: Math.round(initialStatsSnapshot.social ?? 80),
  })

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const supabase = useMemo(() => createClient(), [])

  // page.tsx already computed the correct decayed values and wrote them to DB
  // with last_updated = now. Use those directly — no need to re-run calcCurrentStats
  // which would introduce a small float offset vs what the DB actually stored.
  const [liveStats, setLiveStats] = useState<Stats>({
    hunger: initialStatsSnapshot.hunger,
    happiness: initialStatsSnapshot.happiness,
    energy: initialStatsSnapshot.energy,
    social: initialStatsSnapshot.social,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      // Always compute decay relative to savedStatsRef, which is updated
      // each time an action or sync write resets the baseline.
      setLiveStats(calcCurrentStats(savedStatsRef.current, savedStatsRef.current.last_updated))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Keep a ref to liveStats so the sync interval always reads the latest value
  // without needing it in the dependency array (avoids recreating the interval).
  const liveStatsRef = useRef<Stats>(liveStats)
  useEffect(() => { liveStatsRef.current = liveStats }, [liveStats])

  useEffect(() => {
    const interval = setInterval(() => {
      ;(async () => {
        const current = liveStatsRef.current
        const persisted = lastPersistedRef.current

        // Compare rounded integers — avoids false positives from float drift
        const rH = Math.round(current.hunger)
        const rHp = Math.round(current.happiness)
        const rE = Math.round(current.energy)
        const rS = Math.round(current.social)

        if (
          rH === persisted.hunger &&
          rHp === persisted.happiness &&
          rE === persisted.energy &&
          rS === persisted.social
        ) {
          return
        }

        const now = new Date().toISOString()
        // Keep savedStatsRef in sync so calcCurrentStats stays accurate
        savedStatsRef.current = { ...current, last_updated: now }

        const { error } = await supabase.from('character_stats').update({
          hunger: rH,
          happiness: rHp,
          energy: rE,
          social: rS,
          last_updated: now,
        }).eq('character_id', characterId)

        if (error) {
          console.error('Failed to persist decayed stats', error.message)
        } else {
          // Only update lastPersistedRef on confirmed DB write
          lastPersistedRef.current = { hunger: rH, happiness: rHp, energy: rE, social: rS }
        }
      })()
    }, 30000)
    return () => clearInterval(interval)
  }, [characterId, supabase])

  function updateLiveStats(next: Stats) {
    const now = new Date().toISOString()
    // Store rounded values so the decay baseline in savedStatsRef exactly
    // matches what ActionPanel wrote to the DB — prevents float drift.
    const rounded: Stats = {
      hunger: Math.round(next.hunger),
      happiness: Math.round(next.happiness),
      energy: Math.round(next.energy),
      social: Math.round(next.social),
    }
    savedStatsRef.current = { ...rounded, last_updated: now }
    setLiveStats(rounded)
    // ActionPanel already wrote these values to DB — record them as persisted
    // so the 30s sync timer doesn't immediately re-write the same values.
    lastPersistedRef.current = rounded
  }
  const [zones, setZones] = useState<RoomZone[]>(initialZones)
  const [pendingAction, setPendingAction] = useState<{ action: string; ts: number } | null>(null)
  const [moodSprites, setMoodSprites] = useState<Record<string, string>>(
    (initialCharacter.mood_sprites as Record<string, string>) ?? {}
  )
  const [personality, setPersonality] = useState<Personality>(
    (initialCharacter.personality as Personality) ?? 'friendly'
  )
  const [visitors, setVisitors] = useState<VisitorData[]>([])
  const [autoLife, setAutoLife] = useState<boolean>(initialCharacter.auto_life ?? false)
  useEffect(() => {
    // Instant-paint from cache so the toggle doesn't flash off while the
    // server value (initialCharacter.auto_life) is in transit, but the
    // database — not localStorage — is the source of truth. If the two
    // disagree, re-sync localStorage to match the DB.
    try {
      const cached = localStorage.getItem(`auto_life_${characterId}`)
      const dbValue = initialCharacter.auto_life ?? false
      if (cached !== null && cached === '1' !== dbValue) {
        localStorage.setItem(`auto_life_${characterId}`, dbValue ? '1' : '0')
      }
      setAutoLife(dbValue)
    } catch {}
  }, [characterId, initialCharacter.auto_life])
  const [preparingAction, setPreparingAction] = useState<string | null>(null)
  const prepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tab, setTab] = useState<Tab>('room')
  const [bgColor, setBgColor] = useState(initialCharacter.room_bg_color ?? '#302b63')
  const [chatText, setChatText] = useState<string | null>(null)
  const [customSpeechText, setCustomSpeechText] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('personality')
  const visitorTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const avatarUrl = initialCharacter.room_sprite_url ?? initialCharacter.ref_sheet_url ?? null

  const PERSONALITY_BADGE: Record<string, { label: string; color: string }> = {
    shy: { label: 'Shy & quiet', color: '#a78bfa' },
    friendly: { label: 'Friendly & warm', color: '#34d399' },
    observant: { label: 'Calm & observant', color: '#60a5fa' },
    playful: { label: 'Energetic & social', color: '#f472b6' },
    calm: { label: 'Calm & collected', color: '#94a3b8' },
  }
  const badge = PERSONALITY_BADGE[personality] ?? PERSONALITY_BADGE['friendly']

  const STATS_CONFIG = [
    { key: 'hunger' as const, label: 'Tummy', color: '#fb923c', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> },
    { key: 'energy' as const, label: 'Energy', color: '#facc15', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
    { key: 'happiness' as const, label: 'Mood', color: '#f472b6', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> },
    { key: 'social' as const, label: 'Social', color: '#60a5fa', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  ]

  const SETTINGS_TABS: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'personality', label: 'Personality', icon: '✨' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'furniture', label: 'Furniture', icon: '🪑' },
    { id: 'chat', label: 'Chat', icon: '💬' },
  ]

  useEffect(() => {
    if (!characterId) return
    async function checkVisit() {
      const res = await fetch('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      })
      const { visitors: newVisitors } = await res.json()
      if (newVisitors.length > 0) {
        setVisitors(prev => {
          const existing = new Set(prev.map(v => v.characterId))
          const fresh = newVisitors
            .filter((v: any) => !existing.has(v.characterId))
            .map((v: any) => ({ ...v, personality: v.personality as Personality, tier: v.tier as 'stranger' | 'friend' | 'rival' }))
          fresh.forEach((v: any) => {
            if (visitorTimeoutsRef.current[v.characterId]) clearTimeout(visitorTimeoutsRef.current[v.characterId])
            visitorTimeoutsRef.current[v.characterId] = setTimeout(() => {
              setVisitors(p => p.filter(x => x.characterId !== v.characterId))
              delete visitorTimeoutsRef.current[v.characterId]
              createClient().from('character_visits').delete().eq('visitor_id', v.characterId).eq('host_id', characterId).then(() => { })
            }, 10 * 60 * 1000)
          })
          return [...prev, ...fresh]
        })
      }
    }
    checkVisit()
    const interval = setInterval(checkVisit, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [characterId])

  useEffect(() => {
    if (!characterId) return
    async function loadActiveVisits() {
      const { data } = await supabase
        .from('character_visits')
        .select('*, visitor:visitor_id(id, name, room_sprite_url, personality)')
        .eq('host_id', characterId)
        .gt('ends_at', new Date().toISOString())
      if (!data) return
      const active = data.map((v: any) => ({
        characterId: v.visitor.id,
        name: v.visitor.name,
        spriteUrl: v.visitor.room_sprite_url ?? '',
        personality: (v.visitor.personality ?? 'friendly') as Personality,
        tier: 'stranger' as const,
      }))
      setVisitors(prev => {
        const existing = new Set(prev.map(v => v.characterId))
        return [...prev, ...active.filter(v => !existing.has(v.characterId))]
      })
    }
    loadActiveVisits()
  }, [characterId])

  function handleVisitorLeave(cid: string) {
    setVisitors(prev => prev.filter(v => v.characterId !== cid))
  }

  async function handleAutoLifeToggle() {
    const next = !autoLife
    // Optimistic UI + cache update first...
    setAutoLife(next)
    try { localStorage.setItem(`auto_life_${characterId}`, next ? '1' : '0') } catch {}
    // ...then persist to the database, which is the actual source of truth.
    const { error } = await supabase
      .from('characters')
      .update({ auto_life: next })
      .eq('id', characterId)
    if (error) {
      console.error('Failed to save auto-life setting:', error.message)
      // Roll back on failure so the UI doesn't claim a state that isn't saved.
      setAutoLife(!next)
      try { localStorage.setItem(`auto_life_${characterId}`, !next ? '1' : '0') } catch {}
    }
  }

  // ---- auto-life: monitor stats and trigger prepare+action -----
  useEffect(() => {
    if (!autoLife) return
    const LOW_THRESHOLD = 50
    const check = () => {
      // Don't queue a new action while one is already being prepared OR
      // already walking/in-flight — pendingAction stays non-null from the
      // moment it's set until onActionComplete fires after arrival. Without
      // this guard, the 1s liveStats decay tick keeps re-running this effect,
      // and since stats haven't changed yet (the action hasn't landed), it
      // would keep re-queuing the SAME action with a new timestamp — which
      // makes IsoCharacter restart the walk every time, so the character
      // never actually arrives and the stat boost never gets saved.
      if (preparingAction || pendingAction) return
      const allLow =
        liveStats.hunger < LOW_THRESHOLD &&
        liveStats.energy < LOW_THRESHOLD &&
        liveStats.happiness < LOW_THRESHOLD
      if (!allLow) return

      const candidates = [
        { action: 'feed', value: liveStats.hunger, label: 'feed' },
        { action: 'sleep', value: liveStats.energy, label: 'sleep' },
        { action: 'play', value: liveStats.happiness, label: 'play' },
      ]
        .sort((a, b) => a.value - b.value)
      const choice = candidates[0]

      console.debug('[RoomClient] autoLife preparing', choice.action, 'stats', {
        hunger: liveStats.hunger,
        energy: liveStats.energy,
        happiness: liveStats.happiness,
      })
      setPreparingAction(choice.action)
      prepTimerRef.current = setTimeout(() => {
        console.debug('[RoomClient] autoLife trigger', choice.action)
        setPendingAction({ action: choice.action, ts: Date.now() })
        setPreparingAction(null)
      }, 2000)
    }
    check()
    const id = setInterval(check, 3000)
    return () => { clearInterval(id) }
  }, [autoLife, liveStats, preparingAction, pendingAction])

  // ensure prep timer cleared on unmount
  useEffect(() => {
    return () => { if (prepTimerRef.current) clearTimeout(prepTimerRef.current) }
  }, [])

  async function handleZoneMove(id: string, col: number, row: number) {
    setZones(prev => prev.map(z => z.id === id ? { ...z, col, row } : z))
    const { error } = await supabase.from('room_zones').update({ col, row }).eq('id', id)
    if (error) {
      console.error('Failed to save zone position:', error.message)
    }
  }

  if (!spriteUrl) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/40">
        No character sprite yet — upload a ref sheet first.
      </div>
    )
  }

  return (
    <>
      {/* ============ MAIN GRID ============ */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 260px', height: '100vh', background: bgColor, overflow: 'hidden', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', padding: '18px 14px 14px' }}>

          {/* Back */}
          <Link href={`/character/${characterId}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.35)', fontSize: 12, textDecoration: 'none', marginBottom: 24, letterSpacing: 0.2, transition: 'color .15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </Link>

          {/* Avatar + name */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            {avatarUrl
              ? <img src={avatarUrl} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.12)' }} />
              : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🐾</div>
            }
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 14, letterSpacing: 0.1 }}>{characterName}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>Room</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {([
              {
                id: 'room', label: 'Room',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22V12L12 3l10 9v10"/><path d="M15 22v-6a3 3 0 0 0-6 0v6"/></svg>,
              },
              {
                id: 'bonds', label: 'Bonds',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
              },
              {
                id: 'diary', label: 'Diary',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="6" x2="16" y2="6"/><line x1="12" y1="10" x2="16" y2="10"/><line x1="12" y1="14" x2="16" y2="14"/></svg>,
              },
            ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(({ id: t, label, icon }) => {
              const active = tab === t
              return (
                <button key={t} onClick={() => setTab(t)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: active ? 600 : 400, letterSpacing: 0.1,
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: active ? 'white' : 'rgba(255,255,255,0.35)',
                  transition: 'all .15s', textAlign: 'left', width: '100%',
                  boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.1)' : 'none',
                }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' } }}>
                  {icon}
                  {label}
                </button>
              )
            })}
          </nav>

          <div style={{ flex: 1 }} />

          {/* Edit room button */}
          {isOwner && (
            <button
              onClick={() => setEditMode(e => !e)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '10px 14px', borderRadius: 12,
                border: editMode ? '1px solid rgba(120,180,255,0.5)' : '1px solid rgba(255,255,255,0.07)',
                background: editMode ? 'rgba(120,180,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: editMode ? 'rgba(120,180,255,0.9)' : 'rgba(255,255,255,0.45)',
                fontSize: 12, cursor: 'pointer', letterSpacing: 0.2,
                transition: 'all .15s', fontWeight: 500,
              }}
            >
              {editMode
                ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Done</>
                : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit room</>
              }
            </button>
          )}

          {/* Owner tools */}
          {isOwner && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <RoomEditor characterId={characterId} currentBgUrl={currentBgUrl} currentSpriteUrl={currentSpriteUrl} currentBgColor={bgColor} onBgColorChange={setBgColor} />
              <TransferOwnershipPanel characterId={characterId} characterName={characterName} />
            </div>
          )}
        </aside>

        {/* ── CENTER CANVAS ── */}
        <main style={{ position: 'relative', overflow: 'hidden' }}>
          {tab === 'room' && (
            <>
              <RoomCanvas
                spriteUrl={spriteUrl} bgUrl={bgUrl} stats={liveStats} zones={zones}
                pendingAction={pendingAction} onActionComplete={() => setPendingAction(null)}
                moodSprites={moodSprites} personality={personality} isOwner={isOwner}
                onZonesChange={handleZoneMove} visitors={visitors} onVisitorLeave={handleVisitorLeave}
                bgColor={bgColor} customSpeechText={customSpeechText}
                editMode={editMode} onEditModeChange={setEditMode}
                preparingAction={preparingAction}
                onTriggerAction={async (action: string) => {
                  // onTriggerAction fires via onArrive — the character has already
                  // reached the zone. Write to DB immediately (no animation delay needed).
                  console.debug('[RoomClient] onTriggerAction CALLED for', action, 'liveStatsRef at call time', liveStatsRef.current)
                  try {
                    const next = applyAction(liveStatsRef.current, action)
                    const rounded: Stats = {
                      hunger: Math.round(next.hunger),
                      happiness: Math.round(next.happiness),
                      energy: Math.round(next.energy),
                      social: Math.round(next.social),
                    }
                    const now = new Date().toISOString()
                    const { error: actionErr } = await supabase.from('character_stats').update({
                      ...rounded,
                      last_updated: now,
                    }).eq('character_id', characterId)
                    if (!actionErr) {
                      console.debug('[RoomClient] onTriggerAction DB write OK', action, rounded)
                      savedStatsRef.current = { ...rounded, last_updated: now }
                      setLiveStats(rounded)
                      lastPersistedRef.current = rounded
                    } else {
                      // This was previously swallowed entirely — if the write fails
                      // (e.g. an RLS policy rejecting it), nothing was logged and the
                      // stat silently never updated.
                      console.error('[RoomClient] onTriggerAction DB write FAILED', action, actionErr)
                    }
                    fetch('/api/memory', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ characterId, action, characterName }),
                    }).catch(() => {})
                  } catch (err) {
                    console.error('[RoomClient] onTriggerAction threw', action, err)
                  }
                }}
              />
              <ChatBubble text={chatText} spriteUrl={spriteUrl} characterName={characterName} />
            </>
          )}
          {tab === 'bonds' && <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}><RelationshipPanel characterId={characterId} isOwner={isOwner} /></div>}
          {tab === 'diary' && <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}><MemoryJournal characterId={characterId} /></div>}
        </main>

        {/* ── RIGHT PANEL ── */}
        <aside style={{ borderLeft: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '20px 16px', gap: 14 }}>

          {/* Character card */}
          <div style={{ borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {avatarUrl && (
              <div style={{ width: '100%', height: 90, overflow: 'hidden', position: 'relative' }}>
                <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(12px) brightness(0.4)', transform: 'scale(1.1)' }} />
              </div>
            )}
            <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {avatarUrl
                  ? <img src={avatarUrl} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                  : <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🐾</div>
                }
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{characterName}</div>
                  <div style={{ marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 4, background: `${badge.color}18`, border: `1px solid ${badge.color}30`, borderRadius: 20, padding: '2px 8px' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: badge.color, flexShrink: 0 }} />
                    <span style={{ color: badge.color, fontSize: 10, fontWeight: 500 }}>{badge.label}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 13 }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase' }}>Status</span>
            {mounted && STATS_CONFIG.map(({ key, label, icon, color }) => {
              const rawValue = liveStats[key] ?? 0
              const displayValue = Number(rawValue.toFixed(1))
              const percent = Math.max(0, Math.min(100, rawValue))
              const low = rawValue < 25
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ color: color, opacity: 0.85 }}>{icon}</span>
                      {label}
                    </span>
                    <span style={{ color: low ? color : 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: low ? 600 : 400, transition: 'color .3s' }}>{displayValue}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${percent}%`, background: low ? color : `${color}99`, borderRadius: 99, transition: 'width .6s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          {isOwner && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Actions</span>
              <ActionPanel
                characterId={characterId} characterName={characterName} liveStats={liveStats}
                zones={zones} onUpdate={updateLiveStats}
                onTriggerAction={(action) => setPendingAction({ action, ts: Date.now() })}
                onChatTrigger={(text) => setCustomSpeechText(text + '\u200B'.repeat(Date.now() % 100))}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <button onClick={handleAutoLifeToggle}
                  style={{ padding: '6px 8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: autoLife ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)', color: autoLife ? '#22c55e' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12 }}>
                  Auto-life: {autoLife ? 'On' : 'Off'}
                </button>
                <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11 }}>Automatically prepare and act when stats are low</span>
              </div>
            </div>
          )}

          {/* Settings */}
          {isOwner && (
            <button onClick={() => setShowSettings(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.45)', fontSize: 12, cursor: 'pointer', letterSpacing: 0.2, transition: 'all .15s', fontWeight: 500 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M4.93 4.93A10 10 0 0 1 19.07 19.07"/><path d="M12 2v2m0 18v2M2 12h2m18 0h2"/></svg>
              Settings
            </button>
          )}

          <ChatManager
            characterId={characterId}
            initialMessages={(initialCharacter.chat_messages as any[]) ?? []}
            isOwner={false}
            lastAction={pendingAction?.action ?? null}
            hasVisitor={visitors.length > 0}
            onTrigger={setChatText}
          />
        </aside>
      </div>

      {/* ============ SETTINGS MODAL ============ */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowSettings(false)}>
          <div style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, width: '80vw', maxWidth: 900, height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 0' }}>
              <span style={{ color: 'white', fontWeight: 600, fontSize: 15, letterSpacing: 0.1 }}>Settings</span>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6, transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '14px 20px 0' }}>
              {SETTINGS_TABS.map(t => (
                <button key={t.id} onClick={() => setSettingsTab(t.id)}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: settingsTab === t.id ? 700 : 500, letterSpacing: 0.3, background: settingsTab === t.id ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)', color: settingsTab === t.id ? '#a78bfa' : 'rgba(255,255,255,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all .15s', textTransform: 'uppercase' }}>
                  <span style={{ fontSize: 15 }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {settingsTab === 'personality' && <PersonalitySelector characterId={characterId} current={personality} onUpdate={setPersonality} />}
              {settingsTab === 'appearance' && <MoodSpriteUpload characterId={characterId} currentSprites={moodSprites} onUpdate={setMoodSprites} />}
              {settingsTab === 'furniture' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <ZoneEditor characterId={characterId} zones={zones} onZonesChange={setZones} />
                  <CustomFurniturePanel characterId={characterId} zones={zones as any} onZonesChange={setZones as any} />
                </div>
              )}
              {settingsTab === 'chat' && (
                <ChatManager
                  characterId={characterId}
                  initialMessages={(initialCharacter.chat_messages as any[]) ?? []}
                  isOwner={true}
                  lastAction={pendingAction?.action ?? null}
                  hasVisitor={visitors.length > 0}
                  onTrigger={setChatText}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}