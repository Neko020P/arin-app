import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CharactersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/profile/edit')

  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: false })

  const total   = characters?.length ?? 0
  const pub     = characters?.filter(c => c.is_public).length ?? 0
  const priv    = characters?.filter(c => !c.is_public).length ?? 0

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium">Characters</h1>
            <p className="text-sm text-gray-400 mt-1">Your characters and lore</p>
          </div>
          <a
            href="/dashboard/characters/new"
            className="bg-purple-600 text-white text-sm px-5 py-2 rounded-full hover:bg-purple-700 transition-colors"
          >
            + Create Character
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-purple-50 text-purple-600 rounded-2xl p-4">
            <p className="text-2xl font-medium">{total}</p>
            <p className="text-xs mt-0.5 opacity-70">Total</p>
          </div>
          <div className="bg-green-50 text-green-600 rounded-2xl p-4">
            <p className="text-2xl font-medium">{pub}</p>
            <p className="text-xs mt-0.5 opacity-70">Public</p>
          </div>
          <div className="bg-gray-100 text-gray-500 rounded-2xl p-4">
            <p className="text-2xl font-medium">{priv}</p>
            <p className="text-xs mt-0.5 opacity-70">Private</p>
          </div>
        </div>

        {/* Grid */}
        {characters && characters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {characters.map(c => (
              <a
                key={c.id}
                href={`/dashboard/characters/${c.id}`}
                className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                {/* Ref sheet thumbnail หรือ placeholder */}
                {c.ref_sheet_url ? (
                  <img
                    src={c.ref_sheet_url}
                    alt={c.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-purple-50 flex items-center justify-center text-2xl shrink-0">
                    🎨
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      c.is_public
                        ? 'bg-green-50 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {c.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>

                  {c.lore ? (
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {c.lore}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-300">ยังไม่มี lore</p>
                  )}

                  {c.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-xs bg-purple-50 text-purple-400 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl py-20 text-center shadow-sm">
            <p className="text-4xl mb-4">🎨</p>
            <p className="text-gray-400 text-sm mb-3">ยังไม่มีตัวละคร</p>
            <a
              href="/dashboard/characters/new"
              className="text-sm text-purple-600 hover:underline"
            >
              สร้างตัวละครแรกของคุณ →
            </a>
          </div>
        )}

      </div>
    </main>
  )
}