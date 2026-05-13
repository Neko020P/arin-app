import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'

export default async function LandingPage() {
    const supabase = await createClient()

    // ดึง artwork ล่าสุดจากทุก artist มาแสดงใน gallery
    const { data: artworks } = await supabase
        .from('artworks')
        .select('id, title, image_url, profiles(username, display_name)')
        .eq('status', 'published')
        .eq('is_nsfw', false)
        .order('created_at', { ascending: false })
        .limit(8)

    // ดึงจำนวน artist ทั้งหมด
    const { count: artistCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

    return (
        <main className="min-h-screen">

            {/* Hero */}
            <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
                <span className="inline-block text-xs px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 mb-5">
                    Portfolio · Commission · Character Lore
                </span>

                <h1 className="text-5xl font-medium leading-tight tracking-tight mb-5">
                    แพลตฟอร์มสำหรับ<br />
                    <span className="text-purple-500">ศิลปินที่จริงจัง</span>
                </h1>

                <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto mb-8">
                    จัดการผลงาน รับ commission และสร้าง lore ให้ตัวละครของคุณ — ทั้งหมดในที่เดียว
                </p>

                <div className="flex items-center justify-center gap-3">
                    <Link
                        href="/signup"
                        className="bg-purple-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                        เริ่มต้นฟรี
                    </Link>
                    <Link
                        href="/commissions"
                        className="border px-6 py-3 rounded-full text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        ดู Commission
                    </Link>
                    {/* <Link
                        href="#features"
                        className="border px-6 py-3 rounded-full text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        ดูฟีเจอร์
                    </Link> */}
                </div>

                {artistCount && artistCount > 0 && (
                    <p className="text-xs text-gray-400 mt-6">
                        มีศิลปิน {artistCount.toLocaleString()} คนแล้วบน ARIN
                    </p>
                )}
            </section>

            {/* Gallery */}
            {artworks && artworks.length > 0 && (
                <section className="px-4 pb-16 max-w-5xl mx-auto">
                    <p className="text-xs text-gray-400 uppercase tracking-widest text-center mb-6">
                        ผลงานจากศิลปินใน ARIN
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {artworks.map(artwork => {
                            const artist = artwork.profiles as unknown as {
                                username: string
                                display_name: string
                            } | null
                            return (
                                <Link
                                    key={artwork.id}
                                    href={`/artwork/${artwork.id}`}
                                    className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100"
                                >
                                    <Image
                                        src={artwork.image_url}
                                        alt={artwork.title}
                                        fill
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-3 opacity-0 group-hover:opacity-100">
                                        <div>
                                            <p className="text-white text-xs font-medium truncate">
                                                {artwork.title}
                                            </p>
                                            <p className="text-white/60 text-xs">
                                                @{artist?.username ?? ''}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* Features */}
            <section id="features" className="bg-gray-50 py-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <p className="text-xs text-gray-400 uppercase tracking-widest text-center mb-10">
                        ทำไมถึงเลือก ARIN
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <FeatureCard
                            emoji="🖼️"
                            color="bg-purple-50"
                            title="Portfolio สวยงาม"
                            description="เลือก layout และ theme ได้เอง ไม่ติดแม่แบบเหมือนแพลตฟอร์มอื่น แสดงผลงานในแบบที่คุณต้องการ"
                        />
                        <FeatureCard
                            emoji="📋"
                            color="bg-teal-50"
                            title="จัดการ Commission"
                            description="ติดตาม queue, ราคา และ income ในที่เดียว มี invoice และสรุปรายได้ให้อัตโนมัติ"
                        />
                        <FeatureCard
                            emoji="📖"
                            color="bg-orange-50"
                            title="Character Lore"
                            description="สร้าง bible ให้ตัวละครฝังอยู่ใน portfolio เชื่อม character กับ artwork ได้โดยตรง"
                        />
                        <FeatureCard
                            emoji="💰"
                            color="bg-green-50"
                            title="ติดตามรายได้"
                            description="สรุปรายได้จาก commission พร้อม export ข้อมูลสำหรับการคำนวณภาษีได้เลย"
                        />
                        <FeatureCard
                            emoji="🔒"
                            color="bg-blue-50"
                            title="ควบคุม Privacy"
                            description="เลือกได้ว่า artwork หรือ character ไหนจะ public หรือ private มี NSFW filter ในตัว"
                        />
                        <FeatureCard
                            emoji="⚡"
                            color="bg-pink-50"
                            title="เร็วและใช้งานง่าย"
                            description="ออกแบบมาให้ศิลปินใช้ได้ทันที ไม่มีขั้นตอนซับซ้อน upload แล้วเผยแพร่ได้เลย"
                        />
                    </div>
                </div>
            </section>

            {/* Differentiators */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <p className="text-xs text-gray-400 uppercase tracking-widest text-center mb-10">
                        เหนือกว่าแพลตฟอร์มอื่น
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <DiffCard
                            versus="เทียบกับ Vgen"
                            title="มี Lore & Character system ในตัว"
                            description="ไม่ต้องใช้ Toyhouse แยกต่างหาก จัดการ character ได้ในที่เดียวกับ portfolio"
                        />
                        <DiffCard
                            versus="เทียบกับ Toyhouse"
                            title="Portfolio + Commission ในที่เดียว"
                            description="ไม่ต้องสลับแพลตฟอร์ม รับ commission และแสดงผลงานได้พร้อมกันเลย"
                        />
                        <DiffCard
                            versus="เทียบกับ DeviantArt"
                            title="ติดตาม Income ได้เลย"
                            description="มีระบบสรุปรายได้จาก commission ที่ DA ไม่มี เหมาะสำหรับศิลปินอาชีพ"
                        />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-purple-600 py-20 px-4 text-center">
                <h2 className="text-3xl font-medium text-white mb-3">
                    พร้อมเริ่มต้นแล้วหรือยัง?
                </h2>
                <p className="text-purple-200 mb-8">
                    สมัครฟรี ไม่มีค่าใช้จ่าย ไม่ต้องใส่บัตรเครดิต
                </p>
                <Link
                    href="/signup"
                    className="bg-white text-purple-600 px-8 py-3 rounded-full text-sm font-medium hover:bg-purple-50 transition-colors inline-block"
                >
                    สร้างบัญชีฟรี
                </Link>
            </section>

            {/* Footer */}
            <footer className="border-t py-8 px-4 text-center">
                <p className="text-sm text-gray-400">
                    © 2025 ARIN · สร้างด้วย ❤️ สำหรับศิลปิน
                </p>
            </footer>

        </main>
    )
}

function FeatureCard({
    emoji,
    color,
    title,
    description,
}: {
    emoji: string
    color: string
    title: string
    description: string
}) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-xl mb-4`}>
                {emoji}
            </div>
            <h3 className="font-medium mb-2">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        </div>
    )
}

function DiffCard({
    versus,
    title,
    description,
}: {
    versus: string
    title: string
    description: string
}) {
    return (
        <div className="border rounded-2xl p-5">
            <p className="text-xs text-gray-400 mb-2">{versus}</p>
            <h3 className="font-medium text-sm mb-2">{title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        </div>
    )
}