import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NavbarClient from './NavbarClient'

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
    <nav className="border-b px-4 py-3 sticky top-0 bg-white/80 backdrop-blur-md z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="font-semibold text-lg tracking-tight text-purple-600">
          ARIN
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user && profile ? (
            <>
              <Link
                href="/dashboard/upload"
                className="text-sm bg-purple-600 text-white px-4 py-1.5 rounded-full hover:bg-purple-700 transition-colors"
              >
                + Upload
              </Link>

              {/* Avatar dropdown — client component */}
              <NavbarClient profile={profile} />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800">
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/signup"
                className="text-sm bg-purple-600 text-white px-4 py-1.5 rounded-full hover:bg-purple-700 transition-colors"
              >
                สมัครใช้งาน
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  )
}