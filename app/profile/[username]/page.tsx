//app/profile/[username]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
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

    // query
    const { data: characters } = await supabase
        .from('characters')
        .select('id, name, ref_sheet_url')
        .eq('owner_id', profile.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

    return (
        <main className="min-h-screen bg-white dark:bg-gray-950">

            {/* Profile Header */}
            <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
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
                        <a href="/profile/edit"
                            className="text-xs border dark:border-white/20 px-4 py-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0">
                            Edit Profile
                        </a>
                    )}
                </div>

                {/* Tabs */}
                <ProfileTabs
                    artworks={artworks ?? []}
                    listings={listings ?? []}
                    portfolioItems={portfolioItems ?? []}
                    characters={characters ?? []}
                    isOwner={isOwner}
                    artistId={profile.id}
                    tos={profile.tos ?? null}
                />
            </div>
        </main>
    )
}