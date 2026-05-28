import Link from "next/link"

interface ButtonProps {
  onClick?: () => void
  href?: string
  className?: string
  content?: React.ReactNode
  showArrow?: boolean
}

const Button = ({ onClick, href, className = '', content, showArrow }: ButtonProps) => {
  const base = 'flex items-center gap-2 rounded-[10px] cursor-pointer text-[15px] hover:bg-[#5a52e0]'

  const arrow = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )

  if (href) {
    return (
      <Link href={href} className={`${base} ${className}`}>
        {content}
        {showArrow && arrow}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={`${base} ${className}`}>
      {content}
      {showArrow && arrow}
    </button>
  )
}

export default Button