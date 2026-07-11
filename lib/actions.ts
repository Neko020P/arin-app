// arin/lib/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getOwnerProfileId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, profileId: null, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return { supabase, profileId: profile?.id ?? null, error: profile ? null : 'Profile not found' }
}

// ---------- Characters ----------

type CharacterInput = {
  name: string
  lore: string
  ref_sheet_url: string
  tags: string
  is_public: boolean
}

export async function createCharacter(input: CharacterInput) {
  const { supabase, profileId, error: authError } = await getOwnerProfileId()
  if (!profileId) return { error: authError ?? 'Not authenticated' }

  const tags = input.tags.split(',').map(t => t.trim()).filter(Boolean)

  const { data, error } = await supabase
    .from('characters')
    .insert({
      owner_id: profileId,
      name: input.name.trim(),
      lore: input.lore.trim() || null,
      ref_sheet_url: input.ref_sheet_url.trim() || null,
      tags,
      is_public: input.is_public,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/characters')
  return { error: null, id: data.id }
}

export async function updateCharacter(characterId: string, input: CharacterInput) {
  const { supabase, profileId, error: authError } = await getOwnerProfileId()
  if (!profileId) return { error: authError ?? 'Not authenticated' }

  const tags = input.tags.split(',').map(t => t.trim()).filter(Boolean)

  const { error } = await supabase
    .from('characters')
    .update({
      name: input.name.trim(),
      lore: input.lore.trim() || null,
      ref_sheet_url: input.ref_sheet_url.trim() || null,
      tags,
      is_public: input.is_public,
    })
    .eq('id', characterId)
    .eq('owner_id', profileId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/characters')
  revalidatePath(`/dashboard/characters/${characterId}`)
  return { error: null }
}

// ---------- Artworks ----------

type ArtworkInput = {
  title: string
  description: string
  tags: string
  status: string
  is_nsfw: boolean
  character_ids: string[]
}

export async function updateArtwork(artworkId: string, input: ArtworkInput) {
  const { supabase, profileId, error: authError } = await getOwnerProfileId()
  if (!profileId) return { error: authError ?? 'Not authenticated' }

  const tags = input.tags.split(',').map(t => t.trim()).filter(Boolean)

  const { error: artErr } = await supabase
    .from('artworks')
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      tags,
      status: input.status,
      is_nsfw: input.is_nsfw,
    })
    .eq('id', artworkId)
    .eq('artist_id', profileId)

  if (artErr) return { error: artErr.message }

  await supabase.from('artwork_characters').delete().eq('artwork_id', artworkId)

  if (input.character_ids.length > 0) {
    const { error: linkErr } = await supabase
      .from('artwork_characters')
      .insert(input.character_ids.map(character_id => ({ artwork_id: artworkId, character_id })))
    if (linkErr) return { error: linkErr.message }
  }

  revalidatePath(`/artwork/${artworkId}`)
  return { error: null }
}

export async function deleteArtwork(artworkId: string) {
  const { supabase, profileId, error: authError } = await getOwnerProfileId()
  if (!profileId) return { error: authError ?? 'Not authenticated' }

  const { error } = await supabase
    .from('artworks')
    .delete()
    .eq('id', artworkId)
    .eq('artist_id', profileId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}

// ---------- Commissions ----------

type CommissionInput = {
  title: string
  description: string
  price: string
  currency: string
  turnaround_days: string
  slots: string
  tos: string
  is_open: boolean
}

export async function createCommission(input: CommissionInput) {
  const { supabase, profileId, error: authError } = await getOwnerProfileId()
  if (!profileId) return { error: authError ?? 'Not authenticated' }

  const { error } = await supabase
    .from('commissions')
    .insert({
      artist_id: profileId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      price: input.price ? parseFloat(input.price) : null,
      currency: input.currency,
      turnaround_days: input.turnaround_days ? parseInt(input.turnaround_days) : null,
      slots: input.slots ? parseInt(input.slots) : 0,
      tos: input.tos.trim() || null,
      is_open: input.is_open,
    })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/commissions')
  return { error: null }
}