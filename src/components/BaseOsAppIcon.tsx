/** Inline app mark — always renders (no external PNG dependency). */
export function BaseOsAppIcon({ size = 56, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="base-os-bg" x1="64" y1="48" x2="448" y2="464" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="0.45" stopColor="#A855F7" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="base-os-ring" x1="96" y1="96" x2="416" y2="416" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F9A8D4" />
          <stop offset="1" stopColor="#67E8F9" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="480" height="480" rx="108" fill="#070313" />
      <rect x="16" y="16" width="480" height="480" rx="108" stroke="url(#base-os-ring)" strokeWidth="12" />
      <circle cx="256" cy="220" r="120" fill="url(#base-os-bg)" opacity="0.35" />
      <circle cx="200" cy="200" r="36" fill="#22D3EE" />
      <circle cx="312" cy="248" r="44" fill="#EC4899" />
      <path
        d="M148 300C196 248 268 232 332 248C372 258 402 282 420 324"
        stroke="#FDE047"
        strokeWidth="20"
        strokeLinecap="round"
      />
      <text
        x="256"
        y="392"
        fill="#F5D0FE"
        fontSize="52"
        fontFamily="system-ui, Segoe UI, Arial, sans-serif"
        fontWeight="800"
        textAnchor="middle"
      >
        BASE
      </text>
      <text
        x="256"
        y="448"
        fill="#A5F3FC"
        fontSize="40"
        fontFamily="system-ui, Segoe UI, Arial, sans-serif"
        fontWeight="700"
        textAnchor="middle"
      >
        OS
      </text>
    </svg>
  );
}
