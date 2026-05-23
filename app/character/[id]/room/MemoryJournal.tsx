'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Memory } from '@/lib/memory'

const EMOTION_EMOJI: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  excited: '🌟',
  angry: '😤',
  neutral: '😐',
  shy: '😳',
  touched: '🥹',
}

const EVENT_ICON: Record<string, string> = {
  visited: '🚶',
  was_visited: '🏠',
  fed: '🍖',
  played: '🎾',
  bathed: '🛁',
  slept: '💤',
  relationship_changed: '💫',
  gift: '🎁',
  argument: '⚔️',
  first_meeting: '✨',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

type Props = {
  characterId: string
}

export default function MemoryJournal({ characterId }: Props) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    fetchMemories()
  }, [open, characterId])

  async function fetchMemories() {
    const supabase = createClient()
    const { data } = await supabase
      .from('character_memories')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(30)
    setMemories((data as Memory[]) ?? [])
    setLoading(false)
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: open ? 'rgba(180,140,255,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(180,140,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
          color: 'rgba(255,255,255,0.7)',
          padding: '6px 14px',
          borderRadius: 8,
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        📖 Memory Journal {memories.length > 0 && !open && `(${memories.length})`}
      </button>

      {open && (
        <div style={{
          marginTop: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: 16,
          maxHeight: 320,
          overflowY: 'auto',
        }}>
          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Loading...</p>
          ) : memories.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>No memories yet.</p>
          ) : (
            memories.map(m => (
              <div key={m.id} style={{
                display: 'flex',
                gap: 10,
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: 20, flexShrink: 0 }}>
                  {EVENT_ICON[m.event_type] ?? '📝'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}>
                    {m.description}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 4,
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 14 }}>
                      {EMOTION_EMOJI[m.emotion] ?? '😐'}
                    </span>
                    <span style={{
                      color: 'rgba(255,255,255,0.25)',
                      fontSize: 10,
                    }}>
                      {timeAgo(m.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}