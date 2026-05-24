'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Artwork = {
    id: string
    title: string
    image_url: string
    is_nsfw: boolean
    tags?: string[]
}

type Listing = {
    id: string
    title: string
    description: string | null
    price: number | null
    currency: string | null
    turnaround_days: number | null
    slots: number
    is_open: boolean
}

type PortfolioItem = {
    id: string
    title: string
    image_url: string
    description: string | null
}

type Props = {
    artworks: Artwork[]
    listings: Listing[]
    portfolioItems: PortfolioItem[]
    isOwner: boolean
    artistId: string
}

type Tab = 'art' | 'commissions' | 'portfolio'

export default function ProfileTabs({ artworks, listings, portfolioItems: initialItems, isOwner, artistId }: Props) {
    const [tab, setTab] = useState<Tab>('art')
    const [portfolioItems, setPortfolioItems] = useState(initialItems)
    const [uploading, setUploading] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    const TAB_CONFIG = [
        { id: 'art' as Tab, label: 'Art' },
        { id: 'commissions' as Tab, label: 'Commissions' },
        { id: 'portfolio' as Tab, label: 'Portfolio' },
    ]

    async function handlePortfolioUpload(file: File) {
        if (!file.type.startsWith('image/')) return
        setUploading(true)
        const ext = file.name.split('.').pop()
        const fileName = `portfolio/${artistId}/${Date.now()}.${ext}`
        const { data: storageData, error: storageErr } = await supabase.storage
            .from('artworks')
            .upload(fileName, file, { upsert: true })
        if (storageErr) { setUploading(false); return }
        const { data: { publicUrl } } = supabase.storage
            .from('artworks')
            .getPublicUrl(storageData.path)
        const title = file.name.replace(/\.[^/.]+$/, '')
        const { data: newItem } = await supabase
            .from('portfolio_items')
            .insert({ artist_id: artistId, title, image_url: publicUrl })
            .select()
            .single()
        if (newItem) setPortfolioItems(prev => [newItem, ...prev])
        setUploading(false)
    }

    async function handleDeletePortfolio(id: string) {
        await supabase.from('portfolio_items').delete().eq('id', id)
        setPortfolioItems(prev => prev.filter(p => p.id !== id))
    }

    function ArtworkGrid({ items }: { items: { id: string; title: string; image_url: string; is_nsfw?: boolean }[] }) {
        if (items.length === 0) return (
            <div className="border-2 border-dashed border-gray-100 dark:border-white/10 rounded-2xl py-20 text-center">
                <p className="text-gray-400 text-sm">Nothing here yet</p>
            </div>
        )
        return (
            <div className="columns-2 md:columns-3 gap-3 space-y-3">
                {items.map(item => (
                    <Link key={item.id} href={`/artwork/${item.id}`}
                        className="group block break-inside-avoid rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 relative">
                        <img src={item.image_url} alt={item.title}
                            className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy" />
                        {item.is_nsfw && (
                            <div className="absolute inset-0 backdrop-blur-xl flex items-center justify-center">
                                <span className="text-xs bg-black/60 text-white px-3 py-1 rounded-full">NSFW</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                            <p className="text-white text-xs font-medium truncate">{item.title}</p>
                        </div>
                    </Link>
                ))}
            </div>
        )
    }

    return (
        <div>
            {/* Tabs */}
            <div className="flex gap-6 border-b dark:border-white/10 mb-8">
                {TAB_CONFIG.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`text-sm pb-3 font-medium border-b-2 transition-colors ${tab === t.id
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Art Tab */}
            {tab === 'art' && (
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">{artworks.length} works</p>
                    <ArtworkGrid items={artworks} />
                </div>
            )}

            {/* Commissions Tab */}
            {tab === 'commissions' && (
                <div>
                    {listings.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-100 dark:border-white/10 rounded-2xl py-20 text-center">
                            <p className="text-gray-400 text-sm">No commissions yet</p>
                        </div>
                    ) : (
                        listings.map(l => (
                            <Link key={l.id} href={`/commission/${l.id}`}
                                className="group flex items-center gap-4 py-4 border-b dark:border-white/8 hover:bg-gray-50 dark:hover:bg-white/3 -mx-4 px-4 transition-colors">
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
                        ))
                    )}
                </div>
            )}

            {/* Portfolio Tab */}
            {tab === 'portfolio' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-gray-400 uppercase tracking-widest">{portfolioItems.length} items</p>
                        {isOwner && (
                            <>
                                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePortfolioUpload(f) }} />
                                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                                    className="text-xs bg-purple-600 text-white px-4 py-1.5 rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50">
                                    {uploading ? '⏳ Uploading...' : '+ Add to Portfolio'}
                                </button>
                            </>
                        )}
                    </div>

                    {portfolioItems.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-100 dark:border-white/10 rounded-2xl py-20 text-center">
                            <p className="text-gray-400 text-sm mb-3">No portfolio items yet</p>
                            {isOwner && (
                                <button onClick={() => fileRef.current?.click()}
                                    className="text-xs text-purple-600 hover:underline">
                                    Upload your first piece
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="columns-2 md:columns-3 gap-3 space-y-3">
                            {portfolioItems.map(item => (
                                <div key={item.id} className="group relative break-inside-avoid rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900">
                                    <img src={item.image_url} alt={item.title}
                                        className="w-full object-cover" loading="lazy" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                        <p className="text-white text-xs font-medium truncate">{item.title}</p>
                                    </div>
                                    {isOwner && (
                                        <button onClick={() => handleDeletePortfolio(item.id)}
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500/80 text-white text-xs px-2 py-1 rounded-full hover:bg-red-600 transition-opacity">
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}