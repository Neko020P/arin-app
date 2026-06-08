'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Profile = {
  username: string
  display_name: string
  avatar_url: string
}

export default function NavbarClient({ profile: initialProfile }: { profile: Profile | null }) {
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // sync profile จาก session ปัจจุบันทันทีตอน mount (ครอบคลุม production cookie delay)
  useEffect(() => {
    async function syncProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setProfile(null); return }
      if (initialProfile) return // server ส่งมาแล้ว ไม่ต้อง fetch ซ้ำ

      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('user_id', user.id)
        .single()
      if (data) { setProfile(data); router.refresh() }
    }
    syncProfile()

    // ฟัง auth state change สำหรับ sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('user_id', session.user.id)
          .single()
        if (data) { setProfile(data); router.refresh() }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        router.refresh()
      }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!profile) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100">
          login
        </Link>
        <Link
          href="/signup"
          className="text-sm bg-purple-600 text-white px-4 py-1.5 rounded-full hover:bg-purple-700 transition-colors"
        >
          sign up
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard/upload"
        className="text-sm bg-purple-600 text-white px-4 py-1.5 rounded-full hover:bg-purple-700 transition-colors"
      >
        + Upload
      </Link>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(prev => !prev)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm text-purple-500 font-medium">
              {profile.display_name?.[0] ?? profile.username[0]}
            </div>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-10 w-48 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl shadow-lg py-1 z-50">
            <div className="px-4 py-2 border-b dark:border-gray-700">
              <p className="text-sm font-medium truncate">{profile.display_name || profile.username}</p>
              <p className="text-xs text-gray-400 truncate">@{profile.username}</p>
            </div>

            <Link href={`/profile/${profile.username}`} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Profile</Link>
            <Link href="/dashboard/commissions" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Commissions</Link>
            <Link href="/dashboard/characters" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Characters</Link>
            <Link href="/dashboard" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Dashboard</Link>

            <div className="border-t dark:border-gray-700 mt-1">
              <form action="/auth/signout" method="POST">
                <button type="submit" className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}