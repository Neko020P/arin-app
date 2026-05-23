import { createClient } from '@/lib/supabase/server'

export type MemoryEventType =
  | 'visited'
  | 'was_visited'
  | 'fed'
  | 'played'
  | 'bathed'
  | 'slept'
  | 'relationship_changed'
  | 'gift'
  | 'argument'
  | 'first_meeting'

export type Emotion = 'happy' | 'sad' | 'excited' | 'angry' | 'neutral' | 'shy' | 'touched'

export type Memory = {
  id: string
  character_id: string
  event_type: MemoryEventType
  subject_id: string | null
  subject_name: string | null
  description: string
  emotion: Emotion
  created_at: string
}

type CreateMemoryParams = {
  characterId: string
  eventType: MemoryEventType
  subjectId?: string
  subjectName?: string
  description: string
  emotion?: Emotion
}

export async function createMemory(params: CreateMemoryParams) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('character_memories')
    .insert({
      character_id: params.characterId,
      event_type: params.eventType,
      subject_id: params.subjectId ?? null,
      subject_name: params.subjectName ?? null,
      description: params.description,
      emotion: params.emotion ?? 'neutral',
    })
  if (error) console.error('createMemory error:', error.message)
}

export async function getMemories(characterId: string, limit = 20): Promise<Memory[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('character_memories')
    .select('*')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as Memory[]) ?? []
}

// สร้าง memory อัตโนมัติจาก action
export async function createActionMemory(
  characterId: string,
  action: string,
  characterName: string
) {
  const ACTION_MAP: Record<string, { description: string; emotion: Emotion }> = {
    feed: {
      description: `${characterName} had a delicious meal.`,
      emotion: 'happy',
    },
    play: {
      description: `${characterName} had a fun playtime.`,
      emotion: 'excited',
    },
    bath: {
      description: `${characterName} took a refreshing bath.`,
      emotion: 'happy',
    },
    sleep: {
      description: `${characterName} had a good rest.`,
      emotion: 'neutral',
    },
  }

  const mapped = ACTION_MAP[action]
  if (!mapped) return

  await createMemory({
    characterId,
    eventType: action as MemoryEventType,
    description: mapped.description,
    emotion: mapped.emotion,
  })
}

// สร้าง memory เมื่อ visitor มา
export async function createVisitMemory(
  hostId: string,
  hostName: string,
  visitorId: string,
  visitorName: string,
  tier: string
) {
  const TIER_EMOTION: Record<string, Emotion> = {
    stranger: 'shy',
    friend: 'happy',
    rival: 'angry',
  }

  const TIER_DESC: Record<string, string> = {
    stranger: `A stranger named ${visitorName} visited ${hostName}'s room.`,
    friend: `${visitorName} came to visit ${hostName}. It was a warm reunion.`,
    rival: `${visitorName} showed up at ${hostName}'s room uninvited.`,
  }

  // memory ของ host
  await createMemory({
    characterId: hostId,
    eventType: 'was_visited',
    subjectId: visitorId,
    subjectName: visitorName,
    description: TIER_DESC[tier] ?? `${visitorName} visited.`,
    emotion: TIER_EMOTION[tier] ?? 'neutral',
  })

  // memory ของ visitor
  await createMemory({
    characterId: visitorId,
    eventType: 'visited',
    subjectId: hostId,
    subjectName: hostName,
    description: `${visitorName} went to visit ${hostName}.`,
    emotion: TIER_EMOTION[tier] ?? 'neutral',
  })
}