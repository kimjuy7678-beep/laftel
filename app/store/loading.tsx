// app/store/loading.tsx
export default function StoreLoading() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-6">
                {/* Loading 텍스트 + 점 */}
                <div className="flex items-center gap-3">
                    <span className="text-[28px] font-light tracking-widest text-[#7865ff]">Loading</span>
                    <span className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                            <span
                                key={i}
                                className="h-2.5 w-2.5 rounded-full bg-[#7865ff]"
                                style={{
                                    animation: "bounce 1.2s ease-in-out infinite",
                                    animationDelay: `${i * 0.2}s`,
                                }}
                            />
                        ))}
                    </span>
                </div>

                {/* 프로그레스 바 */}
                <div className="h-[10px] w-[340px] overflow-hidden rounded-full bg-[#e8e4f8]">
                    <div
                        className="h-full rounded-full bg-[#7865ff]"
                        style={{ animation: "progress 1.8s ease-in-out infinite" }}
                    />
                </div>
            </div>

            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(1); opacity: 0.5; }
                    40% { transform: scale(1.4); opacity: 1; }
                }
                @keyframes progress {
                    0%   { width: 0%;   margin-left: 0%; }
                    50%  { width: 60%;  margin-left: 20%; }
                    100% { width: 0%;   margin-left: 100%; }
                }
            `}</style>
        </div>
    );
}