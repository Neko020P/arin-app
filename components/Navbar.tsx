//components/Navbar.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NavbarClient from './NavbarClient'
import ThemeToggle from './ThemeToggle'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('user_id', user.id)
      .single()
    profile = data
  }

  return (
    <nav className="border-b px-4 py-3 sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="font-semibold text-lg tracking-tight text-purple-600">
          ARIN
        </Link>

        {/* Center nav links */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/commissions" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Explore
          </Link>
        </div>

        {/* Right side — NavbarClient จัดการ logged-in/out UI เองทั้งหมด */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <NavbarClient profile={profile} />
        </div>

      </div>
    </nav>
  )
}