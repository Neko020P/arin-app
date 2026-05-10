'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function NsfwReveal({
  imageUrl,
  title,
}: {
  imageUrl: string
  title: string
}) {
  const [revealed, setRevealed] = useState(false)

  if (revealed) {
    return (
      <div className="relative w-full aspect-square">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setRevealed(true)}
      className="text-sm bg-white/20 hover:bg-white/30 text-white border border-white/30 px-4 py-2 rounded-full transition-colors"
    >
      แสดงเนื้อหา
    </button>
  )
}