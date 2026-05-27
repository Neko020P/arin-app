'use client'
import { useState } from 'react'

type Props = {
  characterId: string
  characterName: string
}

export default function TransferOwnershipPanel({ characterId, characterName }: Props) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transferLink, setTransferLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    if (!username.trim()) return
    setLoading(true)
    setError('')
    setTransferLink(null)

    const res = await fetch('/api/transfer/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId, toUsername: username.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'เกิดข้อผิดพลาด')
      setLoading(false)
      return
    }

    setTransferLink(`${window.location.origin}/character/transfer/${data.token}`)
    setLoading(false)
  }

  function handleCopy() {
    if (!transferLink) return
    navigator.clipboard.writeText(transferLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setOpen(false)
    setUsername('')
    setError('')
    setTransferLink(null)
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8L22 12L18 16"/><path d="M2 12H22"/><path d="M6 16L2 12L6 8"/>
        </svg>
        Transfer Character
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white text-base">Transfer character</h2>
                <p className="text-sm text-gray-400 mt-0.5">Give {characterName} to another user</p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 transition-colors mt-0.5 shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {!transferLink ? (
              <>
                {/* Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Recipient Username</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                      <input
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        placeholder="username"
                        autoFocus
                        className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition"
                      />
                    </div>
                    <button
                      onClick={handleCreate}
                      disabled={loading || !username.trim()}
                      className="px-4 py-2.5 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      {loading ? (
                        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                        </svg>
                      ) : 'Create Link'}
                    </button>
                  </div>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                </div>

                {/* Warning */}
                <div className="flex gap-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 shrink-0 mt-0.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    When transferred, it will not be possible to revert the action. The link will expire in 48 hours.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Success */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    ส่ง link นี้ให้ <span className="font-semibold">@{username}</span> กด Accept
                  </div>

                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5">
                    <span className="flex-1 text-xs text-gray-500 dark:text-gray-400 truncate">{transferLink}</span>
                    <button
                      onClick={handleCopy}
                      className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                        copied
                          ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                          : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/15'
                      }`}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <p className="text-xs text-gray-400">หมดอายุใน 48 ชั่วโมง</p>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-2.5 text-sm font-medium border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  ปิด
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}