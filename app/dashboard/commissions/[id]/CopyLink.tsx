'use client'

import { useState } from 'react'

export default function CopyLink({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/commission/${id}`

  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg flex-1 truncate">
        {url}
      </code>
      <button
        onClick={copy}
        className="text-xs border px-3 py-1.5 rounded-lg hover:bg-gray-50 shrink-0 transition-colors"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  )
}