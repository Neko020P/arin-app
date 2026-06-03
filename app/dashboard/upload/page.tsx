import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArtworkUpload from '@/components/ArtworkUpload'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/profile/edit')

  // ดึง characters ของ artist คนนี้
  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, ref_sheet_url')
    .eq('owner_id', profile.id)
    .order('name')

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-medium mb-2">Upload ผลงาน</h1>
        {characters && characters.length === 0 && (
          <p className="text-sm text-gray-400 mb-8">
            ยังไม่มี character —{' '}
            <a href="/dashboard/characters/new" className="text-purple-600 hover:underline">
              สร้างก่อน
            </a>{' '}
            เพื่อ tag character ในผลงานได้
          </p>
        )}
        {characters && characters.length > 0 && (
          <p className="text-sm text-gray-400 mb-8">
            Select the character that appears in this artwork.
          </p>
        )}
        <ArtworkUpload
          artistId={profile.id}
          characters={characters ?? []}
        />
      </div>
    </main>
  )
}