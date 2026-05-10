import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArtworkUpload from '@/components/ArtworkUpload'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ดึง profile เพื่อเอา artistId
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/profile/edit')

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-medium mb-8">Upload ผลงาน</h1>
        <ArtworkUpload artistId={profile.id} />
      </div>
    </main>
  )
}