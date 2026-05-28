import Link from "next/link"

export default function StoreLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <header className="sticky top-0 z-50 h-14 bg-[#0d0d12]/90 backdrop-blur border-b border-white/10">
                <div className="h-full px-6 flex items-center justify-between">
                    <Link href="/store" className="font-black text-white">
                        스토어헤더 만드는중~~~~~~~~~~~~~~~
                    </Link>

                    <nav className="flex items-center gap-5 text-sm text-white/60">
                        <Link href="/">라프텔</Link>
                        <Link href="/store">스토어 홈</Link>
                        <Link href="/store/orders">주문내역</Link>
                    </nav>
                </div>
            </header>

            {children}
        </>
    )
}