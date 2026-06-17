/** Inline app mark — iris/lavender Reflect palette. */
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
          <stop stopColor="#9382ff" />
          <stop offset="0.5" stopColor="#5046e4" />
          <stop offset="1" stopColor="#b7a4fb" />
        </linearGradient>
        <linearGradient id="base-os-ring" x1="96" y1="96" x2="416" y2="416" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e59cff" />
          <stop offset="1" stopColor="#9cb2ff" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="480" height="480" rx="108" fill="#060317" />
      <rect x="16" y="16" width="480" height="480" rx="108" stroke="url(#base-os-ring)" strokeWidth="10" />
      <circle cx="256" cy="228" r="108" fill="url(#base-os-bg)" opacity="0.35" />
      <circle cx="208" cy="208" r="32" fill="#9382ff" opacity="0.9" />
      <circle cx="304" cy="252" r="40" fill="#5046e4" opacity="0.85" />
      <path
        d="M152 308C200 256 272 240 336 256C376 266 406 290 424 332"
        stroke="#f4f0ff"
        strokeWidth="16"
        strokeLinecap="round"
        opacity="0.75"
      />
      <text
        x="256"
        y="392"
        fill="#f4f0ff"
        fontSize="52"
        fontFamily="system-ui, Segoe UI, Arial, sans-serif"
        fontWeight="500"
        textAnchor="middle"
      >
        BASE
      </text>
      <text
        x="256"
        y="448"
        fill="#a8a6b7"
        fontSize="40"
        fontFamily="system-ui, Segoe UI, Arial, sans-serif"
        fontWeight="500"
        textAnchor="middle"
      >
        OS
      </text>
    </svg>
  );
}
