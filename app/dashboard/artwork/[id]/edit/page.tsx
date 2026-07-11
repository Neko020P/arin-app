// arin/app/dashboard/artwork/[id]/edit/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditArtworkForm from './EditArtworkForm'

export default async function EditArtworkPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/profile/edit')

  const { data: artwork } = await supabase
    .from('artworks')
    .select('*')
    .eq('id', id)
    .eq('artist_id', profile.id)
    .single()

  if (!artwork) redirect('/dashboard')

  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, ref_sheet_url')
    .eq('owner_id', profile.id)
    .order('name')

  const { data: linked } = await supabase
    .from('artwork_characters')
    .select('character_id')
    .eq('artwork_id', id)

  return (
    <EditArtworkForm
      artworkId={id}
      initialArtwork={artwork}
      characters={characters ?? []}
      initialSelectedCharacterIds={linked?.map(l => l.character_id) ?? []}
    />
  )
}