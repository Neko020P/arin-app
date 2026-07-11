// arin/app/dashboard/characters/[id]/edit/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditCharacterForm from './EditCharacterForm'

export default async function EditCharacterPage({
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

  const { data: character, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !character || character.owner_id !== profile.id) {
    redirect('/dashboard/characters')
  }

  return <EditCharacterForm characterId={id} initialCharacter={character} />
}