//app/profile/[username]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ProfileTabs from './ProfileTabs'

export default async function ProfilePage({
    params,
}: {
    params: Promise<{ username: string }>
}) {
    const { username } = await params
    const supabase = await createClient()

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

    if (!profile) notFound()

    const { data: artworks } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', profile.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

    const { data: listings } = await supabase
        .from('commissions')
        .select('id, title, description, price, currency, turnaround_days, slots, is_open')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

    const { data: { user } } = await supabase.auth.getUser()
    const isOwner = user?.id === profile.user_id

    const openListings = listings?.filter(l => l.is_open) ?? []
    const hasCommissions = listings && listings.length > 0

    const { data: portfolioItems } = await supabase
        .from('portfolio_items')
        .select('id, title, image_url, description')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

    return (
        <main className="min-h-screen bg-white dark:bg-gray-950">

            {/* Profile Header */}
            <div className="max-w-4xl mx-auto px-4 pt-10 pb-6">
                <div className="flex items-start gap-5">

                    {/* Avatar */}
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.display_name}
                            className="w-20 h-20 rounded-full object-cover ring-2 ring-purple-200 dark:ring-purple-900 shrink-0" />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-2xl text-purple-400 shrink-0">
                            {(profile.display_name ?? profile.username)[0].toUpperCase()}
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold dark:text-white">
                                {profile.display_name || profile.username}
                            </h1>
                            {openListings.length > 0 && (
                                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-0.5 rounded-full font-medium">
                                    ✓ Available for new projects
                                </span>
                            )}
                        </div>
                        <p className="text-gray-400 text-sm mt-0.5">@{profile.username}</p>
                        {profile.bio && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 leading-relaxed">{profile.bio}</p>
                        )}

                        {/* Social links */}
                        {profile.social_links?.length > 0 && (
                            <div className="flex flex-wrap gap-3 mt-3">
                                {profile.social_links.map((link: string, i: number) => {
                                    let hostname = link
                                    try { hostname = new URL(link).hostname.replace('www.', '') } catch { }
                                    return (
                                        <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
                                            {hostname}
                                        </a>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Owner actions */}
                    {isOwner && (
                        <Link href="/profile/edit"
                            className="text-xs border dark:border-white/20 px-4 py-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0">
                            Edit Profile
                        </Link>
                    )}
                </div>

                {/* Tabs */}
                <ProfileTabs
                    artworks={artworks ?? []}
                    listings={listings ?? []}
                    portfolioItems={portfolioItems ?? []}
                    isOwner={isOwner}
                    artistId={profile.id}
                />
                {/* <div className="flex gap-6 mt-8 border-b dark:border-white/10">
                    {['Commissions', 'Portfolio'].map(tab => (
                        <button key={tab}
                            className={`text-sm pb-3 font-medium border-b-2 transition-colors ${tab === (hasCommissions ? 'Commissions' : 'Portfolio')
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}>
                            {tab}
                        </button>
                    ))}
                </div>*/}
            </div>

            <div className="max-w-4xl mx-auto px-4 pb-20">

                {/* Portfolio Grid */}
                {artworks && artworks.length > 0 ? (
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">
                            Portfolio · {artworks.length} works
                        </p>
                        <div className="columns-2 md:columns-3 gap-3 space-y-3">
                            {artworks.map(artwork => (
                                <Link key={artwork.id} href={`/artwork/${artwork.id}`}
                                    className="group block break-inside-avoid rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 relative">
                                    <img src={artwork.image_url} alt={artwork.title}
                                        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy" />
                                    {artwork.is_nsfw && (
                                        <div className="absolute inset-0 backdrop-blur-xl flex items-center justify-center">
                                            <span className="text-xs bg-black/60 text-white px-3 py-1 rounded-full">NSFW</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                        <p className="text-white text-xs font-medium truncate">{artwork.title}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-gray-100 dark:border-white/10 rounded-2xl py-20 text-center">
                        <p className="text-gray-400 text-sm">No artworks yet</p>
                    </div>
                )}

                {/* Commission Listings*/}
                {hasCommissions && (
                    <div className="mb-12">
                        {listings!.map((l: any) => (
                            <Link key={l.id} href={`/commission/${l.id}`}
                                className="group flex items-center gap-4 py-4 border-b dark:border-white/8 hover:bg-gray-50 dark:hover:bg-white/3 -mx-4 px-4 transition-colors">
                                {/* Thumbnail placeholder */}
                                <div className="w-20 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/20 shrink-0 flex items-center justify-center text-2xl">
                                    🎨
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.is_open
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                                            }`}>
                                            {l.is_open ? 'Open' : 'Closed'}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-sm dark:text-white group-hover:text-purple-600 transition-colors truncate">
                                        {l.title}
                                    </h3>
                                    {l.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{l.description}</p>
                                    )}
                                </div>

                                <div className="text-right shrink-0">
                                    {l.price && (
                                        <p className="text-sm font-semibold dark:text-white">
                                            From {l.currency ?? 'USD'} {l.price}
                                        </p>
                                    )}
                                    {l.turnaround_days && (
                                        <p className="text-xs text-gray-400 mt-0.5">{l.turnaround_days} days</p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}