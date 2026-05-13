import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default async function ProfilePage({
    params,
}: {
    params: Promise<{ username: string }>
}) {
    const { username } = await params
    const supabase = await createClient()

    // ดึง profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

    if (!profile) notFound()

    // ดึง artworks ของ artist คนนี้
    const { data: artworks } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', profile.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

    // ดึง commission listings ของ artist คนนี้
    const { data: listings } = await supabase
        .from('commissions')
        .select('id, title, description, price, currency, turnaround_days, slots, is_open')
        .eq('artist_id', profile.id)
        .eq('is_open', true)
        .order('created_at', { ascending: false })

    return (
        <main className="min-h-screen py-12 px-4">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-5 mb-10">
                    {profile.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt={profile.display_name}
                            className="w-20 h-20 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-2xl text-purple-400">
                            {profile.display_name?.[0] ?? profile.username[0]}
                        </div>
                    )}

                    <div className="flex-1">
                        <h1 className="text-2xl font-medium">
                            {profile.display_name || profile.username}
                        </h1>
                        <p className="text-gray-400 text-sm mb-2">@{profile.username}</p>
                        {profile.bio && (
                            <p className="text-gray-600 text-sm leading-relaxed">{profile.bio}</p>
                        )}
                    </div>
                </div>

                {/* Social Links */}
                {profile.social_links?.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-10">
                        {profile.social_links.map((link: string, i: number) => {
                            let hostname = link
                            try { hostname = new URL(link).hostname.replace('www.', '') } catch { }
                            return (
                                <a
                                    key={i}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-purple-600 hover:underline"
                                >
                                    {hostname}
                                </a>
                            )
                        })}
                    </div>
                )}

                {/* Artwork count */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-medium text-gray-500">
                        {artworks?.length ?? 0} ผลงาน
                    </h2>
                </div>

                {/* Artwork Grid */}
                {artworks && artworks.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {artworks.map(artwork => (
                            <Link
                                key={artwork.id}
                                href={`/artwork/${artwork.id}`}
                                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
                            >
                                <Image
                                    src={artwork.image_url}
                                    alt={artwork.title}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    sizes="(max-width: 768px) 50vw, 33vw"
                                />

                                {artwork.is_nsfw && (
                                    <div className="absolute inset-0 backdrop-blur-xl flex items-center justify-center">
                                        <span className="text-xs bg-black/60 text-white px-3 py-1 rounded-full">
                                            NSFW
                                        </span>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-end p-3 opacity-0 group-hover:opacity-100">
                                    <div>
                                        <p className="text-white text-sm font-medium truncate">{artwork.title}</p>
                                        {artwork.tags?.length > 0 && (
                                            <p className="text-white/70 text-xs truncate">
                                                {artwork.tags.slice(0, 3).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-20 text-center">
                        <p className="text-gray-400 text-sm">ยังไม่มีผลงาน</p>
                    </div>
                )}

                {/* Commission Listings */}
                {listings && listings.length > 0 && (
                    <div className="mt-12">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-medium">รับ Commission</h2>
                            <span className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full">
                                เปิดรับงาน
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {listings.map((l: any) => (
                                <Link
                                    key={l.id}
                                    href={`/commission/${l.id}`}
                                    className="group border rounded-2xl p-5 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <h3 className="font-medium group-hover:text-purple-600 transition-colors">
                                            {l.title}
                                        </h3>
                                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full shrink-0">
                                            Open
                                        </span>
                                    </div>

                                    {l.description && (
                                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
                                            {l.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                        {l.price && (
                                            <span className="font-medium text-gray-600">
                                                {l.currency ?? 'USD'} {l.price}
                                            </span>
                                        )}
                                        {l.turnaround_days && (
                                            <span>{l.turnaround_days} วัน</span>
                                        )}
                                        {l.slots > 0 && (
                                            <span>{l.slots} slots</span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </main>
    )
}