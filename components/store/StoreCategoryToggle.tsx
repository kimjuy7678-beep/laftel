"use client";

type StoreCategoryToggleProps = {
    open: boolean;
    onClick: () => void;
};

export default function StoreCategoryToggle({ open, onClick }: StoreCategoryToggleProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[10px] px-[18px] py-[9px] text-[13px] font-semibold text-[#6c63ff] transition ${open
                ? "border border-[rgba(108,99,255,0.5)] bg-[rgba(108,99,255,0.2)]"
                : "border border-[rgba(108,99,255,0.25)] bg-[rgba(108,99,255,0.1)]"
                }`}
            aria-expanded={open}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            {open ? "카테고리 닫기" : "카테고리 열기"}
        </button>
    );
}
