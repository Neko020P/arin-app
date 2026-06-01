'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useRef, useState } from 'react'
import { calcCurrentStats } from '@/lib/stats'
import type { Stats } from '@/lib/stats'
import RoomCanvas from './RoomCanvas'
import RoomEditor from './RoomEditor'
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
  const savedStatsRef = useRef<Stats & { last_updated: string }>({
    ...initialStats,
    social: initialStats.social ?? 80,
  })

  const [liveStats, setLiveStats] = useState<Stats>(() =>
    calcCurrentStats(savedStatsRef.current, savedStatsRef.current.last_updated)
  )

  // อัปเดต stats realtime ทุก 5 วิ และ save ลง DB ด้วย
  useEffect(() => {
    const tick = async () => {
      const next = calcCurrentStats(savedStatsRef.current, savedStatsRef.current.last_updated)
      const now = new Date().toISOString()
      savedStatsRef.current = { ...next, last_updated: now }
      setLiveStats(next)
      await supabase.from('character_stats').update({
        hunger: Math.round(next.hunger),
        happiness: Math.round(next.happiness),
        energy: Math.round(next.energy),
        social: Math.round(next.social),
        last_updated: now,
      }).eq('character_id', characterId)
    }
    const id = setInterval(tick, 5_000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function updateLiveStats(next: Stats) {
    const now = new Date().toISOString()
    savedStatsRef.current = { ...next, last_updated: now }
    setLiveStats(next)
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
  const [tab, setTab] = useState<Tab>('room')
  const [bgColor, setBgColor] = useState(initialCharacter.room_bg_color ?? '#302b63')
  const [chatText, setChatText] = useState<string | null>(null)
  const [customSpeechText, setCustomSpeechText] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('personality')
  const visitorTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const supabase = createClient()

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
    { key: 'hunger' as const, label: 'Tummy', icon: '🍞', color: '#fb923c' },
    { key: 'energy' as const, label: 'Energy', icon: '⚡', color: '#facc15' },
    { key: 'happiness' as const, label: 'Mood', icon: '🌸', color: '#f472b6' },
    { key: 'social' as const, label: 'Social', icon: '💬', color: '#60a5fa' },
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

  async function handleZoneMove(id: string, col: number, row: number) {
    setZones(prev => prev.map(z => z.id === id ? { ...z, col, row } : z))
    await supabase.from('room_zones').update({ col, row }).eq('id', id)
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
            {STATS_CONFIG.map(({ key, label, icon, color }) => {
              const val = Math.round(liveStats[key] ?? 0)
              const low = val < 25
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 12 }}>{icon}</span>
                      {label}
                    </span>
                    <span style={{ color: low ? color : 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: low ? 600 : 400, transition: 'color .3s' }}>{val}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${val}%`, background: low ? color : `${color}99`, borderRadius: 99, transition: 'width .6s ease' }} />
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