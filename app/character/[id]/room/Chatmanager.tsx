'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ChatMessage = { id: string; text: string }

type Props = {
    characterId: string
    initialMessages: ChatMessage[]
    isOwner: boolean
    lastAction: string | null
    hasVisitor: boolean
    onTrigger: (text: string) => void
}

export default function ChatManager({
    characterId, initialMessages, isOwner, lastAction, hasVisitor, onTrigger,
}: Props) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(initialMessages.map(m => m.text))
    const [saving, setSaving] = useState(false)
    const lastActionRef = useRef<string | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
    const supabase = createClient()

    function pickRandom(msgs: ChatMessage[]) {
        if (!msgs.length) return null
        return msgs[Math.floor(Math.random() * msgs.length)].text
    }

    function triggerBubble(msgs: ChatMessage[]) {
        const text = pickRandom(msgs)
        if (text) onTrigger(text)
    }

    useEffect(() => {
        if (!lastAction || lastAction === lastActionRef.current) return
        lastActionRef.current = lastAction
        triggerBubble(messages)
    }, [lastAction])

    useEffect(() => {
        if (!hasVisitor) return
        triggerBubble(messages)
    }, [hasVisitor])

    useEffect(() => {
        function schedule() {
            const delay = (5 + Math.random() * 10) * 1000
            return setTimeout(() => {
                triggerBubble(messages)
                timerRef.current = schedule()
            }, delay)
        }
        timerRef.current = schedule()
        return () => clearTimeout(timerRef.current)
    }, [messages])

    async function handleSave() {
        setSaving(true)
        const newMessages = draft.filter(t => t.trim()).slice(0, 10)
            .map((text, i) => ({ id: String(i + 1), text: text.trim() }))
        await supabase.from('characters').update({ chat_messages: newMessages }).eq('id', characterId)
        setMessages(newMessages)
        setEditing(false)
        setSaving(false)
    }

    //if (!isOwner) return null

    return (
        <>
            {isOwner && (
                <div>
                    <button onClick={() => { setDraft(messages.map(m => m.text)); setEditing(e => !e) }}
                        className="w-full flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 text-sm transition-colors">
                        💬 Chat Messages
                        <span className="ml-auto">{editing ? '▲' : '▼'}</span>
                    </button>
                    {editing && (
                        <div className="mt-2 flex flex-col gap-2">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <input key={i} value={draft[i] ?? ''}
                                    onChange={e => { const next = [...draft]; next[i] = e.target.value; setDraft(next) }}
                                    placeholder={`ข้อความที่ ${i + 1}`}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-purple-400" />
                            ))}
                            <div className="flex gap-2 justify-end mt-1">
                                <button onClick={() => setEditing(false)}
                                    className="text-xs px-3 py-1.5 rounded-full border border-white/20 text-white/50 hover:bg-white/10 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className="text-xs px-3 py-1.5 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50">
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}