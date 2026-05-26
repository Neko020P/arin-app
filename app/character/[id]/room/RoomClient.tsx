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
  const [liveStats, setLiveStats] = useState<Stats>(() =>
    calcCurrentStats({ ...initialStats, social: initialStats.social ?? 80 }, initialStats.last_updated)
  )
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
              createClient().from('character_visits').delete().eq('visitor_id', v.characterId).eq('host_id', characterId).then(() => {})
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
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 280px', height: 'calc(100vh - 0px)', background: bgColor, overflow: 'hidden' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '20px 16px', gap: 8, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <Link href={`/character/${characterId}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            ← Back
          </Link>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            {avatarUrl
              ? <img src={avatarUrl} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)', margin: '0 auto 8px', display: 'block' }} />
              : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🐾</div>
            }
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{characterName}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{characterName}'s Room</div>
          </div>
          {(['room', 'bonds', 'diary'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? 'rgba(255,255,255,0.12)' : 'transparent', border: 'none', borderRadius: 10, padding: '10px 14px', color: tab === t ? 'white' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: tab === t ? 600 : 400, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
              {t === 'room' ? '🏠' : t === 'bonds' ? '💝' : '📖'}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {isOwner && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <RoomEditor characterId={characterId} currentBgUrl={currentBgUrl} currentSpriteUrl={currentSpriteUrl} currentBgColor={bgColor} onBgColorChange={setBgColor} />
              <TransferOwnershipPanel characterId={characterId} characterName={characterName} />
            </div>
          )}
        </div>

        {/* CENTER CANVAS */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
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
        </div>

        {/* RIGHT PANEL */}
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, textAlign: 'center' }}>
            {avatarUrl
              ? <img src={avatarUrl} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.15)', margin: '0 auto 10px', display: 'block' }} />
              : <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🐾</div>
            }
            <div style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>{characterName}</div>
            <div style={{ display: 'inline-block', marginTop: 6, background: `${badge.color}22`, border: `1px solid ${badge.color}44`, color: badge.color, borderRadius: 20, padding: '3px 10px', fontSize: 11 }}>✨ {badge.label}</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {STATS_CONFIG.map(({ key, label, icon, color }) => {
              const val = Math.round(liveStats[key] ?? 0)
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{icon} {label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{val}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: 99, transition: 'width 0.7s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          <ActionPanel
            characterId={characterId} characterName={characterName} liveStats={liveStats}
            zones={zones} onUpdate={setLiveStats}
            onTriggerAction={(action) => setPendingAction({ action, ts: Date.now() })}
            onChatTrigger={(text) => setCustomSpeechText(text + '\u200B'.repeat(Date.now() % 100))}
          />

          {isOwner && (
            <button onClick={() => setShowSettings(true)}
              style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '10px 14px', color: 'rgba(255,255,255,0.7)', background: 'transparent', cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚙️ Settings
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
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowSettings(false)}>
          <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: 360, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0' }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>⚙️ Settings</span>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '16px 20px 0' }}>
              {SETTINGS_TABS.map(t => (
                <button key={t.id} onClick={() => setSettingsTab(t.id)}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: settingsTab === t.id ? 700 : 400, background: settingsTab === t.id ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)', color: settingsTab === t.id ? '#a78bfa' : 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {settingsTab === 'personality' && (
                <PersonalitySelector characterId={characterId} current={personality} onUpdate={setPersonality} />
              )}
              {settingsTab === 'appearance' && (
                <MoodSpriteUpload characterId={characterId} currentSprites={moodSprites} onUpdate={setMoodSprites} />
              )}
              {settingsTab === 'furniture' && (
                <CustomFurniturePanel characterId={characterId} zones={zones as any} onZonesChange={setZones as any} />
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