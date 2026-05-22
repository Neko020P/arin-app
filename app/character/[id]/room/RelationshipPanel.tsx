'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Relationship = {
  id: string
  target_id: string
  tier: 'stranger' | 'friend' | 'rival'
  visit_count: number
  last_visit: string | null
  target: {
    id: string
    name: string
    room_sprite_url: string | null
  }
}

type Props = {
  characterId: string
  isOwner: boolean
}

const TIER_LABEL: Record<string, string> = {
  stranger: '👤 คนแปลกหน้า',
  friend: '💚 เพื่อน',
  rival: '⚔️ คู่แข่ง',
}

const TIER_COLOR: Record<string, string> = {
  stranger: '#aaa',
  friend: '#69db7c',
  rival: '#ff6b6b',
}

export default function RelationshipPanel({ characterId, isOwner }: Props) {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetchRelationships()
  }, [characterId])

  async function fetchRelationships() {
    const supabase = createClient()
    const { data } = await supabase
      .from('character_relationships')
      .select('*, target:target_id(id, name, room_sprite_url)')
      .eq('character_id', characterId)
    setRelationships((data as Relationship[]) ?? [])
    setLoading(false)
  }

  async function searchCharacters(name: string) {
    if (!name.trim()) return
    const supabase = createClient()
    const { data } = await supabase
      .from('characters')
      .select('id, name')
      .ilike('name', `%${name}%`)
      .neq('id', characterId)
      .limit(5)
    setSearchResults(data ?? [])
  }

  async function addRelationship(targetId: string) {
    const supabase = createClient()
    await supabase.from('character_relationships').upsert({
      character_id: characterId,
      target_id: targetId,
      tier: 'stranger',
      visit_count: 0,
    })
    setShowAdd(false)
    setSearchName('')
    setSearchResults([])
    fetchRelationships()
  }

  async function removeRelationship(id: string) {
    const supabase = createClient()
    await supabase.from('character_relationships').delete().eq('id', id)
    fetchRelationships()
  }

  if (loading) return null

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>ความสัมพันธ์</h3>
        {isOwner && (
          <button
            onClick={() => setShowAdd(v => !v)}
            style={{
              background: 'rgba(120,180,255,0.2)',
              border: '1px solid rgba(120,180,255,0.4)',
              color: 'white',
              padding: '3px 10px',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            + เพิ่ม
          </button>
        )}
      </div>

      {/* Add relationship */}
      {showAdd && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchCharacters(searchName)}
              placeholder="ค้นหาชื่อตัวละคร..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                padding: '4px 10px',
                color: 'white',
                fontSize: 12,
              }}
            />
            <button
              onClick={() => searchCharacters(searchName)}
              style={{
                background: 'rgba(120,180,255,0.3)',
                border: 'none',
                color: 'white',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ค้นหา
            </button>
          </div>
          {searchResults.map(r => (
            <div
              key={r.id}
              onClick={() => addRelationship(r.id)}
              style={{
                padding: '6px 10px',
                marginTop: 4,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 6,
                color: 'white',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {r.name}
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {relationships.length === 0 ? (
        <p style={{ color: '#888', fontSize: 12 }}>ยังไม่มีความสัมพันธ์</p>
      ) : (
        relationships.map(rel => (
          <div key={rel.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 0',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {rel.target.room_sprite_url && (
              <img src={rel.target.room_sprite_url} style={{ width: 32, height: 32, objectFit: 'contain', imageRendering: 'pixelated' }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontSize: 13 }}>{rel.target.name}</div>
              <div style={{ color: TIER_COLOR[rel.tier], fontSize: 11 }}>
                {TIER_LABEL[rel.tier]} · เยี่ยม {rel.visit_count} ครั้ง
              </div>
            </div>
            {isOwner && (
              <button
                onClick={() => removeRelationship(rel.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff6b6b',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            )}
          </div>
        ))
      )}
    </div>
  )
}