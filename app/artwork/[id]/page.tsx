import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import NsfwReveal from '@/components/NsfwReveal'

export default async function ArtworkDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // ดึง artwork พร้อม profile ของ artist
    const { data: artwork } = await supabase
        .from('artworks')
        .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
        .eq('id', id)
        .eq('status', 'published')
        .single()

    if (!artwork) notFound()

    const artist = artwork.profiles as {
        id: string
        username: string
        display_name: string
        avatar_url: string
    }

    // ดึง artwork อื่นๆ ของ artist คนเดียวกัน (related)
    const { data: related } = await supabase
        .from('artworks')
        .select('id, title, image_url, is_nsfw')
        .eq('artist_id', artist.id)
        .eq('status', 'published')
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(6)

    // ดึง characters ที่อยู่ใน artwork นี้
    const { data: linkedCharacters, error: lcError } = await supabase
        .from('artwork_characters')
        .select('characters(id, name, ref_sheet_url, owner_id, profiles(username))')
        .eq('artwork_id', id)

    console.log('linkedCharacters:', JSON.stringify(linkedCharacters))
    console.log('lcError:', lcError)

    // เช็คว่า user คนนี้เป็นเจ้าของ artwork ไหม
    const { data: { user } } = await supabase.auth.getUser()
    console.log('user:', user?.id)

    const { data: myProfile } = user ? await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single() : { data: null }
    
    console.log('myProfile:', myProfile?.id)
    console.log('artist.id:', artist.id)
    console.log('isOwner:', myProfile?.id === artist.id)

    const isOwner = myProfile?.id === artist.id

    return (
        <main className="min-h-screen py-10 px-4">
            <div className="max-w-5xl mx-auto">

                {/* Back */}
                <Link
                    href={`/profile/${artist.username}`}
                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-8"
                >
                    ← กลับไปหน้าโปรไฟล์
                </Link>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                    {/* รูปภาพ */}
                    <div className="relative w-full rounded-2xl overflow-hidden bg-gray-100">
                        {artwork.is_nsfw ? (
                            <NsfwReveal imageUrl={artwork.image_url} title={artwork.title} />
                        ) : (
                            <div className="relative aspect-square">
                                <Image
                                    src={artwork.image_url}
                                    alt={artwork.title}
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    priority
                                />
                            </div>
                        )}
                    </div>

                    {/* รายละเอียด */}
                    <div className="flex flex-col gap-6">

                        {/* Artist */}
                        <Link
                            href={`/profile/${artist.username}`}
                            className="flex items-center gap-3 group w-fit"
                        >
                            {artist.avatar_url ? (
                                <img
                                    src={artist.avatar_url}
                                    alt={artist.display_name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-400 font-medium">
                                    {artist.display_name?.[0] ?? artist.username[0]}
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-medium group-hover:text-purple-600 transition-colors">
                                    {artist.display_name || artist.username}
                                </p>
                                <p className="text-xs text-gray-400">@{artist.username}</p>
                            </div>
                        </Link>

                        {/* Title + Edit */}
                        <div>
                            <div className="flex items-start justify-between gap-3">
                                <h1 className="text-2xl font-medium leading-snug">{artwork.title}</h1>
                                {isOwner && (
                                    <Link
                                        href={`/dashboard/artwork/${artwork.id}/edit`}
                                        className="text-xs border px-3 py-1.5 rounded-full hover:bg-gray-50 shrink-0 transition-colors"
                                    >
                                        ✏️ แก้ไข
                                    </Link>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                {new Date(artwork.created_at).toLocaleDateString('th-TH', {
                                    year: 'numeric', month: 'long', day: 'numeric',
                                })}
                            </p>
                        </div>

                        {/* Description */}
                        {artwork.description && (
                            <div>
                                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                    คำอธิบาย
                                </h2>
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                    {artwork.description}
                                </p>
                            </div>
                        )}

                        {/* Tags */}
                        {artwork.tags?.length > 0 && (
                            <div>
                                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                    Tags
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {artwork.tags.map((tag: string) => (
                                        <span
                                            key={tag}
                                            className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full border border-purple-100"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Characters */}
                        {linkedCharacters && linkedCharacters.length > 0 && (
                            <div>
                                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                    Characters
                                </h2>
                                <div className="flex flex-col gap-2">
                                    {linkedCharacters.map((row: any) => {
                                        const c = row.characters
                                        if (!c) return null
                                        const owner = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
                                        return (
                                            <div
                                                key={c.id}
                                                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-colors"
                                            >
                                                {c.ref_sheet_url ? (
                                                    <img
                                                        src={c.ref_sheet_url}
                                                        alt={c.name}
                                                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-lg shrink-0">
                                                        🎨
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium">{c.name}</p>
                                                    {owner?.username && (
                                                        <p className="text-xs text-gray-400">@{owner.username}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* NSFW badge */}
                        {artwork.is_nsfw && (
                            <span className="w-fit text-xs bg-red-50 text-red-400 border border-red-100 px-3 py-1 rounded-full">
                                เนื้อหาสำหรับผู้ใหญ่
                            </span>
                        )}

                    </div>
                </div>

                {/* Related artworks */}
                {related && related.length > 0 && (
                    <div className="mt-16">
                        <h2 className="text-sm font-medium text-gray-400 mb-4">
                            ผลงานอื่นของ {artist.display_name || artist.username}
                        </h2>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {related.map(r => (
                                <Link
                                    key={r.id}
                                    href={`/artwork/${r.id}`}
                                    className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100"
                                >
                                    <Image
                                        src={r.image_url}
                                        alt={r.title}
                                        fill
                                        className={`object-cover transition-transform group-hover:scale-105 ${r.is_nsfw ? 'blur-md' : ''}`}
                                        sizes="(max-width: 768px) 33vw, 16vw"
                                    />
                                    {r.is_nsfw && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
                                                NSFW
                                            </span>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </main>
    )
}

// // Client component สำหรับ NSFW reveal
// function NsfwReveal({ imageUrl, title }: { imageUrl: string; title: string }) {
//   'use client'
//   // ใช้วิธี inline เพราะ component เล็กมาก
//   return null // placeholder — ดูด้านล่าง
// }