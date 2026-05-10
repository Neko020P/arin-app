'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

type Profile = {
  username: string
  display_name: string
  avatar_url: string
}

export default function NavbarClient({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  return (
    <div className="relative" ref={ref}>

      {/* Avatar button */}
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

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-48 bg-white border rounded-xl shadow-lg py-1 z-50">

          <div className="px-4 py-2 border-b">
            <p className="text-sm font-medium truncate">
              {profile.display_name || profile.username}
            </p>
            <p className="text-xs text-gray-400 truncate">@{profile.username}</p>
          </div>

          <Link
            href={`/profile/${profile.username}`}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            โปรไฟล์ของฉัน
          </Link>

          <Link
            href="/profile/edit"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            แก้ไขโปรไฟล์
          </Link>

          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Dashboard
          </Link>

          <div className="border-t mt-1">
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-50"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  )
}