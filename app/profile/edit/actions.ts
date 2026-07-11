// arin/app/profile/edit/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

type UpdateProfileInput = {
  username: string
  display_name: string
  bio: string
  avatar_url: string
  social_links: string[]
}

export async function updateProfile(input: UpdateProfileInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated. Please login again.' }
  }

  const cleanedLinks = input.social_links.filter(l => l.trim() !== '')

  const { error } = await supabase
    .from('profiles')
    .update({
      username: input.username.trim(),
      display_name: input.display_name.trim(),
      bio: input.bio.trim(),
      avatar_url: input.avatar_url.trim(),
      social_links: cleanedLinks,
    })
    .eq('user_id', user.id)

  if (error) {
    return {
      error: error.message.includes('unique')
        ? 'Username นี้ถูกใช้ไปแล้ว'
        : error.message,
    }
  }

  return { error: null, username: input.username.trim() }
}